import { Module } from "@nestjs/common";
import { HealthController } from "./routes/health.controller.js";
import { RuntimeController } from "./routes/runtime.controller.js";
import { WorkflowController } from "./routes/workflow.controller.js";
import { RuntimeTestService } from "./services/runtime-test.service.js";

@Module({
  controllers: [HealthController, WorkflowController, RuntimeController],
  providers: [RuntimeTestService]
})
export class AppModule {}

