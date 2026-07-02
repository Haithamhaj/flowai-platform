import { createServer } from "node:http";
import { afterEach, describe, expect, test } from "vitest";
import { crawlWebsiteToSourceDocument } from "../src/index.js";

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
