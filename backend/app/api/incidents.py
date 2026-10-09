from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.models import IncidentModel, ServiceModel, RootCauseCandidateModel, DiagnosticEvidenceModel
from app.schemas.schemas import IncidentResponse, CandidateResponse, EvidenceResponse
from app.diagnostics.rca_engine import DiagnosticRCAEngine

router = APIRouter(prefix="/incidents", tags=["Incident Intelligence"])

def seed_sample_incidents_if_empty(db: Session):
    if db.query(IncidentModel).first():
        return
        
    services = db.query(ServiceModel).all()
    svc_map = {s.name: s.id for s in services}
    
    inc = IncidentModel(
        incident_number="INC-2026-8941",
        title="Cascading Checkout Latency & Payment Gateway Timeout Surge",
        summary="High error rates in Checkout Service driven by Payment Gateway upstream API timeout.",
        status="active",
        severity="P1",
        affected_services=["checkout-service", "payment-gateway", "api-gateway"],
        detection_method="dependency_aware_rca",
        start_time=datetime.utcnow() - timedelta(minutes=18),
        updated_time=datetime.utcnow() - timedelta(minutes=2)
    )
    db.add(inc)
    db.flush()

    # Seed candidates
    rca = DiagnosticRCAEngine(db)
    candidates = rca.run_dependency_aware_rca()

    for c in candidates[:3]:
        cand = RootCauseCandidateModel(
            incident_id=inc.id,
            candidate_service_id=c["service_id"],
            rank=c["rank"],
            confidence_score=c["confidence_score"],
            method_used=c["method_used"],
            evidence_summary=c["evidence_summary"],
            uncertainty_explanation=c["uncertainty_explanation"]
        )
        db.add(cand)
        db.flush()

        for item in c["evidence_items"]:
            ev = DiagnosticEvidenceModel(
                candidate_id=cand.id,
                evidence_type=item["evidence_type"],
                title=item["title"],
                description=item["description"],
                supporting=item["supporting"],
                metric_data=item["metric_data"]
            )
            db.add(ev)

    db.commit()

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    service: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_sample_incidents_if_empty(db)
    query = db.query(IncidentModel)
    if status:
        query = query.filter(IncidentModel.status == status)
    if severity:
        query = query.filter(IncidentModel.severity == severity)
        
    results = query.order_by(IncidentModel.start_time.desc()).all()
    
    # Format candidates with service display names
    svc_map = {s.id: s.display_name for s in db.query(ServiceModel).all()}
    formatted = []
    for inc in results:
        inc_res = IncidentResponse.from_orm(inc)
        for cand in inc_res.candidates:
            cand.candidate_service_name = svc_map.get(cand.candidate_service_id, "Unknown Service")
        formatted.append(inc_res)
    return formatted

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_detail(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    svc_map = {s.id: s.display_name for s in db.query(ServiceModel).all()}
    inc_res = IncidentResponse.from_orm(inc)
    for cand in inc_res.candidates:
        cand.candidate_service_name = svc_map.get(cand.candidate_service_id, "Unknown Service")
    return inc_res

@router.post("/trigger-active")
def trigger_synthetic_incident(title: str = "Synthetic Service Degradation Alert", db: Session = Depends(get_db)):
    services = db.query(ServiceModel).all()
    target_svc = services[0] if services else None
    
    inc = IncidentModel(
        incident_number=f"INC-2026-{datetime.utcnow().strftime('%H%M%S')}",
        title=title,
        summary="Automated telemetry anomaly trigger created an incident for RCA analysis.",
        status="active",
        severity="P2",
        affected_services=[target_svc.name] if target_svc else ["api-gateway"],
        detection_method="dependency_aware_rca",
        start_time=datetime.utcnow()
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc
