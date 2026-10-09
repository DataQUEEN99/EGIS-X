import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.diagnostics.rca_engine import DiagnosticRCAEngine
from app.services.remediation_service import SafeRemediationEngine
from app.evaluation.benchmark_lab import RCABenchmarkLab

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "version" in data
    assert data["safe_mode_enabled"] is True

def test_services_and_graph_endpoints():
    res_svc = client.get("/api/v1/services")
    assert res_svc.status_code == 200
    services = res_svc.json()
    assert len(services) > 0

    res_graph = client.get("/api/v1/services/graph")
    assert res_graph.status_code == 200
    graph = res_graph.json()
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) > 0

def test_telemetry_summary_and_anomalies():
    res = client.get("/api/v1/telemetry/metrics/summary")
    assert res.status_code == 200
    summary = res.json()
    assert "request_throughput_rps" in summary
    assert "avg_cpu_pct" in summary
    assert "latency_p95_ms" in summary

def test_fault_injection_and_clear():
    # Inject CPU fault into auth-service
    services_res = client.get("/api/v1/services")
    auth_svc = [s for s in services_res.json() if s["name"] == "auth-service"][0]
    
    inject_res = client.post("/api/v1/telemetry/fault-injection/inject", json={
        "target_service_id": auth_svc["id"],
        "fault_type": "cpu_pressure",
        "intensity": 1.2,
        "duration_seconds": 60
    })
    assert inject_res.status_code == 200
    assert inject_res.json()["status"] == "fault_injected"

    # Clear fault
    clear_res = client.post("/api/v1/telemetry/fault-injection/clear")
    assert clear_res.status_code == 200

def test_rca_engine_baselines_and_proposed():
    db = SessionLocal()
    try:
        rca = DiagnosticRCAEngine(db)
        
        # Test static rules baseline
        static_cand = rca.run_static_rules_baseline()
        assert isinstance(static_cand, list)

        # Test telemetry only baseline
        telemetry_cand = rca.run_telemetry_only_baseline()
        assert isinstance(telemetry_cand, list)

        # Test proposed dependency-aware method
        dep_cand = rca.run_dependency_aware_rca()
        assert isinstance(dep_cand, list)
        if dep_cand:
            assert "confidence_score" in dep_cand[0]
            assert "evidence_items" in dep_cand[0]
    finally:
        db.close()

def test_safe_remediation_policy():
    db = SessionLocal()
    try:
        engine = SafeRemediationEngine(db)
        services_res = client.get("/api/v1/services").json()
        target_svc_id = services_res[0]["id"]

        # High risk action requires human approval
        approval = engine.create_remediation_request(
            incident_id="inc-test-1",
            action_type="ROLLBACK_DEPLOYMENT",
            target_service_id=target_svc_id,
            parameters={}
        )
        assert approval.status == "PENDING"
        assert approval.risk_level == "HIGH"

        # Low risk action auto-approved
        approval_low = engine.create_remediation_request(
            incident_id="inc-test-2",
            action_type="RESTART_SERVICE",
            target_service_id=target_svc_id,
            parameters={}
        )
        assert approval_low.status == "APPROVED"
        assert approval_low.risk_level == "LOW"

        # Execute dry-run remediation
        execution = engine.execute_remediation(approval_low.id, is_dry_run=True)
        assert execution.status == "SUCCESS"
        assert execution.is_dry_run is True
    finally:
        db.close()

def test_evaluation_lab_metrics():
    db = SessionLocal()
    try:
        lab = RCABenchmarkLab(db)
        run_record = lab.run_evaluation()
        assert run_record.total_scenarios > 0
        
        metrics_res = client.get(f"/api/v1/evaluation/export/csv?run_id={run_record.id}")
        assert metrics_res.status_code == 200
        assert "Precision@1" in metrics_res.text
    finally:
        db.close()
