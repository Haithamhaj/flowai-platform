import { Module } from "@nestjs/common";
import { HealthController } from "./routes/health.controller.js";
import { RuntimeController } from "./routes/runtime.controller.js";
import { TelegramPreviewController } from "./routes/telegram-preview.controller.js";
import { WorkflowDraftController } from "./routes/workflow-draft.controller.js";
import { WorkflowController } from "./routes/workflow.controller.js";
import { RuntimeTestService } from "./services/runtime-test.service.js";
import { TelegramPreviewService } from "./services/telegram-preview.service.js";
import { WorkflowDraftService } from "./services/workflow-draft.service.js";

@Module({
  controllers: [HealthController, WorkflowController, RuntimeController, TelegramPreviewController, WorkflowDraftController],
  providers: [RuntimeTestService, TelegramPreviewService, WorkflowDraftService]
})
export class AppModule {}
