from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import RecoveryVerificationModel
from app.schemas.schemas import VerificationResponse

router = APIRouter(prefix="/verification", tags=["Recovery Verification Engine"])

@router.get("", response_model=List[VerificationResponse])
def get_all_verifications(incident_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(RecoveryVerificationModel)
    if incident_id:
        query = query.filter(RecoveryVerificationModel.incident_id == incident_id)
    return query.order_by(RecoveryVerificationModel.checked_at.desc()).all()

@router.get("/{verification_id}", response_model=VerificationResponse)
def get_verification_detail(verification_id: str, db: Session = Depends(get_db)):
    v = db.query(RecoveryVerificationModel).filter(RecoveryVerificationModel.id == verification_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Verification record not found")
    return v
