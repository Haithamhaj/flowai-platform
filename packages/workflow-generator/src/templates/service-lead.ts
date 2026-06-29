import type {
  ConditionAst,
  FieldDefinition,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
  WorkflowTestCase,
  WorkflowVariable
} from "@flowai/workflow-dsl";
import type { TemplateBuildContext, TemplateBuildResult } from "../types.js";
import { baseWorkflowFields, fieldDefinitionsFromPlan, variableDefinitionsFromPlan } from "./shared.js";

export function buildServiceLeadTemplate(context: TemplateBuildContext): TemplateBuildResult {
  const { businessUnderstanding, plan } = context;
  const serviceChoices = businessUnderstanding.services.map((service) => ({
    id: service.id,
    label: service.name,
    value: service.id
  }));
  const fieldDefinitions: FieldDefinition[] = fieldDefinitionsFromPlan(plan.requiredFields);
  const variables: WorkflowVariable[] = [
    { key: "service_interest", type: "choice", required: true, description: "Requested service interest." },
    ...variableDefinitionsFromPlan(plan.requiredFields)
  ];
  const faq = businessUnderstanding.faqs[0];

  const nodes: WorkflowNode[] = [
    { id: "start", type: "start", name: "Start" },
    {
      id: "welcome",
      type: "message",
      name: "Welcome",
      message: `Welcome to ${businessUnderstanding.businessName ?? "the business"}. How can I help you today?`,
      quickReplies: [
        { id: "lead", label: "Request service", value: "lead" },
        ...(faq ? [{ id: "faq", label: "Common question", value: "faq" }] : []),
        { id: "staff", label: "Talk to a person", value: "staff" }
      ],
      metadata: metadataFromSources(businessUnderstanding.sources.map((source) => source.sourceId), businessUnderstanding.confidence)
    },
    { id: "route_intent", type: "condition", name: "Route intent" },
    {
      id: "ask_service_interest",
      type: "question",
      name: "Ask service interest",
      prompt: "Which service are you interested in?",
      variable: "service_interest",
      choices: serviceChoices,
      retryMessage: "Please choose a service.",
      metadata: metadataFromSources(businessUnderstanding.services.flatMap((service) => service.sourceRefs), average(businessUnderstanding.services.map((service) => service.confidence)))
    },
    {
      id: "collect_lead",
      type: "field_collection",
      name: "Collect lead details",
      fields: fieldDefinitions,
      completionMessage: "Thanks. I will pass this request to the team.",
      metadata: metadataFromSources(plan.requiredFields.flatMap((field) => field.sourceRefs), average(plan.requiredFields.map((field) => field.confidence)))
    },
    ...(faq
      ? [
          {
            id: "answer_faq",
            type: "message" as const,
            name: "Answer FAQ",
            message: faq.answer,
            metadata: metadataFromSources(faq.sourceRefs, faq.confidence)
          }
        ]
      : []),
    {
      id: "unsupported",
      type: "message",
      name: "Unsupported request",
      message: "I do not have enough approved information to handle that request. I will route this to a person.",
      metadata: metadataFromSources([], 0.6)
    },
    {
      id: "handoff_sales",
      type: "handoff",
      name: "Handoff to team",
      message: "A team member should follow up with you.",
      metadata: metadataFromSources([], 0.6)
    },
    { id: "done", type: "end", name: "Done", message: "Thank you." }
  ];

  const edges: WorkflowEdge[] = [
    { id: "edge_start_welcome", source: "start", target: "welcome" },
    { id: "edge_welcome_route", source: "welcome", target: "route_intent" },
    { id: "edge_route_lead", source: "route_intent", target: "ask_service_interest", condition: intentIs("lead"), priority: 1, label: "Lead" },
    ...(faq
      ? [{ id: "edge_route_faq", source: "route_intent", target: "answer_faq", condition: intentIs("faq"), priority: 2, label: "FAQ" } satisfies WorkflowEdge]
      : []),
    { id: "edge_route_staff", source: "route_intent", target: "handoff_sales", condition: intentIs("staff"), priority: 3, label: "Staff" },
    { id: "edge_route_unsupported", source: "route_intent", target: "unsupported", fallback: true, label: "Fallback" },
    { id: "edge_service_collect", source: "ask_service_interest", target: "collect_lead" },
    { id: "edge_collect_handoff", source: "collect_lead", target: "handoff_sales" },
    ...(faq ? [{ id: "edge_faq_done", source: "answer_faq", target: "done" } satisfies WorkflowEdge] : []),
    { id: "edge_unsupported_handoff", source: "unsupported", target: "handoff_sales" }
  ];

  const tests: WorkflowTestCase[] = [
    {
      id: "test_service_lead_happy_path",
      name: "Service lead happy path",
      input: ["lead", businessUnderstanding.services[0]?.id ?? "service", ...plan.requiredFields.map((field) => sampleInputForField(field.key))],
      expectedPath: ["start", "welcome", "route_intent", "ask_service_interest", "collect_lead", "handoff_sales"]
    },
    {
      id: "test_service_unsupported_handoff",
      name: "Unsupported request hands off",
      input: ["unknown request"],
      expectedPath: ["start", "welcome", "route_intent", "unsupported", "handoff_sales"]
    },
    ...(faq
      ? [
          {
            id: "test_service_faq_path",
            name: "Service FAQ path",
            input: ["faq"],
            expectedPath: ["start", "welcome", "route_intent", "answer_faq", "done"]
          }
        ]
      : [])
  ];

  const workflow: WorkflowDefinition = {
    ...baseWorkflowFields(context, "service_lead"),
    nodes,
    edges,
    variables,
    tests
  };

  return {
    workflow,
    tests,
    nodePlan: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      reason: reasonForNode(node.id),
      sourceRefs: node.metadata?.sourceRefs ?? [],
      confidence: node.metadata?.confidence ?? 0.6
    })),
    edgePlan: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      reason: edge.label ?? "Template route",
      condition: edge.condition ? JSON.stringify(edge.condition) : undefined,
      fallback: edge.fallback
    }))
  };
}

function intentIs(intent: string): ConditionAst {
  return { op: "intent_is", intent };
}

function reasonForNode(nodeId: string): string {
  if (nodeId === "ask_service_interest") return "Collect service interest from source-backed services.";
  if (nodeId === "collect_lead") return "Collect approved lead fields.";
  if (nodeId === "answer_faq") return "Answer exact known FAQ from BusinessUnderstanding.";
  if (nodeId === "handoff_sales") return "Use conservative human handoff for follow-up.";
  return "Service lead template node.";
}

function metadataFromSources(sourceRefs: string[], confidence: number) {
  return {
    sourceRefs: [...new Set(sourceRefs)].filter(Boolean),
    confidence
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0.6;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function sampleInputForField(key: string): string {
  if (key.includes("phone")) return "+966500000000";
  if (key.includes("email")) return "customer@example.com";
  if (key.includes("date")) return "2026-07-01";
  return "Sample answer";
}
