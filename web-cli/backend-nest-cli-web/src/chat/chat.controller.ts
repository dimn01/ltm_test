import {
    Controller,
    Post,
    Body,
    Res,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { Response } from 'express';
  import { ChatService } from './chat.service';
  
  @Controller('api')
  export class ChatController {
    constructor(private readonly chatService: ChatService) {}
  
    @Post('chat')
    async chat(
      @Body('message') message: string,
      @Res() res: Response,
    ): Promise<void> {
      try {
        await this.chatService.chat(message, res);
      } catch (error) {
        throw new HttpException(
          {
            error: '서버 에러가 발생했습니다.',
            details: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Post('reset')
    resetConversation() {
      this.chatService.resetConversation();
      return { message: '대화 기록이 초기화되었습니다.' };
    }
  }