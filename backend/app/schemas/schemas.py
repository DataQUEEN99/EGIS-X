from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# Services
class ServiceBase(BaseModel):
    name: str
    display_name: str
    type: str
    tier: str = "backend"
    status: str = "healthy"
    owner: str = "sre-team"
    cpu_limit: float = 100.0
    memory_limit_mb: float = 1024.0

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Dependencies
class DependencyBase(BaseModel):
    source_service_id: str
    target_service_id: str
    dependency_type: str = "sync_http"
    criticality: str = "high"
    latency_budget_ms: float = 100.0
    is_inferred: bool = False

class DependencyCreate(DependencyBase):
    pass

class DependencyResponse(DependencyBase):
    id: str

    class Config:
        from_attributes = True

# Telemetry
class TelemetryObservationBase(BaseModel):
    service_id: str
    throughput_rps: float = 0.0
    error_rate_pct: float = 0.0
    latency_p50_ms: float = 0.0
    latency_p95_ms: float = 0.0
    latency_p99_ms: float = 0.0
    cpu_usage_pct: float = 0.0
    memory_usage_mb: float = 0.0
    is_anomaly: bool = False
    anomaly_score: float = 0.0
    source_type: str = "live"

class TelemetryObservationResponse(TelemetryObservationBase):
    id: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Anomalies
class AnomalyResponse(BaseModel):
    id: str
    service_id: str
    service_name: Optional[str] = None
    timestamp: datetime
    metric_name: str
    observed_value: float
    baseline_value: float
    z_score: float
    severity: str
    description: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

# Incidents
class EvidenceResponse(BaseModel):
    id: str
    evidence_type: str
    title: str
    description: str
    supporting: bool
    metric_data: Dict[str, Any] = {}

    class Config:
        from_attributes = True

class CandidateResponse(BaseModel):
    id: str
    candidate_service_id: str
    candidate_service_name: Optional[str] = None
    rank: int
    confidence_score: float
    method_used: str
    evidence_summary: Dict[str, Any] = {}
    uncertainty_explanation: Optional[str] = None
    evidence_items: List[EvidenceResponse] = []

    class Config:
        from_attributes = True

class IncidentResponse(BaseModel):
    id: str
    incident_number: str
    title: str
    summary: Optional[str] = None
    status: str
    severity: str
    affected_services: List[str] = []
    detection_method: str
    start_time: datetime
    updated_time: datetime
    resolved_time: Optional[datetime] = None
    candidates: List[CandidateResponse] = []

    class Config:
        from_attributes = True

# Diagnostic Request & Response
class RCARequest(BaseModel):
    incident_id: Optional[str] = None
    target_service_id: Optional[str] = None
    lookback_minutes: int = 15
    method: str = "dependency_aware" # static_rules, telemetry_only, dependency_aware

class RCAResponse(BaseModel):
    timestamp: datetime
    method_used: str
    incident_id: Optional[str] = None
    ranked_candidates: List[CandidateResponse]
    uncertainty_note: str
    telemetry_window_minutes: int

# Remediation & Safety
class RemediationRequest(BaseModel):
    incident_id: str
    runbook_id: Optional[str] = None
    action_type: str # RESTART_SERVICE, SCALE_SERVICE, ROLLBACK_DEPLOYMENT
    target_service_id: str
    parameters: Dict[str, Any] = {}
    justification: str = "Autonomous or operator mitigation request"
    is_dry_run: bool = True

class RemediationApprovalResponse(BaseModel):
    id: str
    incident_id: str
    action_type: str
    target_service_id: str
    parameters: Dict[str, Any]
    risk_level: str
    requested_by: str
    status: str
    justification: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class RemediationExecutionResponse(BaseModel):
    id: str
    approval_id: str
    incident_id: str
    action_type: str
    target_service_id: str
    parameters: Dict[str, Any]
    is_dry_run: bool
    status: str
    execution_logs: List[str]
    executed_at: datetime
    completed_at: datetime

    class Config:
        from_attributes = True

# Recovery Verification
class VerificationResponse(BaseModel):
    id: str
    execution_id: str
    incident_id: str
    service_id: str
    verification_window_seconds: int
    pre_action_health: Dict[str, Any]
    post_action_health: Dict[str, Any]
    recovery_status: str
    criteria_met: Dict[str, Any]
    duration_seconds: float
    checked_at: datetime

    class Config:
        from_attributes = True

# Evaluation Lab
class EvaluationRequest(BaseModel):
    dataset_name: str = "synthetic_fault_scenarios"
    methods: List[str] = ["static_rules", "telemetry_only", "dependency_aware"]

class EvaluationMetricResponse(BaseModel):
    method_name: str
    precision_at_1: float
    precision_at_3: float
    mean_reciprocal_rank: float
    detection_delay_sec: float
    diagnosis_latency_ms: float
    false_positive_rate: float
    scenario_details: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class EvaluationRunResponse(BaseModel):
    id: str
    name: str
    dataset_name: str
    timestamp: datetime
    total_scenarios: int
    evaluated_methods: List[str]
    metrics: List[EvaluationMetricResponse]

# Fault Injection Request
class FaultInjectionRequest(BaseModel):
    target_service_id: str
    fault_type: str # cpu_pressure, memory_leak, latency_spike, error_surge, dependency_failure, deployment_bug
    intensity: float = 1.0 # 0.1 to 2.0
    duration_seconds: int = 300
