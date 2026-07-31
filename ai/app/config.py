from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "AI Employee OS - AI Module"
    debug: bool = True

    # LLM providers
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""

    # DB
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_module"

settings = Settings()