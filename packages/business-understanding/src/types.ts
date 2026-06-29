export type SourceType = "business_interview" | "document" | "website" | "manual";
export type PreferredLanguage = "ar" | "en" | "auto";

export interface KnownServiceInput {
  name: string;
  description?: string;
  requiredFields?: string[];
}

export interface KnownFAQInput {
  question: string;
  answer: string;
}

export interface BusinessInterviewInput {
  businessDescription: string;
  targetBotGoal?: string;
  knownServices?: Array<string | KnownServiceInput>;
  knownFaqs?: KnownFAQInput[];
  constraints?: string[];
  preferredLanguage?: PreferredLanguage;
  businessCategoryHint?: string;
}

export interface SourceRef {
  sourceId: string;
  sourceType: SourceType;
  label: string;
  locator?: string;
  excerpt?: string;
  confidence?: number;
}

export interface FactMetadata {
  id: string;
  sourceRefs: string[];
  confidence: number;
  notes?: string;
}

export interface ExtractedService extends FactMetadata {
  name: string;
  description: string;
  requiredFields: string[];
}

export interface ExtractedFAQ extends FactMetadata {
  question: string;
  answer: string;
}

export interface ExtractedPolicy extends FactMetadata {
  title: string;
  description: string;
}

export type BusinessFieldType = "text" | "number" | "email" | "phone" | "date" | "choice" | "boolean";

export interface ExtractedField {
  key: string;
  label: string;
  type: BusinessFieldType;
  required: boolean;
}

export interface ExtractedForm extends FactMetadata {
  name: string;
  fields: ExtractedField[];
}

export interface ExtractedScenario extends FactMetadata {
  name: string;
  triggerPhrases: string[];
  steps: string[];
  requiredFields: string[];
  handoffRule?: string;
}

export type MissingQuestionCategory =
  | "bot_goal"
  | "services"
  | "required_fields"
  | "handoff"
  | "policies"
  | "source_restrictions"
  | "language"
  | "channel"
  | "refusal_rules"
  | "business_identity";

export interface MissingQuestion {
  id: string;
  question: string;
  reason: string;
  blocksWorkflow: boolean;
  category: MissingQuestionCategory;
}

export interface Assumption {
  id: string;
  text: string;
  confidence: number;
  sourceRefs: string[];
  notes?: string;
}

export interface UnknownFact {
  id: string;
  field: string;
  reason: string;
  blocksWorkflow: boolean;
}

export interface Conflict {
  id: string;
  field: string;
  claims: string[];
  resolutionStatus: "unresolved" | "resolved" | "ignored";
}

export interface BusinessUnderstanding {
  id: string;
  businessName: string | null;
  category: string | null;
  summary: string;
  sources: SourceRef[];
  services: ExtractedService[];
  faqs: ExtractedFAQ[];
  policies: ExtractedPolicy[];
  forms: ExtractedForm[];
  scenarios: ExtractedScenario[];
  missingQuestions: MissingQuestion[];
  assumptions: Assumption[];
  unknowns: UnknownFact[];
  conflicts: Conflict[];
  confidence: number;
  createdAt: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
