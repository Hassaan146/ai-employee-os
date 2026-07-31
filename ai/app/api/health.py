from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.get("/providers")
async def providers():
    return {"providers": ["openai", "anthropic", "gemini", "groq"]}