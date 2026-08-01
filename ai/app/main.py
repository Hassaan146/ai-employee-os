from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import health

app = FastAPI(title=settings.app_name, debug=settings.debug)

# Enable CORS so the Next.js frontend can call this service directly from the
# browser. Without it every request fails preflight, even though the same
# endpoints answer fine over curl. Mirrors the policy in backend/app/main.py.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])

@app.get("/")
async def root():
    return {"message": f"{settings.app_name} is running"}