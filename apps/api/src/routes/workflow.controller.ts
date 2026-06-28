import { Body, Controller, Post } from "@nestjs/common";
import { validateWorkflow, type WorkflowDefinition } from "@flowai/workflow-dsl";

@Controller("workflows")
export class WorkflowController {
  @Post("validate")
  validate(@Body() workflow: WorkflowDefinition) {
    return validateWorkflow(workflow);
  }
}

