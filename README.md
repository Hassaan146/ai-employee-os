# AI Employee OS

An AI-powered business operating system designed to replace repetitive office work with intelligent digital AI employees.

## Project Structure

```text
AI Employee OS/
├── backend/            # FastAPI + PostgreSQL backend service & APIs
├── frontend/           # Next.js / React Web Application
├── ai/                 # AI Agent logic, LLM pipelines & prompt systems
├── docker-compose.yml  # Local multi-service orchestrator
└── EmployeeOS.md       # Product specifications and feature breakdown
```

## Quick Start (Backend)

1. Navigate to backend: `cd backend`
2. Create virtual environment: `python -m venv venv`
3. Activate virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run dev server: `uvicorn app.main:app --reload --port 8000`

## Quick Start (AI Service)

1. Navigate to the AI module: `cd ai`
2. Install dependencies: `uv sync`
3. Run dev server: `uvicorn app.main:app --reload --port 8001`

## Quick Start (Frontend)

1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Copy environment template: `cp .env.example .env.local`
4. Run dev server: `npm run dev`

The console is served at <http://localhost:3000>. Its **System status** page shows
which services are reachable and which endpoints are live.

See [frontend/README.md](./frontend/README.md) for details and
[frontend/PHASES.md](./frontend/PHASES.md) for the Phase 1 / Phase 2 delivery plan.
