import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import EvaluationRunModel, EvaluationMetricModel
from app.schemas.schemas import EvaluationRequest, EvaluationRunResponse, EvaluationMetricResponse
from app.evaluation.benchmark_lab import RCABenchmarkLab

router = APIRouter(prefix="/evaluation", tags=["Research & Evaluation Lab"])

@router.post("/run", response_model=EvaluationRunResponse)
def trigger_benchmark_evaluation(req: EvaluationRequest, db: Session = Depends(get_db)):
    lab = RCABenchmarkLab(db)
    run_record = lab.run_evaluation(dataset_name=req.dataset_name, target_methods=req.methods)
    
    metrics = db.query(EvaluationMetricModel).filter(EvaluationMetricModel.run_id == run_record.id).all()
    
    metric_res = [EvaluationMetricResponse.from_orm(m) for m in metrics]
    return EvaluationRunResponse(
        id=run_record.id,
        name=run_record.name,
        dataset_name=run_record.dataset_name,
        timestamp=run_record.timestamp,
        total_scenarios=run_record.total_scenarios,
        evaluated_methods=run_record.evaluated_methods,
        metrics=metric_res
    )

@router.get("/history", response_model=List[EvaluationRunResponse])
def get_evaluation_history(db: Session = Depends(get_db)):
    runs = db.query(EvaluationRunModel).order_by(EvaluationRunModel.timestamp.desc()).all()
    if not runs:
        # Auto trigger 1 run to seed lab
        lab = RCABenchmarkLab(db)
        runs = [lab.run_evaluation()]

    result = []
    for r in runs:
        metrics = db.query(EvaluationMetricModel).filter(EvaluationMetricModel.run_id == r.id).all()
        m_res = [EvaluationMetricResponse.from_orm(m) for m in metrics]
        result.append(EvaluationRunResponse(
            id=r.id,
            name=r.name,
            dataset_name=r.dataset_name,
            timestamp=r.timestamp,
            total_scenarios=r.total_scenarios,
            evaluated_methods=r.evaluated_methods,
            metrics=m_res
        ))
    return result

@router.get("/export/csv")
def export_evaluation_results_csv(run_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(EvaluationMetricModel)
    if run_id:
        query = query.filter(EvaluationMetricModel.run_id == run_id)
        
    metrics = query.all()
    if not metrics:
        # Run auto benchmark if empty
        lab = RCABenchmarkLab(db)
        r = lab.run_evaluation()
        metrics = db.query(EvaluationMetricModel).filter(EvaluationMetricModel.run_id == r.id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Run ID", "Method Name", "Precision@1", "Precision@3", "MRR",
        "Detection Delay (sec)", "Diagnosis Latency (ms)", "False Positive Rate"
    ])

    for m in metrics:
        writer.writerow([
            m.run_id, m.method_name, m.precision_at_1, m.precision_at_3,
            m.mean_reciprocal_rank, m.detection_delay_sec, m.diagnosis_latency_ms, m.false_positive_rate
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=aegis_x_rca_benchmark_results.csv"}
    )
