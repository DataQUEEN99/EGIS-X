from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health & System Status"])

@router.get("")
def get_system_health(db: Session = Depends(get_db)):
    # Database connectivity check
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "version": settings.VERSION,
        "environment": "production-style-mvp",
        "safe_mode_enabled": settings.SAFE_MODE_ENABLED,
        "dry_run_default": settings.DRY_RUN_DEFAULT,
        "database_connected": db_ok,
        "telemetry_collector_status": "active",
        "rca_engine_models": ["static_rules", "telemetry_only", "dependency_aware"],
        "timestamp": settings.VERSION
    }
