from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.schemas.schemas import RCARequest, RCAResponse, CandidateResponse, EvidenceResponse
from app.diagnostics.rca_engine import DiagnosticRCAEngine
from app.models.models import ServiceModel

router = APIRouter(prefix="/diagnostics", tags=["AI Root Cause Analysis Engine"])

@router.post("/analyze", response_model=RCAResponse)
def run_root_cause_analysis(req: RCARequest, db: Session = Depends(get_db)):
    rca = DiagnosticRCAEngine(db)
    svc_map = {s.id: s.display_name for s in db.query(ServiceModel).all()}
    
    if req.method == "static_rules":
        raw_candidates = rca.run_static_rules_baseline(req.lookback_minutes)
        candidates = []
        for idx, r in enumerate(raw_candidates):
            evidence = [
                EvidenceResponse(
                    id=f"ev-{idx}-1",
                    evidence_type="rule_violation",
                    title=f"Static Threshold Rule Violations ({len(r['broken_rules'])})",
                    description="; ".join(r["broken_rules"]),
                    supporting=True,
                    metric_data={"rules_broken_count": len(r["broken_rules"])}
                )
            ]
            candidates.append(CandidateResponse(
                id=f"cand-static-{idx}",
                candidate_service_id=r["service_id"],
                candidate_service_name=r["display_name"],
                rank=idx + 1,
                confidence_score=r["score"],
                method_used="static_rules",
                evidence_summary={"broken_rules": r["broken_rules"]},
                uncertainty_explanation="Static threshold rules rank strictly by threshold breach count without topological awareness.",
                evidence_items=evidence
            ))
        note = "Static rules analysis complete. Does not factor topology propagation or temporal event timing."

    elif req.method == "telemetry_only":
        raw_candidates = rca.run_telemetry_only_baseline(req.lookback_minutes)
        candidates = []
        for idx, r in enumerate(raw_candidates):
            evidence = [
                EvidenceResponse(
                    id=f"ev-tel-{idx}-1",
                    evidence_type="z_score_spike",
                    title=f"Z-Score Anomaly Spike (Max: {r['max_z_score']:.1f})",
                    description=f"Significant statistical metric deviation for {r['display_name']}.",
                    supporting=True,
                    metric_data=r["metric_z_scores"]
                )
            ]
            candidates.append(CandidateResponse(
                id=f"cand-telemetry-{idx}",
                candidate_service_id=r["service_id"],
                candidate_service_name=r["display_name"],
                rank=idx + 1,
                confidence_score=r["score"],
                method_used="telemetry_only",
                evidence_summary={"max_z_score": r["max_z_score"]},
                uncertainty_explanation="Telemetry-only detector ranks candidates by raw metric deviation.",
                evidence_items=evidence
            ))
        note = "Telemetry anomaly detection complete. Evaluates rolling z-scores across metric channels."

    else: # dependency_aware
        raw_candidates = rca.run_dependency_aware_rca(req.lookback_minutes)
        candidates = []
        for idx, r in enumerate(raw_candidates):
            ev_models = [
                EvidenceResponse(
                    id=f"ev-dep-{idx}-{e_i}",
                    evidence_type=item["evidence_type"],
                    title=item["title"],
                    description=item["description"],
                    supporting=item["supporting"],
                    metric_data=item["metric_data"]
                ) for e_i, item in enumerate(r["evidence_items"])
            ]
            candidates.append(CandidateResponse(
                id=f"cand-dep-{idx}",
                candidate_service_id=r["service_id"],
                candidate_service_name=r["display_name"],
                rank=r["rank"],
                confidence_score=r["confidence_score"],
                method_used="dependency_aware",
                evidence_summary=r["evidence_summary"],
                uncertainty_explanation=r["uncertainty_explanation"],
                evidence_items=ev_models
            ))
        note = "Proposed Dependency-Aware RCA complete. Integrated topology shortest path, temporal metric z-scores, and deployment correlation."

    return RCAResponse(
        timestamp=datetime.utcnow(),
        method_used=req.method,
        incident_id=req.incident_id,
        ranked_candidates=candidates,
        uncertainty_note=note,
        telemetry_window_minutes=req.lookback_minutes
    )
