import { Body, Controller, Post } from "@nestjs/common";
import { WorkflowDraftService } from "../services/workflow-draft.service.js";

@Controller("workflow-drafts")
export class WorkflowDraftController {
  constructor(private readonly workflowDraftService: WorkflowDraftService) {}

  @Post("from-business-understanding")
  createFromBusinessUnderstanding(@Body() body: unknown) {
    return this.workflowDraftService.createDraft(body);
  }
}
