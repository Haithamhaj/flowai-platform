export interface WorkflowGeneratorProvider {
  id: string;
  generate: (input: unknown) => Promise<unknown>;
}

export const workflowGeneratorStatus = {
  status: "placeholder",
  note: "AI workflow generation is intentionally deferred until the DSL and runtime are stable."
};

