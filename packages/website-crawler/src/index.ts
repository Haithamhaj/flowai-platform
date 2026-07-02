import { createHash } from "node:crypto";
import { CheerioCrawler, Configuration } from "crawlee";
import type { SourceDocument, SourceRef } from "@flowai/source-ingestion";

export interface WebsiteCrawlRequest {
  startUrl: string;
  maxPages?: number;
  maxTextCharsPerPage?: number;
  allowPrivateNetwork?: boolean;
}

export interface CrawledWebsitePage {
  url: string;
  title: string;
  description: string | null;
  text: string;
  statusCode: number | null;
}

export interface WebsiteCrawlSuccess {
  ok: true;
  startUrl: string;
  pages: CrawledWebsitePage[];
  document: SourceDocument;
  warnings: string[];
}

export interface WebsiteCrawlFailure {
  ok: false;
  error: {
    code: "INVALID_CRAWL_URL" | "CRAWL_TARGET_BLOCKED" | "CRAWL_EMPTY_RESULT" | "CRAWL_FAILED";
    message: string;
  };
  warnings: string[];
}

export type WebsiteCrawlResult = WebsiteCrawlSuccess | WebsiteCrawlFailure;

const DEFAULT_MAX_PAGES = 5;
const DEFAULT_MAX_TEXT_CHARS_PER_PAGE = 8000;

export async function crawlWebsiteToSourceDocument(request: WebsiteCrawlRequest): Promise<WebsiteCrawlResult> {
  const urlResult = parseAllowedStartUrl(request.startUrl, Boolean(request.allowPrivateNetwork));
  const warnings = ["Crawl limited to same-origin http/https pages."];

  if (!urlResult.ok) {
    return {
      ok: false,
      error: urlResult.error,
      warnings
    };
  }

  const pages: CrawledWebsitePage[] = [];
  const maxPages = clampPositiveInteger(request.maxPages, DEFAULT_MAX_PAGES, 1, 20);
  const maxTextCharsPerPage = clampPositiveInteger(request.maxTextCharsPerPage, DEFAULT_MAX_TEXT_CHARS_PER_PAGE, 500, 20000);

  try {
    const crawler = new CheerioCrawler(
      {
        maxRequestsPerCrawl: maxPages,
        maxConcurrency: 2,
        requestHandlerTimeoutSecs: 20,
        navigationTimeoutSecs: 20,
        async requestHandler({ request: crawleeRequest, $, enqueueLinks, response }) {
          const loadedUrl = crawleeRequest.loadedUrl ?? crawleeRequest.url;
          const loaded = new URL(loadedUrl);
          if (loaded.origin !== urlResult.url.origin) return;

          const title = normalizeSpace($("title").first().text() || $("h1").first().text());
          const description = normalizeSpace($("meta[name='description']").attr("content") ?? "");
          $("script, style, noscript, svg, canvas, iframe, nav, footer").remove();
          const mainText = normalizeSpace(($("main").text() || $("body").text()).slice(0, maxTextCharsPerPage));
          if (mainText) {
            pages.push({
              url: loaded.href,
              title: title || loaded.pathname || loaded.hostname,
              description: description || null,
              text: mainText,
              statusCode: response?.statusCode ?? null
            });
          }

          await enqueueLinks();
        },
        failedRequestHandler({ request: failedRequest }) {
          warnings.push(`Failed to crawl ${failedRequest.url}.`);
        }
      },
      new Configuration({
        persistStorage: false
      })
    );

    await crawler.run([urlResult.url.href]);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "CRAWL_FAILED",
        message: error instanceof Error ? error.message : "Website crawl failed."
      },
      warnings
    };
  }

  if (pages.length === 0) {
    return {
      ok: false,
      error: {
        code: "CRAWL_EMPTY_RESULT",
        message: "Crawler did not extract readable page text."
      },
      warnings
    };
  }

  return {
    ok: true,
    startUrl: urlResult.url.href,
    pages,
    document: buildWebsiteSourceDocument(urlResult.url, pages),
    warnings
  };
}

function buildWebsiteSourceDocument(startUrl: URL, pages: CrawledWebsitePage[]): SourceDocument {
  const filename = websiteFilename(startUrl, pages[0]?.title ?? startUrl.hostname);
  const text = pages.map((page, index) => [
    `# Page ${index + 1}: ${page.title}`,
    `SOURCE_URL: ${page.url}`,
    page.description ? `DESCRIPTION: ${page.description}` : null,
    "",
    page.text
  ].filter((line): line is string => typeof line === "string").join("\n")).join("\n\n---\n\n");
  const contentHash = hashText(text);
  const id = `src_web_${contentHash.slice(0, 16)}`;
  const lines = text.split("\n");
  const documentRef: SourceRef = {
    id: `${id}#document`,
    sourceDocumentId: id,
    locator: { kind: "document" },
    label: startUrl.href,
    metadata: {
      startUrl: startUrl.href,
      pageCount: pages.length
    }
  };
  const pageRefs = createPageRefs(id, filename, text, pages);
  const lineRef = {
    id: `${id}#line_1_${lines.length}`,
    sourceDocumentId: id,
    locator: { kind: "line_range" as const, startLine: 1, endLine: lines.length },
    label: `${filename} lines 1-${lines.length}`,
    metadata: {
      startUrl: startUrl.href,
      pageCount: pages.length
    }
  };

  return {
    id,
    sourceType: "website",
    filename,
    extension: "md",
    mimeType: "text/markdown",
    sizeBytes: Buffer.byteLength(text, "utf8"),
    contentHash,
    status: "extracted",
    text,
    metadata: {
      lineCount: lines.length,
      headingCount: pages.length,
      detectedFormat: "website_crawl",
      encoding: "utf-8",
      pageCount: pages.length,
      sourceId: startUrl.href
    },
    sourceRefs: [documentRef, lineRef, ...pageRefs],
    chunks: [
      {
        id: `${id}#chunk_1`,
        sourceDocumentId: id,
        sourceRefId: lineRef.id,
        locator: lineRef.locator,
        text,
        contentHash,
        extractionMethod: "website_crawl",
        metadata: {
          startUrl: startUrl.href,
          pageCount: pages.length
        }
      }
    ],
    warnings: [],
    errors: []
  };
}

function createPageRefs(sourceDocumentId: string, filename: string, text: string, pages: CrawledWebsitePage[]): SourceRef[] {
  const refs: SourceRef[] = [];
  let cursor = 1;
  for (const page of pages) {
    const pageText = `# Page ${refs.length + 1}: ${page.title}`;
    const startLine = cursor;
    const pageLineCount = textForPage(page, refs.length + 1).split("\n").length;
    const endLine = startLine + pageLineCount - 1;
    refs.push({
      id: `${sourceDocumentId}#page_${refs.length + 1}`,
      sourceDocumentId,
      locator: { kind: "line_range", startLine, endLine },
      label: `${filename} ${page.url}`,
      metadata: {
        url: page.url,
        title: page.title || pageText
      }
    });
    cursor = endLine + 3;
  }
  return refs;
}

function textForPage(page: CrawledWebsitePage, index: number): string {
  return [
    `# Page ${index}: ${page.title}`,
    `SOURCE_URL: ${page.url}`,
    page.description ? `DESCRIPTION: ${page.description}` : null,
    "",
    page.text
  ].filter((line): line is string => typeof line === "string").join("\n");
}

function parseAllowedStartUrl(
  value: string,
  allowPrivateNetwork: boolean
):
  | { ok: true; url: URL }
  | { ok: false; error: WebsiteCrawlFailure["error"] } {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      ok: false,
      error: {
        code: "INVALID_CRAWL_URL",
        message: "Start URL must be a valid absolute URL."
      }
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      error: {
        code: "INVALID_CRAWL_URL",
        message: "Crawler accepts http and https URLs only."
      }
    };
  }

  if (!allowPrivateNetwork && isPrivateHostname(url.hostname)) {
    return {
      ok: false,
      error: {
        code: "CRAWL_TARGET_BLOCKED",
        message: "Private network, localhost, and loopback crawl targets are blocked by default."
      }
    };
  }

  return { ok: true, url };
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const match = /^172\.(\d+)\./.exec(host);
  if (match) {
    const second = Number.parseInt(match[1] ?? "", 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hashText(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function websiteFilename(startUrl: URL, title: string): string {
  const slugSource = title || startUrl.hostname;
  const slug = slugSource.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `website-${slug || "crawl"}.md`;
}

function clampPositiveInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isInteger(value)) return fallback;
  const integerValue = value as number;
  return Math.min(Math.max(integerValue, min), max);
}
