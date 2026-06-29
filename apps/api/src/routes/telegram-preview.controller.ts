import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TelegramPreviewService } from "../services/telegram-preview.service.js";

@Controller("channels/telegram/preview")
export class TelegramPreviewController {
  constructor(private readonly telegramPreviewService: TelegramPreviewService) {}

  @Post("connect")
  connect(@Body() body: unknown) {
    return this.telegramPreviewService.connect(body as never);
  }

  @Post(":adapterId/update")
  update(@Param("adapterId") adapterId: string, @Body() body: unknown) {
    return this.telegramPreviewService.update(adapterId, body);
  }

  @Post(":adapterId/reset-session")
  resetSession(@Param("adapterId") adapterId: string, @Body() body: unknown) {
    return this.telegramPreviewService.resetSession(adapterId, body as never);
  }

  @Get(":adapterId/sessions/:sessionId/trace")
  trace(@Param("adapterId") adapterId: string, @Param("sessionId") sessionId: string) {
    return this.telegramPreviewService.trace(adapterId, sessionId);
  }
}

