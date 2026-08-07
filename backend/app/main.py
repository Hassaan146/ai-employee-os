from fastapi import FastAPI
from app.celery_app import celery_app
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app import models
from app.api import auth, customers, leads, pipeline, activities, invoices, documents
from app.api.tasks import router as tasks_router
from app.api.quotations import router as quotations_router
from app.api.meetings import router as meetings_router
from app.api.reports import router as reports_router
from app.api.email import router as email_router
from app.api import customers, leads, pipeline, activities, invoices, documents, whatsapp, ai_tools_test, websocket

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
app.include_router(documents.router, prefix="/api/v1")
app.include_router(email_router, prefix="/api/v1")
app.include_router(customers.router)
app.include_router(leads.router)
app.include_router(pipeline.router)
app.include_router(activities.router)
app.include_router(tasks_router)
app.include_router(quotations_router)
app.include_router(meetings_router)
app.include_router(reports_router)
app.include_router(whatsapp.router)
app.include_router(ai_tools_test.router)
app.include_router(websocket.router)

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