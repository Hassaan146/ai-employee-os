from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app import models
from app.api import auth, customers, leads, pipeline, activities, invoices
from app.api.tasks import router as tasks_router
from app.api.quotations import router as quotations_router

# Auto-create all database tables on startup
Base.metadata.create_all(bind=engine)

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

# Register Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(invoices.router, prefix="/api/v1")
app.include_router(customers.router)
app.include_router(leads.router)
app.include_router(pipeline.router)
app.include_router(activities.router)
app.include_router(tasks_router)
app.include_router(quotations_router)

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