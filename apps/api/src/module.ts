import { Module } from "@nestjs/common";
import { HealthController } from "./routes/health.controller.js";
import { RuntimeController } from "./routes/runtime.controller.js";
import { TelegramPreviewController } from "./routes/telegram-preview.controller.js";
import { WorkflowController } from "./routes/workflow.controller.js";
import { RuntimeTestService } from "./services/runtime-test.service.js";
import { TelegramPreviewService } from "./services/telegram-preview.service.js";

@Module({
  controllers: [HealthController, WorkflowController, RuntimeController, TelegramPreviewController],
  providers: [RuntimeTestService, TelegramPreviewService]
})
export class AppModule {}
