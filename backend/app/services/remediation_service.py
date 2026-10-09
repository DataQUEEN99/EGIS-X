from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from app.models.models import (
    ServiceModel, IncidentModel, RunbookModel, RemediationApprovalModel,
    RemediationExecutionModel, RecoveryVerificationModel, AuditEventModel, TelemetryObservationModel
)
from app.core.config import settings
from app.services.telemetry_service import clear_faults, get_active_faults

DEFAULT_RUNBOOKS = [
    {
        "name": "Restart Isolated Service Pod",
        "description": "Performs rolling restart of isolated service instance to clear memory leak or deadlock.",
        "target_service_type": "microservice",
        "action_type": "RESTART_SERVICE",
        "default_parameters": {"grace_period_sec": 10},
        "risk_level": "LOW",
        "blast_radius": "SINGLE_POD"
    },
    {
        "name": "Scale Service Replicas",
        "description": "Scales horizontal pod autoscaler replicas up or down within safe boundaries.",
        "target_service_type": "microservice",
        "action_type": "SCALE_SERVICE",
        "default_parameters": {"target_replicas": 4, "max_replicas": 10},
        "risk_level": "MEDIUM",
        "blast_radius": "SERVICE_WIDE"
    },
    {
        "name": "Rollback Deployment to Known-Good Hash",
        "description": "Reverts service image deployment tag to previous release commit.",
        "target_service_type": "any",
        "action_type": "ROLLBACK_DEPLOYMENT",
        "default_parameters": {"target_version": "previous_stable"},
        "risk_level": "HIGH",
        "blast_radius": "SERVICE_WIDE"
    }
]

def seed_runbooks_if_empty(db: Session):
    if not db.query(RunbookModel).first():
        for r in DEFAULT_RUNBOOKS:
            rb = RunbookModel(**r)
            db.add(rb)
        db.commit()

class SafeRemediationEngine:
    def __init__(self, db: Session):
        self.db = db
        seed_runbooks_if_empty(db)

    def assess_risk_and_preconditions(
        self, action_type: str, service_id: str, parameters: Dict[str, Any]
    ) -> Tuple[str, List[str], bool]:
        svc = self.db.query(ServiceModel).filter(ServiceModel.id == service_id).first()
        if not svc:
            return "HIGH", ["Invalid target service ID"], False

        violations = []
        risk_level = "LOW"

        if action_type not in ["RESTART_SERVICE", "SCALE_SERVICE", "ROLLBACK_DEPLOYMENT"]:
            violations.append(f"Action type {action_type} is not in safe allowlist.")
            return "HIGH", violations, False

        if action_type == "SCALE_SERVICE":
            target_rep = parameters.get("target_replicas", 1)
            if target_rep > settings.MAX_SCALE_LIMIT:
                violations.append(f"Target replicas {target_rep} exceeds maximum safe limit ({settings.MAX_SCALE_LIMIT}).")
            risk_level = "MEDIUM"

        elif action_type == "ROLLBACK_DEPLOYMENT":
            risk_level = "HIGH"

        elif action_type == "RESTART_SERVICE":
            if svc.type == "database":
                risk_level = "HIGH"
                violations.append("Restarting primary database requires high-risk safety window.")
            else:
                risk_level = "LOW"

        is_allowed = len(violations) == 0
        return risk_level, violations, is_allowed

    def create_remediation_request(
        self, incident_id: str, action_type: str, target_service_id: str,
        parameters: Dict[str, Any], requested_by: str = "aegis_ai_agent", justification: str = "Root cause mitigation"
    ) -> RemediationApprovalModel:
        risk_level, violations, is_allowed = self.assess_risk_and_preconditions(action_type, target_service_id, parameters)
        
        # Determine approval status: LOW risk auto-approved if safe, HIGH risk requires human approval
        status = "APPROVED" if (risk_level == "LOW" and is_allowed) else "PENDING"
        
        approval = RemediationApprovalModel(
            incident_id=incident_id,
            action_type=action_type,
            target_service_id=target_service_id,
            parameters=parameters,
            risk_level=risk_level,
            requested_by=requested_by,
            status=status,
            justification=justification if is_allowed else f"REJECTED PRECONDITIONS: {'; '.join(violations)}",
            approved_by="auto_policy_engine" if status == "APPROVED" else None,
            approved_at=datetime.utcnow() if status == "APPROVED" else None
        )
        self.db.add(approval)
        self.db.commit()
        self.db.refresh(approval)

        # Audit event
        audit = AuditEventModel(
            actor=requested_by,
            action=f"REMEDIATION_REQUEST_{status}",
            resource=f"service:{target_service_id}",
            details={"action_type": action_type, "risk_level": risk_level, "violations": violations}
        )
        self.db.add(audit)
        self.db.commit()

        return approval

    def execute_remediation(self, approval_id: str, is_dry_run: bool = True, actor: str = "operator") -> RemediationExecutionModel:
        approval = self.db.query(RemediationApprovalModel).filter(RemediationApprovalModel.id == approval_id).first()
        if not approval:
            raise ValueError("Approval record not found.")

        if approval.status != "APPROVED":
            raise ValueError(f"Cannot execute remediation in state {approval.status}. Human approval required.")

        svc = self.db.query(ServiceModel).filter(ServiceModel.id == approval.target_service_id).first()

        logs = [
            f"[{datetime.utcnow().isoformat()}] Initiating remediation action: {approval.action_type}",
            f"[{datetime.utcnow().isoformat()}] Target service: {svc.display_name if svc else approval.target_service_id}",
            f"[{datetime.utcnow().isoformat()}] Mode: {'DRY RUN (Simulated)' if is_dry_run else 'ACTIVE SANDBOX EXECUTION'}",
            f"[{datetime.utcnow().isoformat()}] Risk Classification: {approval.risk_level}"
        ]

        if is_dry_run:
            logs.append(f"[{datetime.utcnow().isoformat()}] Dry Run Policy Check: Preconditions OK. No host modifications made.")
            status = "SUCCESS"
        else:
            # Active sandbox execution: clear faults for target service
            clear_faults(approval.target_service_id)
            if svc:
                svc.status = "healthy"
            logs.append(f"[{datetime.utcnow().isoformat()}] Sandbox Action Executed: Reset simulated fault state for {svc.display_name if svc else approval.target_service_id}.")
            logs.append(f"[{datetime.utcnow().isoformat()}] Health status set to healthy.")
            status = "SUCCESS"

        execution = RemediationExecutionModel(
            approval_id=approval.id,
            incident_id=approval.incident_id,
            action_type=approval.action_type,
            target_service_id=approval.target_service_id,
            parameters=approval.parameters,
            is_dry_run=is_dry_run,
            status=status,
            execution_logs=logs,
            executed_at=datetime.utcnow(),
            completed_at=datetime.utcnow()
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        # Audit execution
        audit = AuditEventModel(
            actor=actor,
            action="REMEDIATION_EXECUTION_COMPLETED",
            resource=f"execution:{execution.id}",
            details={"is_dry_run": is_dry_run, "status": status, "action_type": approval.action_type}
        )
        self.db.add(audit)
        self.db.commit()

        # Trigger Recovery Verification
        self.verify_recovery(execution.id)

        return execution

    def verify_recovery(self, execution_id: str) -> RecoveryVerificationModel:
        execution = self.db.query(RemediationExecutionModel).filter(RemediationExecutionModel.id == execution_id).first()
        if not execution:
            raise ValueError("Execution record not found")

        svc_id = execution.target_service_id
        svc = self.db.query(ServiceModel).filter(ServiceModel.id == svc_id).first()

        # Pre-action health snapshot (simulated baseline)
        pre_health = {
            "status": "degraded" if not execution.is_dry_run else "degraded",
            "error_rate_pct": 14.2 if not execution.is_dry_run else 12.0,
            "latency_p95_ms": 420.0,
            "cpu_usage_pct": 88.5
        }

        # Post-action health calculation
        post_obs = self.db.query(TelemetryObservationModel).filter(
            TelemetryObservationModel.service_id == svc_id
        ).order_by(TelemetryObservationModel.timestamp.desc()).first()

        post_health = {
            "status": svc.status if svc else "healthy",
            "error_rate_pct": post_obs.error_rate_pct if post_obs else 0.1,
            "latency_p95_ms": post_obs.latency_p95_ms if post_obs else 35.0,
            "cpu_usage_pct": post_obs.cpu_usage_pct if post_obs else 30.0
        }

        # Criteria check
        error_drop = pre_health["error_rate_pct"] - post_health["error_rate_pct"]
        latency_drop = pre_health["latency_p95_ms"] - post_health["latency_p95_ms"]

        criteria_met = {
            "error_rate_reduced": error_drop > 5.0 or post_health["error_rate_pct"] < 2.0,
            "latency_p95_normalized": post_health["latency_p95_ms"] < 150.0,
            "service_healthy": post_health["status"] == "healthy"
        }

        all_met = all(criteria_met.values())
        if execution.is_dry_run:
            rec_status = "INCONCLUSIVE" # Dry runs cannot prove runtime recovery
        elif all_met:
            rec_status = "RECOVERED"
        elif any(criteria_met.values()):
            rec_status = "PARTIALLY_RECOVERED"
        else:
            rec_status = "FAILED"

        # Resolve incident if RECOVERED
        if rec_status == "RECOVERED":
            inc = self.db.query(IncidentModel).filter(IncidentModel.id == execution.incident_id).first()
            if inc:
                inc.status = "resolved"
                inc.resolved_time = datetime.utcnow()

        verification = RecoveryVerificationModel(
            execution_id=execution.id,
            incident_id=execution.incident_id,
            service_id=svc_id,
            verification_window_seconds=settings.VERIFICATION_WINDOW_SECONDS,
            pre_action_health=pre_health,
            post_action_health=post_health,
            recovery_status=rec_status,
            criteria_met=criteria_met,
            duration_seconds=3.5,
            checked_at=datetime.utcnow()
        )
        self.db.add(verification)
        self.db.commit()
        self.db.refresh(verification)

        return verification
