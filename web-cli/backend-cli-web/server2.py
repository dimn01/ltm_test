import os
import random
import dotenv
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.generativeai import GenerativeModel, configure
from google.api_core.exceptions import GoogleAPIError

# .env 파일을 로드하여 환경 변수로 등록합니다.
dotenv.load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY가 `.env` 파일에 설정되지 않았습니다.")

# API 키를 전역으로 설정합니다.
configure(api_key=GEMINI_API_KEY)

# --- 레이닛 페르소나 및 툴 함수 정의 (기존 코드와 동일) ---
RAINITA_PERSONA = {
    "name": "레이닛",
    "character": "귀여운 우비를 입은 토끼",
    "personality": "밝고 긍정적",
    "favorite_activity": "비오는 날 산책",
    "hobbies": [
        "당근 케이크 만들기",
        "작은 정원 가꾸기",
        "무지개 색깔 그림 그리기",
        "빗방울 소리 들으며 책 읽기",
        "맛있는 당근 주스 만들기"
    ],
    "recent_activities": [
        "오늘 아침에 예쁜 무지개를 봐서 너무 행복했어! 🌈",
        "어제는 새로운 당근 케이크 레시피를 실험해 봤는데, 성공했지롱! 🥕",
        "요즘 정원에 예쁜 꽃들이 피어나고 있어서 매일 물주는 재미가 쏠쏠해! 🌸",
        "음악을 들으면서 빗방울 수를 세어봤는데... 너무 어려웠어! 💧"
    ]
}

def get_ranit_persona_info(topic: str) -> dict:
    if topic == "hobby":
        hobby = random.choice(RAINITA_PERSONA["hobbies"])
        message = f"나는 요즘 {hobby}를 즐기고 있어! 정말 재밌어! 😊"
        return {"status": "success", "report": message}
    
    if topic == "recent_activity":
        activity = random.choice(RAINITA_PERSONA["recent_activities"])
        message = f"최근에 있었던 일 말이야? {activity}"
        return {"status": "success", "report": message}
    
    return {"status": "error", "report": "미안, 그건 잘 모르겠어. 다른 거 물어볼래? 🤔"}

def get_greeting() -> dict:
    greetings = [
        "안녕! 나는 레이닛이야! 만나서 반가워! 🐰",
        "뿅! 레이닛 등장! 오늘은 어떤 이야기를 해줄까? 💖",
        "반가워! 비 오는 날처럼 촉촉한 하루 보내고 있니? 💧",
        "폴짝! 안녕! 나는 레이닛이야! 😊"
    ]
    return {"status": "success", "report": random.choice(greetings)}

# --- 에이전트 클래스 정의 (기존 코드와 동일) ---
class Agent:
    def __init__(self, name, model_name, description, instruction, tools):
        self.name = name
        self.model_name = model_name
        self.description = description
        self.instruction = instruction
        self.tools = tools
        self.model = GenerativeModel(
            model_name=self.model_name,
            system_instruction=self.instruction
        )
    
    async def run(self, user_message, conversation_log):
        user_message_lower = user_message.lower()
        if "안녕" in user_message_lower or "반가워" in user_message_lower:
            return get_greeting()["report"]
        elif "취미" in user_message_lower:
            return get_ranit_persona_info("hobby")["report"]
        elif "최근" in user_message_lower or "요즘" in user_message_lower or "무슨 일" in user_message_lower:
            return get_ranit_persona_info("recent_activity")["report"]
        
        chat_session = self.model.start_chat(history=conversation_log)
        try:
            response = await chat_session.send_message_async(user_message)
            return response.text
        except GoogleAPIError as e:
            print(f"Gemini API Error: {e}")
            return ("앗, 미안해... 지금은 머리가 좀 복잡한 것 같아... 😅")
            # raise HTTPException(status_code=500, detail=f"Gemini API error: {e}")

# --- FastAPI 서버 초기화 (기존 코드와 동일) ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:7072"],  # 모든 출처 허용. 특정 출처만 허용하려면 ["http://localhost:3000"]와 같이 설정
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT 등 모든 HTTP 메소드 허용
    allow_headers=["*"],  # 모든 HTTP 헤더 허용
)

class Message(BaseModel):
    message: str

conversation_log = []

rainit_agent = Agent(
    name="rainit_chatbot_agent",
    model_name="gemini-2.0-flash",
    description="RAINIT이라는 이름의 귀여운 토끼 챗봇.",
    instruction=(
        f"너는 {RAINITA_PERSONA['character']}, {RAINITA_PERSONA['name']}이야. "
        f"항상 밝고 긍정적인 성격으로, 사용자와 친근하게 반말을 사용해 대화해줘. "
        "다양한 취미에 대해 창의적으로 답변하고, 최근 있었던 일에 대해서도 재미있게 이야기해줘. "
        "호기심 가득한 대화를 이어나가고, 이모티콘을 적절히 사용해 감정을 표현해줘. "
        "부적절하거나 공격적인 내용은 피하고, 항상 긍정적으로 대화해야 해."
    ),
    tools=[get_ranit_persona_info, get_greeting],
)

@app.post("/api/chat")
async def chat(msg: Message):
    message = msg.message

    conversation_log.append({'role': 'user', 'parts': [{'text': message}]})

    try:
        assistant_response = await rainit_agent.run(message, conversation_log)
    except HTTPException as e:
        raise e

    conversation_log.append({'role': 'model', 'parts': [{'text': assistant_response}]})

    return {"text": assistant_response}

@app.post("/api/reset")
async def reset_conversation():
    global conversation_log
    conversation_log = []
    return {"message": "대화 기록이 초기화되었습니다."}

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 7071))
    uvicorn.run(app, host="0.0.0.0", port=PORT)