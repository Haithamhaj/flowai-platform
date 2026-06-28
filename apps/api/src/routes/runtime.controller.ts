import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { RuntimeInput } from "@flowai/runtime-core";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";
import { RuntimeTestService } from "../services/runtime-test.service.js";

@Controller("runtime/test")
export class RuntimeController {
  constructor(private readonly runtimeTestService: RuntimeTestService) {}

  @Post("start")
  start(@Body() body: { workflow: WorkflowDefinition; sessionId?: string }) {
    return this.runtimeTestService.start(body.workflow, body.sessionId);
  }

  @Post(":sessionId/message")
  message(@Param("sessionId") sessionId: string, @Body() input: RuntimeInput) {
    return this.runtimeTestService.message(sessionId, input);
  }

  @Get(":sessionId/trace")
  trace(@Param("sessionId") sessionId: string) {
    return this.runtimeTestService.trace(sessionId);
  }
}

