from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app import models  # sab models import ho jayengi __init__.py se
from app.api import customers, leads, pipeline  # <-- yeh line add karo

# Base.metadata.create_all(bind=engine)  # TODO: uncomment once Member 1 pushes Companies/Users models

app = FastAPI(
    title="AI Employee OS API",
    description="Backend API service for AI Employee OS digital workforce platform",
    version="0.1.0",
)

# Enable CORS for Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register CRM routers  <-- yeh block add karo
app.include_router(customers.router)
app.include_router(leads.router)
app.include_router(pipeline.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "AI Employee OS API",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}