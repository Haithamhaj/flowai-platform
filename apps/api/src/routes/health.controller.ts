import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "flowai-api",
      phase: "greenfield-runtime-slice"
    };
  }
}

