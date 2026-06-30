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

export function buildClinicBookingTemplate(context: TemplateBuildContext): TemplateBuildResult {
  const { businessUnderstanding, plan } = context;
  const fields: FieldDefinition[] = fieldDefinitionsFromPlan(plan.requiredFields);
  const variables: WorkflowVariable[] = variableDefinitionsFromPlan(plan.requiredFields);
  const faq = businessUnderstanding.faqs[0];

  const nodes: WorkflowNode[] = [
    { id: "start", type: "start", name: "Start" },
    {
      id: "welcome",
      type: "message",
      name: "Welcome",
      message: `Welcome to ${businessUnderstanding.businessName ?? "the clinic"}. How can I help you today?`,
      quickReplies: [
        { id: "book", label: "Book appointment", value: "book" },
        ...(faq ? [{ id: "faq", label: "Common question", value: "faq" }] : []),
        { id: "staff", label: "Talk to staff", value: "staff" }
      ],
      metadata: metadataFromSources(businessUnderstanding.sources.map((source) => source.sourceId), businessUnderstanding.confidence)
    },
    { id: "route_intent", type: "condition", name: "Route intent" },
    {
      id: "collect_appointment",
      type: "field_collection",
      name: "Collect appointment request",
      fields,
      completionMessage: "Thanks. I will pass this appointment request to the team.",
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
      message: "I do not have enough approved information to answer that. I will route this to a person.",
      metadata: metadataFromSources([], 0.6)
    },
    {
      id: "handoff_staff",
      type: "handoff",
      name: "Handoff to staff",
      message: "A staff member should follow up with you.",
      metadata: metadataFromSources([], 0.6)
    },
    { id: "done", type: "end", name: "Done", message: "Thank you." }
  ];

  const edges: WorkflowEdge[] = [
    { id: "edge_start_welcome", source: "start", target: "welcome" },
    { id: "edge_welcome_route", source: "welcome", target: "route_intent" },
    { id: "edge_route_booking", source: "route_intent", target: "collect_appointment", condition: intentIs("book"), priority: 1, label: "Book" },
    ...(faq
      ? [{ id: "edge_route_faq", source: "route_intent", target: "answer_faq", condition: intentIs("faq"), priority: 2, label: "FAQ" } satisfies WorkflowEdge]
      : []),
    { id: "edge_route_staff", source: "route_intent", target: "handoff_staff", condition: intentIs("staff"), priority: 3, label: "Staff" },
    { id: "edge_route_unsupported", source: "route_intent", target: "unsupported", fallback: true, label: "Fallback" },
    { id: "edge_collect_handoff", source: "collect_appointment", target: "handoff_staff" },
    ...(faq ? [{ id: "edge_faq_done", source: "answer_faq", target: "done" } satisfies WorkflowEdge] : []),
    { id: "edge_unsupported_handoff", source: "unsupported", target: "handoff_staff" }
  ];

  const tests: WorkflowTestCase[] = [
    {
      id: "test_clinic_booking_happy_path",
      name: "Clinic booking happy path",
      input: ["book", ...plan.requiredFields.map((field) => sampleInputForField(field.key))],
      expectedPath: ["start", "welcome", "route_intent", "collect_appointment", "handoff_staff"]
    },
    {
      id: "test_clinic_unsupported_handoff",
      name: "Unsupported request hands off",
      input: ["something else"],
      expectedPath: ["start", "welcome", "route_intent", "unsupported", "handoff_staff"]
    },
    {
      id: "test_clinic_missing_field_retry",
      name: "Clinic booking missing field retry",
      input: ["book", ""],
      expectedPath: ["start", "welcome", "route_intent", "collect_appointment", "collect_appointment"]
    },
    ...(faq
      ? [
          {
            id: "test_clinic_faq_path",
            name: "Clinic FAQ path",
            input: ["faq"],
            expectedPath: ["start", "welcome", "route_intent", "answer_faq", "done"]
          }
        ]
      : [])
  ];

  const workflow: WorkflowDefinition = {
    ...baseWorkflowFields(context, "clinic_booking"),
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
  if (nodeId === "collect_appointment") return "Collect source-backed appointment request fields.";
  if (nodeId === "answer_faq") return "Answer exact known FAQ from BusinessUnderstanding.";
  if (nodeId === "handoff_staff") return "Use conservative human handoff for follow-up.";
  return "Clinic booking template node.";
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
  if (key.includes("date")) return "2026-07-01";
  if (key.includes("email")) return "customer@example.com";
  return "Sample answer";
}
