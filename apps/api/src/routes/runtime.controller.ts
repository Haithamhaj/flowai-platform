import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";
import { RuntimeTestService, type RuntimeMessageRequest } from "../services/runtime-test.service.js";

@Controller("runtime/test")
export class RuntimeController {
  constructor(private readonly runtimeTestService: RuntimeTestService) {}

  @Post("start")
  start(@Body() body: { workflow: WorkflowDefinition; sessionId?: string }) {
    return this.runtimeTestService.start(body.workflow, body.sessionId);
  }

  @Post(":sessionId/message")
  message(@Param("sessionId") sessionId: string, @Body() request: RuntimeMessageRequest) {
    return this.runtimeTestService.message(sessionId, request);
  }

  @Get(":sessionId/trace")
  trace(@Param("sessionId") sessionId: string) {
    return this.runtimeTestService.trace(sessionId);
  }

  @Post(":sessionId/reset")
  reset(@Param("sessionId") sessionId: string) {
    return this.runtimeTestService.reset(sessionId);
  }
}
