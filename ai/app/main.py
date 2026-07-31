from fastapi import FastAPI
from app.config import settings
from app.api import health

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.include_router(health.router, prefix="/api", tags=["health"])

@app.get("/")
async def root():
    return {"message": f"{settings.app_name} is running"}