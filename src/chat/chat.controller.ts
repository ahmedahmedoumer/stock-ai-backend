import { Controller, Post, Body, Get } from '@nestjs/common';
import { ChatService } from './chat.service.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('seed')
  async seed() {
    await this.chatService.seedInitialDocs();
    return { status: 'Database seeded with sample knowledge base successfully!' };
  }

  @Post('message')
  async sendMessage(@Body() body: { sessionId: string; message: string }) {
    return await this.chatService.handleChatMessage(body.sessionId || 'default-session', body.message);
  }
}
