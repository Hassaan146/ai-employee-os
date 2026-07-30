# AI Employee OS - Backend Service

This is the backend server for AI Employee OS built with **FastAPI**, **PostgreSQL**, and **SQLAlchemy**.

## Tech Stack
- **Framework**: FastAPI
- **Database**: PostgreSQL (with SQLAlchemy ORM & Alembic migrations)
- **Task Queue / Caching**: Redis & Celery
- **Auth**: OAuth2 / JWT Token Authentication

## Folder Overview
- `app/api/`: REST & WebSocket route endpoints
- `app/core/`: Application settings, security, and DB connection setup
- `app/models/`: Database models / tables (Users, Customers, Invoices, Tasks, AI Agents)
- `app/services/`: Business logic, third-party integrations (Gmail, WhatsApp, Stripe), and AI service connectors
- `main.py`: Application entry point
