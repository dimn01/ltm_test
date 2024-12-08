import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { RAINIT_PERSONA } from '../constants/persona.constant';

@Injectable()
export class ChatService {
  private conversationLog: Array<{ role: string; content: string }> = [];

  async chat(message: string, res: Response): Promise<void> {
    try {
      // 사용자 메시지 저장
      this.saveConversation({ role: 'user', content: message });

      // Claude API 호출
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: this.conversationLog,
          system: RAINIT_PERSONA,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': process.env.CLAUDE_API_KEY,
          },
          responseType: 'stream',
        },
      );

      // SSE 헤더 설정
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let assistantResponse = '';

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk
          .toString('utf8')
          .split('\n')
          .filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta' && data.delta?.text) {
                assistantResponse += data.delta.text;
                res.write(
                  `data: ${JSON.stringify({ text: data.delta.text })}\n\n`,
                );
              }
            } catch (parseError) {
              console.error('청크 파싱 오류:', parseError);
            }
          }
        }
      });

      response.data.on('end', () => {
        if (assistantResponse) {
          this.saveConversation({
            role: 'assistant',
            content: assistantResponse,
          });
        }
        res.write('data: [DONE]\n\n');
        res.end();
      });
    } catch (error) {
      throw error;
    }
  }

  resetConversation(): void {
    this.conversationLog = [];
  }

  private saveConversation(message: { role: string; content: string }): void {
    this.conversationLog.push(message);
  }
}