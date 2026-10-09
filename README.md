# AEGIS-X

> **AI-Powered Cloud Failure Intelligence and Risk-Aware Autonomous Recovery**

AEGIS-X is an enterprise-grade reliability engineering platform built for SREs, DevOps engineers, and cloud platform teams. It automates telemetry collection, real-time statistical anomaly detection, dependency-aware root-cause ranking (RCA), risk-evaluated remediation policy enforcement, and post-action recovery verification.

---

## 🌟 Key Features

1. **Operations Command Center**: Live microservice telemetry monitoring (Throughput, Error Rate, p50/p95/p99 Latency, CPU & Memory utilization), real-time Recharts visualizations, and interactive fault scenario simulation.
2. **Service Dependency Topology Map**: Interactive React Flow topology graph rendering directed service dependencies, health status badges, and incident propagation channels.
3. **Incident Intelligence**: Unified incident investigation desk featuring ranked candidate root causes, confidence scores, and a structured diagnostic evidence matrix.
4. **AI Root Cause Analysis Engine**: Multi-baseline diagnostic engine implementing:
   - **Baseline 1**: Static Threshold Rules (`static_rules`)
   - **Baseline 2**: Telemetry-Only Rolling Z-Score Anomaly Detector (`telemetry_only`)
   - **Proposed Method**: Dependency-Aware Temporal Correlation & Root Cause Ranking (`dependency_aware`) combining metric Z-scores, NetworkX topology shortest paths, and deployment event timing.
5. **Research & Evaluation Lab**: Empirical benchmark lab evaluating diagnostic accuracy (`Precision@1`, `Precision@3`, `Mean Reciprocal Rank`, `Detection Delay`, `Diagnosis Latency`, `False Positive Rate`) with CSV export support.
6. **Safe Remediation Center**: Policy governance engine with preconditions check, allowlisted runbooks (`RESTART_SERVICE`, `SCALE_SERVICE`, `ROLLBACK_DEPLOYMENT`), risk classification, blast-radius restrictions, human approval requirement for HIGH-risk actions, dry-run simulation mode, and an immutable audit trail.
7. **Recovery Verification Engine**: Post-remediation health monitoring comparing pre-action baseline vs post-action observed metrics over verification windows.
8. **Settings & System Health**: Environment health monitoring, model status inspection, and zero-secret data safety enforcement.

---

## 🏗 System Architecture

```
+--------------------------------------------------------------------------+
|                            AEGIS-X Frontend                              |
|            React 18 + TypeScript + Vite + Tailwind CSS + Recharts        |
|                       React Flow + Lucide Icons                          |
+--------------------------------------------------------------------------+
                                     |
                          REST API / JSON (/api/v1)
                                     v
+--------------------------------------------------------------------------+
|                            AEGIS-X Backend                               |
|                           Python + FastAPI                               |
|                                                                          |
|  +---------------------+   +---------------------+   +----------------+  |
|  |  Telemetry Pipeline |   | Anomaly Detector    |   | Topology Graph |  |
|  | Multi-Service Stream|-->| Z-Score / IQR       |-->| NetworkX       |  |
|  +---------------------+   +---------------------+   +----------------+  |
|                                                              |           |
|                                                              v           |
|  +--------------------------------------------------------------------+  |
|  |               Dependency-Aware RCA Diagnostic Engine               |  |
|  +--------------------------------------------------------------------+  |
|                                     |                                    |
|                                     v                                    |
|  +---------------------+   +---------------------+   +----------------+  |
|  | Safe Remediation    |   | Human Approval Gate |   | Recovery       |  |
|  | Policy Engine       |-->| (High-Risk Actions) |-->| Verification   |  |
|  +---------------------+   +---------------------+   +----------------+  |
|                                                                          |
+--------------------------------------------------------------------------+
                                     |
                         SQLAlchemy ORM (SQLite / Postgres)
                                     v
                        +--------------------------+
                        |  AEGIS-X Database        |
                        +--------------------------+
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Run Backend Server & Test Suite

```bash
# Navigate to backend directory
cd backend

# Run backend automated pytest suite
python -m pytest tests/test_api.py -v

# Start FastAPI backend server
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

FastAPI interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Run Frontend Web Interface

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Run Vite development server
npm run dev -- --port 5173
```

Open `http://localhost:5173/` in your web browser.

---

## 🐳 Docker Compose Deployment

To build and run the complete stack in Docker:

```bash
cd infrastructure
docker-compose up --build -d
```

Services exposed:
- **Frontend Web UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Prometheus Telemetry**: `http://localhost:9090`

---

## 🛡 Security & Safety Governance

AEGIS-X enforces strict security boundaries:
1. **No Model Shell Execution**: The AI engine never executes arbitrary shell commands. Remediation is constrained to an allowlisted set of parameterized runbooks.
2. **Dry-Run by Default**: Actions operate in dry-run mode unless explicitly executed in active mode by an authorized operator.
3. **Human Approval Gate**: Actions categorized as `HIGH` risk (e.g. deployment rollbacks or primary database operations) require explicit human approval.
4. **Secret Isolation**: Secrets and environment credentials are loaded from environment variables and never exposed in responses or logs.

---

## 📄 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Threat Model & Safety Governance](docs/THREAT_MODEL.md)
- [Research & Experiment Methodology](docs/EXPERIMENT_METHODOLOGY.md)
- [Final Production Readiness Audit](docs/final-audit.md)
