from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.models import TelemetryObservationModel, AnomalyModel, ServiceModel
from app.schemas.schemas import TelemetryObservationResponse, AnomalyResponse, FaultInjectionRequest
from app.services.telemetry_service import generate_telemetry_snapshot, inject_fault, clear_faults, get_active_faults

router = APIRouter(prefix="/telemetry", tags=["Telemetry & Fault Injection"])

@router.get("/observations", response_model=List[TelemetryObservationResponse])
def get_telemetry_observations(
    service_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Ensure at least recent telemetry exists
    query = db.query(TelemetryObservationModel)
    if service_id:
        query = query.filter(TelemetryObservationModel.service_id == service_id)
        
    results = query.order_by(TelemetryObservationModel.timestamp.desc()).limit(limit).all()
    if not results:
        results = generate_telemetry_snapshot(db)
    return results

@router.post("/snapshot", response_model=List[TelemetryObservationResponse])
def trigger_telemetry_snapshot(db: Session = Depends(get_db)):
    return generate_telemetry_snapshot(db)

@router.get("/anomalies", response_model=List[AnomalyResponse])
def get_active_anomalies(db: Session = Depends(get_db)):
    anomalies = db.query(AnomalyModel).order_by(AnomalyModel.timestamp.desc()).limit(50).all()
    # Populate service_name
    svc_map = {s.id: s.display_name for s in db.query(ServiceModel).all()}
    res = []
    for a in anomalies:
        a_dict = AnomalyResponse.from_orm(a)
        a_dict.service_name = svc_map.get(a.service_id, "Unknown Service")
        res.append(a_dict)
    return res

@router.get("/metrics/summary")
def get_operations_summary(db: Session = Depends(get_db)):
    generate_telemetry_snapshot(db)
    services = db.query(ServiceModel).all()
    recent_obs = db.query(TelemetryObservationModel).order_by(TelemetryObservationModel.timestamp.desc()).limit(len(services) or 7).all()
    
    total_rps = sum(o.throughput_rps for o in recent_obs)
    avg_error = sum(o.error_rate_pct for o in recent_obs) / (len(recent_obs) or 1)
    avg_p50 = sum(o.latency_p50_ms for o in recent_obs) / (len(recent_obs) or 1)
    avg_p95 = sum(o.latency_p95_ms for o in recent_obs) / (len(recent_obs) or 1)
    avg_p99 = sum(o.latency_p99_ms for o in recent_obs) / (len(recent_obs) or 1)
    avg_cpu = sum(o.cpu_usage_pct for o in recent_obs) / (len(recent_obs) or 1)
    avg_mem = sum(o.memory_usage_mb for o in recent_obs) / (len(recent_obs) or 1)
    
    degraded_count = sum(1 for s in services if s.status != "healthy")

    return {
        "overall_health": "critical" if avg_error > 10.0 else ("degraded" if degraded_count > 0 else "healthy"),
        "total_services": len(services),
        "healthy_services": len(services) - degraded_count,
        "degraded_services": degraded_count,
        "request_throughput_rps": round(total_rps, 1),
        "avg_error_rate_pct": round(avg_error, 2),
        "latency_p50_ms": round(avg_p50, 1),
        "latency_p95_ms": round(avg_p95, 1),
        "latency_p99_ms": round(avg_p99, 1),
        "avg_cpu_pct": round(avg_cpu, 1),
        "avg_memory_mb": round(avg_mem, 1),
        "active_faults": get_active_faults()
    }

@router.post("/fault-injection/inject")
def inject_synthetic_fault(req: FaultInjectionRequest, db: Session = Depends(get_db)):
    svc = db.query(ServiceModel).filter(ServiceModel.id == req.target_service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
        
    inject_fault(req.target_service_id, req.fault_type, req.intensity, req.duration_seconds)
    # Immediately generate snapshot
    generate_telemetry_snapshot(db)
    return {"status": "fault_injected", "target_service": svc.display_name, "fault_type": req.fault_type}

@router.post("/fault-injection/clear")
def clear_synthetic_faults(service_id: Optional[str] = None, db: Session = Depends(get_db)):
    clear_faults(service_id)
    # Reset service statuses
    if service_id:
        svc = db.query(ServiceModel).filter(ServiceModel.id == service_id).first()
        if svc:
            svc.status = "healthy"
    else:
        for s in db.query(ServiceModel).all():
            s.status = "healthy"
    db.commit()
    generate_telemetry_snapshot(db)
    return {"status": "faults_cleared"}
