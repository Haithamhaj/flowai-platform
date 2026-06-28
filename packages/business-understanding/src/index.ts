export interface BusinessUnderstanding {
  businessName: string;
  summary: string;
  services: string[];
  faqs: Array<{ question: string; answer: string }>;
  assumptions: string[];
}

