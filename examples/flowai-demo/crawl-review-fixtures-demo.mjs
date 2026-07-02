import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { reviewWebsiteCrawlQuality } from "../../packages/website-crawler/dist/index.js";

const outputPath = resolve("docs/demo/FLOWAI_CRAWL_REVIEW_FIXTURES.md");

const fixtureOrigin = await startFixtureSite({
  "/static-clinic": [
    "<!doctype html><html><head><title>Static Clinic</title><meta name='description' content='Static clinic fixture'></head>",
    "<body><main><h1>Static Clinic</h1><p>Book dental cleaning appointments.</p>",
    "<p>Emergency appointment requests go to staff follow-up.</p>",
    "<a href='/faq'>FAQ</a></main></body></html>"
  ].join(""),
  "/faq": [
    "<!doctype html><html><head><title>Clinic FAQ</title></head><body><main>",
    "<h1>FAQ</h1><p>Patients should bring insurance details when available.</p>",
    "</main></body></html>"
  ].join(""),
  "/client-rendered-catalog": [
    "<!doctype html><html><head><title>Client Rendered Catalog</title></head>",
    "<body><main><h1>Client Rendered Catalog</h1><div id='catalog'></div>",
    "<script>document.querySelector('#catalog').textContent = 'Premium ceramic package starts at 320 SAR.';</script>",
    "</main></body></html>"
  ].join("")
});

try {
  const report = await reviewWebsiteCrawlQuality({
    allowPrivateNetwork: true,
    cases: [
      {
        id: "static_clinic_multi_page",
        label: "Static multi-page clinic",
        startUrl: `${fixtureOrigin}/static-clinic`,
        expectedSignals: [
          "Book dental cleaning appointments",
          "Emergency appointment requests",
          "Patients should bring insurance details"
        ],
        maxPages: 2
      },
      {
        id: "client_rendered_catalog_gap",
        label: "Client-rendered catalog gap",
        startUrl: `${fixtureOrigin}/client-rendered-catalog`,
        expectedSignals: ["Premium ceramic package starts at 320 SAR"],
        expectedGap: "client_rendered_content",
        maxPages: 1
      }
    ]
  });

  const stableReportMarkdown = report.markdown.split(fixtureOrigin.href).join("http://127.0.0.1:<fixture-port>");
  const markdown = [
    stableReportMarkdown,
    "## Owner Review Notes",
    "",
    "1. What works now: static public HTML pages can become SourceDocument/sourceRefs and continue into the FlowAI Studio build path.",
    "2. What is missing: content rendered only after JavaScript execution is not extracted by the current Cheerio crawler.",
    "3. Product decision: keep the fast Cheerio path, then evaluate a browser-rendered crawler only when real customer fixtures prove it is required.",
    "4. Still not included: OCR, PDF parsing, upload endpoints, private-network crawling by default, login/session crawling, persistence, live Telegram, live WhatsApp, or production RAG lifecycle.",
    ""
  ].join("\n");

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");

  console.log(markdown);
  console.log(`Wrote ${outputPath}`);
} finally {
  await fixtureOrigin.close();
}

async function startFixtureSite(routes) {
  const server = createServer((request, response) => {
    const body = routes[request.url ?? "/"] ?? "not found";
    response.writeHead(body === "not found" ? 404 : 200, {
      "content-type": "text/html; charset=utf-8"
    });
    response.end(body);
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture_server_missing_port");
  return {
    href: `http://127.0.0.1:${address.port}`,
    toString() {
      return this.href;
    },
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}
