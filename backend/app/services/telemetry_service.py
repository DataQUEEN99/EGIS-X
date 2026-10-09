import random
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import (
    ServiceModel, ServiceDependencyModel, TelemetryObservationModel,
    AnomalyModel, IncidentModel, DeploymentEventModel
)

DEFAULT_SERVICES = [
    {"name": "api-gateway", "display_name": "API Gateway", "type": "gateway", "tier": "api_gateway"},
    {"name": "auth-service", "display_name": "Auth Service", "type": "microservice", "tier": "backend"},
    {"name": "checkout-service", "display_name": "Checkout Service", "type": "microservice", "tier": "backend"},
    {"name": "payment-gateway", "display_name": "Payment Gateway Integration", "type": "microservice", "tier": "backend"},
    {"name": "inventory-api", "display_name": "Inventory Management API", "type": "microservice", "tier": "backend"},
    {"name": "user-db", "display_name": "User PostgreSQL DB", "type": "database", "tier": "database"},
    {"name": "redis-cache", "display_name": "Distributed Redis Cache", "type": "cache", "tier": "infrastructure"}
]

DEFAULT_DEPENDENCIES = [
    ("api-gateway", "auth-service", "sync_http", "high"),
    ("api-gateway", "checkout-service", "sync_http", "critical"),
    ("api-gateway", "inventory-api", "sync_http", "medium"),
    ("checkout-service", "payment-gateway", "sync_http", "critical"),
    ("checkout-service", "inventory-api", "sync_http", "high"),
    ("checkout-service", "redis-cache", "cache_lookup", "medium"),
    ("auth-service", "user-db", "db_connection", "critical"),
    ("auth-service", "redis-cache", "cache_lookup", "high"),
    ("inventory-api", "user-db", "db_connection", "high"),
]

# Active active faults state in-memory
_ACTIVE_FAULTS: Dict[str, Dict[str, Any]] = {}

def get_active_faults() -> Dict[str, Dict[str, Any]]:
    return _ACTIVE_FAULTS

def inject_fault(service_id: str, fault_type: str, intensity: float = 1.0, duration_seconds: int = 300):
    _ACTIVE_FAULTS[service_id] = {
        "fault_type": fault_type,
        "intensity": intensity,
        "started_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(seconds=duration_seconds)
    }

def clear_faults(service_id: str = None):
    if service_id:
        _ACTIVE_FAULTS.pop(service_id, None)
    else:
        _ACTIVE_FAULTS.clear()

def seed_initial_topology_if_empty(db: Session):
    existing = db.query(ServiceModel).first()
    if existing:
        return
    
    service_map = {}
    for svc in DEFAULT_SERVICES:
        model = ServiceModel(
            name=svc["name"],
            display_name=svc["display_name"],
            type=svc["type"],
            tier=svc["tier"],
            status="healthy"
        )
        db.add(model)
        db.flush()
        service_map[svc["name"]] = model.id
        
    for src_name, tgt_name, dep_type, crit in DEFAULT_DEPENDENCIES:
        dep = ServiceDependencyModel(
            source_service_id=service_map[src_name],
            target_service_id=service_map[tgt_name],
            dependency_type=dep_type,
            criticality=crit
        )
        db.add(dep)
        
    # Seed a baseline deployment event
    payment_svc = service_map.get("payment-gateway")
    if payment_svc:
        deploy = DeploymentEventModel(
            service_id=payment_svc,
            timestamp=datetime.utcnow() - timedelta(minutes=12),
            version="v2.4.1-patch",
            commit_hash="8f3a92b",
            deployed_by="ci-cd-pipeline",
            status="success",
            description="Upstream SDK version bump to v2.4.1"
        )
        db.add(deploy)

    db.commit()

def generate_telemetry_snapshot(db: Session, force_time: datetime = None) -> List[TelemetryObservationModel]:
    seed_initial_topology_if_empty(db)
    now = force_time or datetime.utcnow()
    services = db.query(ServiceModel).all()
    observations = []

    # Clean expired faults
    expired = [s_id for s_id, f in _ACTIVE_FAULTS.items() if f["expires_at"] < now]
    for s_id in expired:
        _ACTIVE_FAULTS.pop(s_id, None)

    for svc in services:
        fault = _ACTIVE_FAULTS.get(svc.id)
        
        # Base healthy values
        base_rps = 120.0 if svc.type == "gateway" else 60.0
        base_error = 0.2
        base_p50 = 15.0
        base_p95 = 45.0
        base_p99 = 90.0
        base_cpu = 35.0
        base_mem = 420.0

        # Small noise
        noise = random.uniform(-0.1, 0.1)
        
        # Modify by fault type if active
        is_anomaly = False
        anomaly_score = 0.0
        
        if fault:
            f_type = fault["fault_type"]
            intens = fault["intensity"]
            is_anomaly = True
            
            if f_type == "cpu_pressure":
                base_cpu = min(99.0, 80.0 + (18.0 * intens) + random.uniform(-2, 2))
                base_p95 += 150.0 * intens
                base_p99 += 350.0 * intens
                anomaly_score = 3.8 * intens
                svc.status = "degraded"
            elif f_type == "memory_leak":
                base_mem = min(1024.0, 850.0 + (120.0 * intens) + random.uniform(-10, 10))
                base_cpu += 20.0
                base_error = 4.5 * intens
                anomaly_score = 4.2 * intens
                svc.status = "critical"
            elif f_type == "latency_spike":
                base_p50 += 200.0 * intens
                base_p95 += 850.0 * intens
                base_p99 += 1800.0 * intens
                base_error += 2.0
                anomaly_score = 4.5 * intens
                svc.status = "degraded"
            elif f_type == "error_surge":
                base_error = min(50.0, 12.0 + (18.0 * intens) + random.uniform(-1, 3))
                base_p95 += 100.0
                anomaly_score = 5.0 * intens
                svc.status = "critical"
            elif f_type == "dependency_failure":
                base_error = 25.0 * intens
                base_p95 += 400.0
                anomaly_score = 4.8 * intens
                svc.status = "critical"
            elif f_type == "deployment_bug":
                base_error = 18.5 * intens
                base_p95 += 320.0
                anomaly_score = 4.6 * intens
                svc.status = "critical"
        else:
            svc.status = "healthy"

        obs = TelemetryObservationModel(
            service_id=svc.id,
            timestamp=now,
            throughput_rps=round(max(5.0, base_rps * (1 + noise)), 1),
            error_rate_pct=round(max(0.0, base_error * (1 + noise)), 2),
            latency_p50_ms=round(max(2.0, base_p50 * (1 + noise)), 1),
            latency_p95_ms=round(max(5.0, base_p95 * (1 + noise)), 1),
            latency_p99_ms=round(max(10.0, base_p99 * (1 + noise)), 1),
            cpu_usage_pct=round(min(100.0, max(5.0, base_cpu * (1 + noise))), 1),
            memory_usage_mb=round(max(50.0, base_mem * (1 + noise)), 1),
            is_anomaly=is_anomaly,
            anomaly_score=round(anomaly_score, 2),
            source_type="injected" if fault else "live"
        )
        db.add(obs)
        observations.append(obs)

        # Record Anomaly object if threshold broken
        if is_anomaly:
            anom = AnomalyModel(
                service_id=svc.id,
                timestamp=now,
                metric_name="cpu_usage_pct" if fault["fault_type"] == "cpu_pressure" else ("error_rate_pct" if "error" in fault["fault_type"] else "latency_p95_ms"),
                observed_value=obs.cpu_usage_pct if fault["fault_type"] == "cpu_pressure" else (obs.error_rate_pct if "error" in fault["fault_type"] else obs.latency_p95_ms),
                baseline_value=35.0 if fault["fault_type"] == "cpu_pressure" else (0.2 if "error" in fault["fault_type"] else 45.0),
                z_score=round(anomaly_score, 2),
                severity="critical" if obs.error_rate_pct > 10.0 or obs.cpu_usage_pct > 90 else "high",
                description=f"Anomaly detected: {fault['fault_type']} in {svc.display_name}",
                status="active"
            )
            db.add(anom)

    db.commit()
    return observations
