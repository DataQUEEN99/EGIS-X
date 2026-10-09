import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AEGIS-X Cloud Failure Intelligence"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./aegis_x.db")
    
    # Safe Mode & Safety Defaults
    SAFE_MODE_ENABLED: bool = True
    DRY_RUN_DEFAULT: bool = True
    HIGH_RISK_REQUIRES_APPROVAL: bool = True
    MAX_SCALE_LIMIT: int = 10
    VERIFICATION_WINDOW_SECONDS: int = 30
    
    # Diagnostics & Telemetry
    DEFAULT_BASELINE_ANOMALY_THRESHOLD: float = 2.5 # Z-score threshold
    TELEMETRY_WINDOW_MINUTES: int = 15
    
    class Config:
        case_sensitive = True

settings = Settings()
