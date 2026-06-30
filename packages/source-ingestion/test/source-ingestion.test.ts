import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_SOURCE_DOCUMENT_LIMITS,
  ingestSourceDocument,
  type SourceDocument,
  type SourceDocumentRejection
} from "../src/index.js";

const externalKeyNames = ["OPENAI_API_KEY", "GEMINI_API_KEY", "QDRANT_URL", "TELEGRAM_BOT_TOKEN", "DATABASE_URL"];
const savedExternalKeys = new Map<string, string | undefined>();

beforeAll(() => {
  for (const key of externalKeyNames) {
    savedExternalKeys.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterAll(() => {
  for (const [key, value] of savedExternalKeys) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("source document text ingestion", () => {
  it("ingests a clinic services markdown document with stable hash, id, metadata, chunks, and sourceRefs", () => {
    const result = ingestSourceDocument({
      filename: "clinic-services.md",
      mimeType: "text/markdown",
      content: [
        "# Bright Dental Clinic Services",
        "",
        "## Dental checkups",
        "Routine checkups include examination and cleaning.",
        "",
        "## Appointment requests",
        "Patients should provide name, phone, and preferred date."
      ].join("\n")
    });

    expect(result.ok).toBe(true);
    const document = readDocument(result);

    expect(document).toMatchObject({
      sourceType: "uploaded_document",
      filename: "clinic-services.md",
      extension: "md",
      mimeType: "text/markdown",
      status: "extracted",
      metadata: {
        detectedFormat: "markdown",
        lineCount: 7,
        headingCount: 3
      },
      errors: []
    });
    expect(document.id).toMatch(/^src_doc_[a-f0-9]{16}$/);
    expect(document.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(document.text).toContain("Dental checkups");
    expect(document.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceDocumentId: document.id,
          locator: { kind: "document" }
        }),
        expect.objectContaining({
          sourceDocumentId: document.id,
          locator: { kind: "heading", heading: "Dental checkups", line: 3 }
        })
      ])
    );
    expect(document.chunks[0]).toMatchObject({
      sourceDocumentId: document.id,
      locator: { kind: "line_range", startLine: 1, endLine: 7 },
      extractionMethod: "markdown"
    });
    expect(document.chunks[0].sourceRefId).toContain(document.id);
  });

  it("ingests a clinic FAQ text document as plain text with line locators", () => {
    const result = ingestSourceDocument({
      filename: "clinic-faq.txt",
      mimeType: "text/plain",
      content: "Q: Do you accept emergency appointments?\r\nA: Staff will follow up.\r\nQ: Where are you located?"
    });

    expect(result.ok).toBe(true);
    const document = readDocument(result);

    expect(document.metadata).toMatchObject({
      detectedFormat: "plain_text",
      lineCount: 3,
      headingCount: 0
    });
    expect(document.text).toBe("Q: Do you accept emergency appointments?\nA: Staff will follow up.\nQ: Where are you located?");
    expect(document.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locator: { kind: "line_range", startLine: 1, endLine: 3 }
        })
      ])
    );
  });

  it("ingests policy markdown and preserves heading sourceRefs without producing workflow or channel side effects", () => {
    const result = ingestSourceDocument({
      filename: "clinic-policy.markdown",
      mimeType: "text/markdown",
      content: "## Cancellation policy\nPlease call 24 hours before appointment.\n\n## Privacy\nDo not send medical records in chat."
    });

    expect(result.ok).toBe(true);
    const document = readDocument(result);

    expect(document.sourceRefs.map((ref) => ref.locator)).toEqual(
      expect.arrayContaining([
        { kind: "heading", heading: "Cancellation policy", line: 1 },
        { kind: "heading", heading: "Privacy", line: 4 }
      ])
    );
    expect(JSON.stringify(document).toLowerCase()).not.toContain("workflowid");
    expect(JSON.stringify(document).toLowerCase()).not.toContain("sessionid");
    expect(JSON.stringify(document).toLowerCase()).not.toContain("adapterid");
  });

  it("ingests Arabic markdown without requiring external provider keys", () => {
    expectNoExternalKeys();

    const result = ingestSourceDocument({
      filename: "arabic-services.md",
      mimeType: "text/markdown",
      content: "# خدمات العيادة\n\n## حجز موعد\nيرجى تزويد الاسم ورقم الهاتف والتاريخ المفضل."
    });

    expect(result.ok).toBe(true);
    const document = readDocument(result);

    expect(document.text).toContain("خدمات العيادة");
    expect(document.metadata.headingCount).toBe(2);
    expectNoExternalKeys();
  });

  it.each([
    ["service-guide.pdf", "application/pdf", "UNSUPPORTED_FILE_TYPE"],
    ["service-guide.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "UNSUPPORTED_FILE_TYPE"],
    ["index.html", "text/html", "UNSUPPORTED_FILE_TYPE"],
    ["script.js", "application/javascript", "UNSUPPORTED_FILE_TYPE"],
    ["data.json", "application/json", "UNSUPPORTED_FILE_TYPE"]
  ])("rejects unsupported file %s", (filename, mimeType, expectedCode) => {
    const result = ingestSourceDocument({
      filename,
      mimeType,
      content: "api_key=sk-secret-should-not-echo"
    });

    expect(result.ok).toBe(false);
    const rejection = readRejection(result);
    expect(rejection.error.code).toBe(expectedCode);
    expect(JSON.stringify(rejection)).not.toContain("sk-secret-should-not-echo");
    expect(rejection.document).toMatchObject({
      status: "rejected",
      text: ""
    });
  });

  it("rejects path traversal filenames without echoing raw content", () => {
    const result = ingestSourceDocument({
      filename: "../private/services.md",
      mimeType: "text/markdown",
      content: "password=secret-value"
    });

    expect(result.ok).toBe(false);
    const rejection = readRejection(result);
    expect(rejection.error.code).toBe("INVALID_FILENAME");
    expect(JSON.stringify(rejection)).not.toContain("secret-value");
  });

  it("rejects MIME and extension mismatches", () => {
    const result = ingestSourceDocument({
      filename: "services.md",
      mimeType: "text/plain",
      content: "# Services"
    });

    expect(result.ok).toBe(false);
    expect(readRejection(result).error.code).toBe("MIME_EXTENSION_MISMATCH");
  });

  it("rejects oversized content safely", () => {
    const result = ingestSourceDocument(
      {
        filename: "large.txt",
        mimeType: "text/plain",
        content: `token=secret\n${"x".repeat(64)}`
      },
      { limits: { maxInputBytes: 16, maxExtractedTextBytes: 16 } }
    );

    expect(result.ok).toBe(false);
    const rejection = readRejection(result);
    expect(rejection.error.code).toBe("CONTENT_TOO_LARGE");
    expect(JSON.stringify(rejection)).not.toContain("token=secret");
  });

  it("returns the same contentHash and document id for equivalent normalized content", () => {
    const first = readDocument(
      ingestSourceDocument({
        filename: "same.txt",
        mimeType: "text/plain",
        content: "Line one\r\nLine two\n"
      })
    );
    const second = readDocument(
      ingestSourceDocument({
        filename: "same.txt",
        mimeType: "text/plain",
        content: "Line one\nLine two"
      })
    );

    expect(first.contentHash).toBe(second.contentHash);
    expect(first.id).toBe(second.id);
  });

  it("flags secret-like accepted content without echoing secret values in warnings", () => {
    const result = ingestSourceDocument({
      filename: "internal-notes.txt",
      mimeType: "text/plain",
      content: "Use api_key=sk-live-secret-value for the old system."
    });

    expect(result.ok).toBe(true);
    const document = readDocument(result);

    expect(document.warnings).toContainEqual(
      expect.objectContaining({
        code: "SECRET_LIKE_CONTENT",
        message: expect.not.stringContaining("sk-live-secret-value")
      })
    );
    expect(document.text).toContain("sk-live-secret-value");
    expect(JSON.stringify(document.errors)).not.toContain("sk-live-secret-value");
    expect(JSON.stringify(document.warnings)).not.toContain("sk-live-secret-value");
  });

  it("uses configured extracted text limits after normalization", () => {
    const result = ingestSourceDocument(
      {
        filename: "normalized.txt",
        mimeType: "text/plain",
        content: "short\ntext"
      },
      { limits: { ...DEFAULT_SOURCE_DOCUMENT_LIMITS, maxExtractedTextBytes: 4 } }
    );

    expect(result.ok).toBe(false);
    expect(readRejection(result).error.code).toBe("EXTRACTED_TEXT_TOO_LARGE");
  });
});

function readDocument(result: ReturnType<typeof ingestSourceDocument>): SourceDocument {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected accepted document");
  return result.document;
}

function readRejection(result: ReturnType<typeof ingestSourceDocument>): SourceDocumentRejection {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected rejected document");
  return result;
}

function expectNoExternalKeys() {
  for (const key of externalKeyNames) {
    expect(process.env[key]).toBeUndefined();
  }
}
