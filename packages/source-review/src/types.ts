import type {
  BusinessUnderstanding,
  ExtractedFAQ,
  ExtractedField,
  ExtractedPolicy,
  ExtractedScenario,
  ExtractedService,
  SourceRef as BusinessSourceRef,
  UnknownFact
} from "@flowai/business-understanding";
import type { SourceDocument, SourceDocumentError, SourceDocumentWarning, SourceRef } from "@flowai/source-ingestion";

export type SourceDocumentReviewStatus = "ready_for_review" | "rejected";

export interface BoundedSourceExcerpt {
  id: string;
  sourceDocumentId: string;
  sourceRefId: string;
  label: string;
  locator: string;
  text: string;
}

export interface SourceDocumentReviewOptions {
  maxExcerptChars?: number;
}

export interface SourceDocumentReview {
  sourceDocumentId: string;
  status: SourceDocumentReviewStatus;
  filename: string;
  summary: {
    lineCount: number;
    headingCount: number;
    warningCodes: string[];
    errorCodes: string[];
    excerptCount: number;
  };
  boundedExcerpts: BoundedSourceExcerpt[];
  sourceRefs: SourceRef[];
  warnings: SourceDocumentWarning[];
  errors: SourceDocumentError[];
}

export interface BusinessFactBlocker {
  id: string;
  field: string;
  reason: string;
  sourceRefs: string[];
}

export interface BusinessFactsDraft {
  id: string;
  sourceDocumentIds: string[];
  sourceRefs: BusinessSourceRef[];
  businessName: string | null;
  category: string | null;
  language: "ar" | "en" | "auto";
  summary: string;
  services: ExtractedService[];
  faqs: ExtractedFAQ[];
  policies: ExtractedPolicy[];
  forms: Array<{
    id: string;
    name: string;
    fields: ExtractedField[];
    sourceRefs: string[];
    confidence: number;
    notes?: string;
  }>;
  scenarios: ExtractedScenario[];
  blockers: BusinessFactBlocker[];
  unknowns: UnknownFact[];
  confidence: number;
  documentWarnings: SourceDocumentWarning[];
}

export interface BusinessUnderstandingFromFactsOptions {
  createdAt?: string;
}

export type BuildBusinessUnderstandingFromFacts = (facts: BusinessFactsDraft, options?: BusinessUnderstandingFromFactsOptions) => BusinessUnderstanding;
