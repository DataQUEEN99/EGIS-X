from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.models.models import RunbookModel, RemediationApprovalModel, RemediationExecutionModel, AuditEventModel, IncidentModel
from app.schemas.schemas import RemediationRequest, RemediationApprovalResponse, RemediationExecutionResponse
from app.services.remediation_service import SafeRemediationEngine

router = APIRouter(prefix="/remediation", tags=["Safe Remediation Engine"])

@router.get("/runbooks")
def get_allowlisted_runbooks(db: Session = Depends(get_db)):
    engine = SafeRemediationEngine(db)
    return db.query(RunbookModel).all()

@router.get("/approvals", response_model=List[RemediationApprovalResponse])
def get_remediation_approvals(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(RemediationApprovalModel)
    if status:
        query = query.filter(RemediationApprovalModel.status == status)
    return query.order_by(RemediationApprovalModel.created_at.desc()).all()

@router.post("/request", response_model=RemediationApprovalResponse)
def request_remediation(req: RemediationRequest, db: Session = Depends(get_db)):
    engine = SafeRemediationEngine(db)
    approval = engine.create_remediation_request(
        incident_id=req.incident_id,
        action_type=req.action_type,
        target_service_id=req.target_service_id,
        parameters=req.parameters,
        justification=req.justification
    )
    return approval

@router.post("/approvals/{approval_id}/approve", response_model=RemediationApprovalResponse)
def approve_remediation(approval_id: str, approved_by: str = "sre_operator", db: Session = Depends(get_db)):
    approval = db.query(RemediationApprovalModel).filter(RemediationApprovalModel.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    approval.status = "APPROVED"
    approval.approved_by = approved_by
    db.commit()
    db.refresh(approval)

    audit = AuditEventModel(
        actor=approved_by,
        action="HUMAN_APPROVAL_GRANTED",
        resource=f"approval:{approval_id}",
        details={"risk_level": approval.risk_level, "action_type": approval.action_type}
    )
    db.add(audit)
    db.commit()

    return approval

@router.post("/approvals/{approval_id}/reject", response_model=RemediationApprovalResponse)
def reject_remediation(approval_id: str, rejected_by: str = "sre_operator", db: Session = Depends(get_db)):
    approval = db.query(RemediationApprovalModel).filter(RemediationApprovalModel.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    approval.status = "REJECTED"
    db.commit()
    db.refresh(approval)

    audit = AuditEventModel(
        actor=rejected_by,
        action="HUMAN_APPROVAL_REJECTED",
        resource=f"approval:{approval_id}",
        details={"risk_level": approval.risk_level}
    )
    db.add(audit)
    db.commit()

    return approval

@router.post("/execute/{approval_id}", response_model=RemediationExecutionResponse)
def execute_remediation(approval_id: str, is_dry_run: bool = True, actor: str = "sre_operator", db: Session = Depends(get_db)):
    engine = SafeRemediationEngine(db)
    try:
        execution = engine.execute_remediation(approval_id=approval_id, is_dry_run=is_dry_run, actor=actor)
        return execution
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/audit-logs")
def get_audit_trail(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(AuditEventModel).order_by(AuditEventModel.timestamp.desc()).limit(limit).all()
