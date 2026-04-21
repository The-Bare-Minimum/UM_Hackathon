from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "SME Business Manager"
    ENV: str = "development"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    
    # Z.AI
    Z_AI_API_KEY: str
    Z_AI_MODEL: str = "glm-4"
    
    # Database
    DATABASE_URL: str | None = None

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
