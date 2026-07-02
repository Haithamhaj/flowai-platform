import { createServer } from "node:http";
import { afterEach, describe, expect, test } from "vitest";
import { crawlWebsiteToSourceDocument, reviewWebsiteCrawlQuality } from "../src/index.js";

const servers: Array<{ close: () => Promise<void> }> = [];

describe("website crawler", () => {
  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  test("crawls same-origin pages into a sourceRef-backed markdown document", async () => {
    const origin = await startFixtureSite({
      "/": [
        "<!doctype html><html><head><title>Riyadh Auto Care</title><meta name='description' content='Car service center'></head>",
        "<body><main><h1>Riyadh Auto Care</h1><p>We offer oil change and tire inspection.</p>",
        "<a href='/services'>Services</a><a href='https://outside.example/prices'>External</a></main></body></html>"
      ].join(""),
      "/services": [
        "<!doctype html><html><head><title>Services</title></head><body><main>",
        "<h1>Services</h1><ul><li>Oil change package starts at 180 SAR.</li><li>Battery replacement consultation.</li></ul>",
        "<a href='/'>Home</a></main></body></html>"
      ].join("")
    });

    const result = await crawlWebsiteToSourceDocument({
      startUrl: `${origin}/`,
      maxPages: 2,
      allowPrivateNetwork: true
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pages.map((page) => page.url).sort()).toEqual([`${origin}/`, `${origin}/services`].sort());
    expect(result.document.sourceType).toBe("website");
    expect(result.document.filename).toBe("website-riyadh-auto-care.md");
    expect(result.document.text).toContain("SOURCE_URL:");
    expect(result.document.text).toContain("Riyadh Auto Care");
    expect(result.document.text).toContain("Oil change package starts at 180 SAR.");
    expect(result.document.sourceRefs.some((ref) => ref.label.includes("/services"))).toBe(true);
    expect(result.warnings).toContain("Crawl limited to same-origin http/https pages.");
  });

  test("rejects localhost and private network targets unless explicitly allowed", async () => {
    const result = await crawlWebsiteToSourceDocument({
      startUrl: "http://127.0.0.1:1234/",
      maxPages: 1
    });

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("CRAWL_TARGET_BLOCKED");
  });

  test("reviews crawl fixture quality and flags JavaScript-rendered gaps", async () => {
    const origin = await startFixtureSite({
      "/static": [
        "<!doctype html><html><head><title>Static Clinic</title></head>",
        "<body><main><h1>Static Clinic</h1><p>Book dental cleaning appointments.</p>",
        "<p>Emergency appointment requests go to staff follow-up.</p></main></body></html>"
      ].join(""),
      "/client-rendered": [
        "<!doctype html><html><head><title>Client Rendered Store</title></head>",
        "<body><main><h1>Client Rendered Store</h1><div id='catalog'></div>",
        "<script>document.querySelector('#catalog').textContent = 'Premium ceramic package starts at 320 SAR.';</script>",
        "</main></body></html>"
      ].join("")
    });

    const report = await reviewWebsiteCrawlQuality({
      allowPrivateNetwork: true,
      cases: [
        {
          id: "static_clinic",
          label: "Static clinic page",
          startUrl: `${origin}/static`,
          expectedSignals: ["Book dental cleaning appointments", "Emergency appointment requests"]
        },
        {
          id: "client_rendered_catalog",
          label: "Client-rendered catalog page",
          startUrl: `${origin}/client-rendered`,
          expectedSignals: ["Premium ceramic package starts at 320 SAR"],
          expectedGap: "client_rendered_content"
        }
      ]
    });

    expect(report.summary.supported).toBe(1);
    expect(report.summary.needsBrowserRendering).toBe(1);
    expect(report.cases.map((item) => `${item.id}:${item.status}`)).toEqual([
      "static_clinic:supported",
      "client_rendered_catalog:needs_browser_rendering"
    ]);
    expect(report.cases[1]?.missingSignals).toEqual(["Premium ceramic package starts at 320 SAR"]);
    expect(report.markdown).toContain("Static clinic page");
    expect(report.markdown).toContain("Browser rendering needed");
    expect(report.markdown).toContain("Current Cheerio crawler did not execute JavaScript");
  });
});

async function startFixtureSite(routes: Record<string, string>): Promise<string> {
  const server = createServer((request, response) => {
    const body = routes[request.url ?? "/"] ?? "not found";
    response.writeHead(body === "not found" ? 404 : 200, { "content-type": "text/html; charset=utf-8" });
    response.end(body);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture_server_missing_port");
  servers.push({
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  });
  return `http://127.0.0.1:${address.port}`;
}
