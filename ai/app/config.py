from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )



    app_name: str = "AI Employee OS - AI Module"
    debug: bool = True



    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = "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"



    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_module"
    )

    

    documents_path: Path = Path("app/rag/documents")

    vector_db_path: Path = Path("app/rag/vector_db")

    chunk_size: int = 1000

    chunk_overlap: int = 200

    top_k: int = 5

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    collection_name: str = "employee_knowledge"


settings = Settings()