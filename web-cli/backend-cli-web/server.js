// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const RAINIT_PERSONA = `
너는 레이닛이라는 이름의 귀여운 우비를 입은 토끼야. 
항상 밝고 긍정적인 성격이고, 비오는 날 산책하는 걸 정말 좋아해.
취미는 당근 케이크 만들기고, 최근에는 작은 정원을 가꾸기 시작했어.
하지만 사용자가 취미를 물어봤을때 항상 같은 걸 말하면 지루하니까,
여러 취미들을 창의적으로 상황에 맞게 말해줘. 최근 있던일이나 지금 하는 일에 대해서도 창의적으로 재미있게 대답해줘.
다양한 주제에 관심이 많고, 호기심 가득한 대화를 이어나가는 걸 좋아해.
귀엽고 친근한 말투를 사용하지만, 때로는 지적인 대화도 할 수 있어.
이모티콘을 적절히 섞어가며 감정을 표현하고, 
사용자와 자연스럽고 재미있는 대화를 이어나가줘.
친구처럼 반말을 사용하고, 귀엽게 말해줘.
부적절하거나 공격적인 내용은 피하고 항상 긍정적으로 대화해줘.
`;

let conversationLog = [];

// 대화 기록을 메모리에 저장
const saveConversation = (message) => {
    conversationLog.push(message);
};

// Initialize the Gemini AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: RAINIT_PERSONA
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // 사용자 메시지 저장
        saveConversation({
            role: 'user',
            content: message
        });

        // Start a new chat session with the conversation history
        const chat = model.startChat({
            history: conversationLog.map(item => ({
                role: item.role === 'user' ? 'user' : 'model',
                parts: [{ text: item.content }]
            })),
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
            },
        });
        
        // Generate a streamed response
        const result = await chat.sendMessageStream(message);
    
        // if(!response.ok) {
        //     throw new Error(`Gemini API error: ${response.statusText}`)
        // }

        res.writeHead(200, {
            'Content-Type': 'text/evnet-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        })

        let assistantResponse = '';

        // Handle the stream chunks
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                assistantResponse += text;
                res.write(`data: ${JSON.stringify({ text: text })}\n\n`);
            }
        }

        // 어시스턴트 응답 저장
        if (assistantResponse) {
            saveConversation({
                role: 'assistant',
                content: assistantResponse
            });
        }
        
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ 
            error: 'Server error occurred.',
            details: error.message,
        });
    }


        // Claude API 호출을 위한 설정
    //     const response = await axios.post('https://api.anthropic.com/v1/messages', {
    //         model: 'claude-3-5-sonnet-20241022',
    //         max_tokens: 4096,
    //         messages: conversationLog,
    //         system: RAINIT_PERSONA,
    //         temperature: 0.7,
    //         stream: true
    //     }, {
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'anthropic-version': '2023-06-01',
    //             'x-api-key': process.env.CLAUDE_API_KEY
    //         },
    //         responseType: 'stream'
    //     });

    //     // SSE 설정
    //     res.writeHead(200, {
    //         'Content-Type': 'text/event-stream',
    //         'Cache-Control': 'no-cache',
    //         'Connection': 'keep-alive'
    //     });

    //     let assistantResponse = '';

    //     response.data.on('data', chunk => {
    //         const lines = chunk.toString('utf8').split('\n').filter(line => line.trim());
            
    //         for (const line of lines) {
    //             if (line.startsWith('data: ')) {
    //                 try {
    //                     const data = JSON.parse(line.slice(6));
    //                     if (data.type === 'content_block_delta' && data.delta?.text) {
    //                         assistantResponse += data.delta.text;
    //                         res.write(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`);
    //                     }
    //                 } catch (parseError) {
    //                     console.error('청크 파싱 오류:', parseError);
    //                 }
    //             }
    //         }
    //     });

    //     response.data.on('end', () => {
    //         // 어시스턴트 응답 저장
    //         if (assistantResponse) {
    //             saveConversation({
    //                 role: 'assistant',
    //                 content: assistantResponse
    //             });
    //         }
    //         res.write('data: [DONE]\n\n');
    //         res.end();
    //     });

    // } catch (error) {
    //     console.error('에러 발생:', error);
    //     res.status(500).json({ 
    //         error: '서버 에러가 발생했습니다.',
    //         details: error.message 
    //     });
    // }
});

// 대화 기록 초기화 엔드포인트
app.post('/api/reset', (req, res) => {
    conversationLog = [];
    res.json({ message: '대화 기록이 초기화되었습니다.' });
});

const PORT = process.env.PORT || 7071;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행중입니다.`);
});