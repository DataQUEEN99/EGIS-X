from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class ServiceModel(Base):
    __tablename__ = "services"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    type = Column(String, nullable=False) # microservice, database, cache, gateway, message_queue
    tier = Column(String, default="backend") # frontend, api_gateway, backend, database, infrastructure
    status = Column(String, default="healthy") # healthy, degraded, critical, unknown
    owner = Column(String, default="sre-team")
    cpu_limit = Column(Float, default=100.0)
    memory_limit_mb = Column(Float, default=1024.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    outgoing_dependencies = relationship("ServiceDependencyModel", foreign_keys="[ServiceDependencyModel.source_service_id]", back_populates="source_service")
    incoming_dependencies = relationship("ServiceDependencyModel", foreign_keys="[ServiceDependencyModel.target_service_id]", back_populates="target_service")


class ServiceDependencyModel(Base):
    __tablename__ = "service_dependencies"

    id = Column(String, primary_key=True, default=generate_uuid)
    source_service_id = Column(String, ForeignKey("services.id"), nullable=False)
    target_service_id = Column(String, ForeignKey("services.id"), nullable=False)
    dependency_type = Column(String, default="sync_http") # sync_http, async_queue, db_connection, cache_lookup
    criticality = Column(String, default="high") # high, medium, low
    latency_budget_ms = Column(Float, default=100.0)
    is_inferred = Column(Boolean, default=False)
    
    source_service = relationship("ServiceModel", foreign_keys=[source_service_id], back_populates="outgoing_dependencies")
    target_service = relationship("ServiceModel", foreign_keys=[target_service_id], back_populates="incoming_dependencies")


class TelemetryObservationModel(Base):
    __tablename__ = "telemetry_observations"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_id = Column(String, ForeignKey("services.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    throughput_rps = Column(Float, default=0.0)
    error_rate_pct = Column(Float, default=0.0)
    latency_p50_ms = Column(Float, default=0.0)
    latency_p95_ms = Column(Float, default=0.0)
    latency_p99_ms = Column(Float, default=0.0)
    cpu_usage_pct = Column(Float, default=0.0)
    memory_usage_mb = Column(Float, default=0.0)
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
    source_type = Column(String, default="live") # live, demo, injected


class DeploymentEventModel(Base):
    __tablename__ = "deployment_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_id = Column(String, ForeignKey("services.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    version = Column(String, nullable=False)
    commit_hash = Column(String, nullable=False)
    deployed_by = Column(String, default="ci-cd-bot")
    status = Column(String, default="success") # success, rolled_back, failed
    description = Column(Text, nullable=True)


class AnomalyModel(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_id = Column(String, ForeignKey("services.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    metric_name = Column(String, nullable=False) # cpu_usage_pct, error_rate_pct, latency_p95_ms, etc.
    observed_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=False)
    z_score = Column(Float, default=0.0)
    severity = Column(String, default="medium") # low, medium, high, critical
    description = Column(Text, nullable=True)
    status = Column(String, default="active") # active, resolved, acknowledged


class IncidentModel(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=generate_uuid)
    incident_number = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    status = Column(String, default="active") # active, investigating, mitigating, resolved
    severity = Column(String, default="P2") # P1, P2, P3, P4
    affected_services = Column(JSON, default=list) # List of service IDs or names
    detection_method = Column(String, default="dependency_aware_rca")
    start_time = Column(DateTime, default=datetime.utcnow)
    updated_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_time = Column(DateTime, nullable=True)
    
    candidates = relationship("RootCauseCandidateModel", back_populates="incident", cascade="all, delete-orphan")
    approvals = relationship("RemediationApprovalModel", back_populates="incident")


class RootCauseCandidateModel(Base):
    __tablename__ = "root_cause_candidates"

    id = Column(String, primary_key=True, default=generate_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False, index=True)
    candidate_service_id = Column(String, ForeignKey("services.id"), nullable=False)
    rank = Column(Integer, nullable=False)
    confidence_score = Column(Float, nullable=False) # 0.0 to 1.0
    method_used = Column(String, nullable=False) # static_rules, telemetry_only, dependency_aware
    evidence_summary = Column(JSON, default=dict)
    uncertainty_explanation = Column(Text, nullable=True)
    
    incident = relationship("IncidentModel", back_populates="candidates")
    evidence_items = relationship("DiagnosticEvidenceModel", back_populates="candidate", cascade="all, delete-orphan")


class DiagnosticEvidenceModel(Base):
    __tablename__ = "diagnostic_evidence"

    id = Column(String, primary_key=True, default=generate_uuid)
    candidate_id = Column(String, ForeignKey("root_cause_candidates.id"), nullable=False, index=True)
    evidence_type = Column(String, nullable=False) # metric_anomaly, topology_propagation, deployment_correlation, latency_spike
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    supporting = Column(Boolean, default=True) # True = supports candidate, False = contradicts candidate
    metric_data = Column(JSON, default=dict)
    
    candidate = relationship("RootCauseCandidateModel", back_populates="evidence_items")


class RunbookModel(Base):
    __tablename__ = "runbooks"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    target_service_type = Column(String, nullable=False) # microservice, database, cache, any
    action_type = Column(String, nullable=False) # RESTART_SERVICE, SCALE_SERVICE, ROLLBACK_DEPLOYMENT
    default_parameters = Column(JSON, default=dict)
    risk_level = Column(String, default="MEDIUM") # LOW, MEDIUM, HIGH
    blast_radius = Column(String, default="SINGLE_POD") # SINGLE_POD, SERVICE_WIDE, REGIONAL


class RemediationApprovalModel(Base):
    __tablename__ = "remediation_approvals"

    id = Column(String, primary_key=True, default=generate_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False, index=True)
    runbook_id = Column(String, ForeignKey("runbooks.id"), nullable=True)
    action_type = Column(String, nullable=False)
    target_service_id = Column(String, ForeignKey("services.id"), nullable=False)
    parameters = Column(JSON, default=dict)
    risk_level = Column(String, default="MEDIUM")
    requested_by = Column(String, default="aegis_ai_agent")
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    justification = Column(Text, nullable=True)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("IncidentModel", back_populates="approvals")
    execution = relationship("RemediationExecutionModel", back_populates="approval", uselist=False)


class RemediationExecutionModel(Base):
    __tablename__ = "remediation_executions"

    id = Column(String, primary_key=True, default=generate_uuid)
    approval_id = Column(String, ForeignKey("remediation_approvals.id"), nullable=False, unique=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False, index=True)
    action_type = Column(String, nullable=False)
    target_service_id = Column(String, ForeignKey("services.id"), nullable=False)
    parameters = Column(JSON, default=dict)
    is_dry_run = Column(Boolean, default=True)
    status = Column(String, default="SUCCESS") # IN_PROGRESS, SUCCESS, FAILED
    execution_logs = Column(JSON, default=list)
    executed_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, default=datetime.utcnow)

    approval = relationship("RemediationApprovalModel", back_populates="execution")
    verification = relationship("RecoveryVerificationModel", back_populates="execution", uselist=False)


class RecoveryVerificationModel(Base):
    __tablename__ = "recovery_verifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    execution_id = Column(String, ForeignKey("remediation_executions.id"), nullable=False, unique=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False, index=True)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    verification_window_seconds = Column(Integer, default=30)
    pre_action_health = Column(JSON, default=dict)
    post_action_health = Column(JSON, default=dict)
    recovery_status = Column(String, default="RECOVERED") # RECOVERED, PARTIALLY_RECOVERED, FAILED, INCONCLUSIVE
    criteria_met = Column(JSON, default=dict)
    duration_seconds = Column(Float, default=5.0)
    checked_at = Column(DateTime, default=datetime.utcnow)

    execution = relationship("RemediationExecutionModel", back_populates="verification")


class EvaluationRunModel(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    dataset_name = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    total_scenarios = Column(Integer, default=0)
    evaluated_methods = Column(JSON, default=list)
    results_summary = Column(JSON, default=dict)


class EvaluationMetricModel(Base):
    __tablename__ = "evaluation_metrics"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("evaluation_runs.id"), nullable=False, index=True)
    method_name = Column(String, nullable=False)
    precision_at_1 = Column(Float, default=0.0)
    precision_at_3 = Column(Float, default=0.0)
    mean_reciprocal_rank = Column(Float, default=0.0)
    detection_delay_sec = Column(Float, default=0.0)
    diagnosis_latency_ms = Column(Float, default=0.0)
    false_positive_rate = Column(Float, default=0.0)
    scenario_details = Column(JSON, default=list)


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    details = Column(JSON, default=dict)
    ip_address = Column(String, default="127.0.0.1")
