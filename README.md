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
5. Run dev server: `uvicorn app.main:app --reload`
