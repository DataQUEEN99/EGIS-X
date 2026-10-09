# AEGIS-X: AI-Powered Cloud Failure Intelligence and Risk-Aware Autonomous Recovery

## Executive Architecture Summary

AEGIS-X is an enterprise-grade reliability engineering platform designed for SREs, cloud engineers, and platform teams. It combines distributed telemetry collection, real-time anomaly detection, dependency-aware root cause analysis (RCA), risk-assessed remediation policies, and post-action recovery verification.

```
                    +----------------------------------+
                    |        AEGIS-X Frontend          |
                    | React 18 + TS + Tailwind + Vite  |
                    |  Recharts + React Flow + Lucide  |
                    +----------------------------------+
                                     |
                                REST / JSON API
                                     v
+--------------------------------------------------------------------------+
|                            AEGIS-X Backend                               |
|                           Python + FastAPI                               |
|                                                                          |
|  +---------------------+   +---------------------+   +----------------+  |
|  |  Telemetry Pipeline |   | Anomaly Detector    |   | Service Topology| |
|  | Prometheus/Metrics  |-->| Z-Score / IQR       |-->| NetworkX Graph |  |
|  +---------------------+   +---------------------+   +----------------+  |
|                                                              |           |
|                                                              v           |
|  +--------------------------------------------------------------------+  |
|  |               Dependency-Aware RCA Diagnostic Engine               |  |
|  |   Ranked Root Cause Candidates + Confidence + Evidence Matrix       |  |
|  +--------------------------------------------------------------------+  |
|                                     |                                    |
|                                     v                                    |
|  +---------------------+   +---------------------+   +----------------+  |
|  | Safe Remediation    |   | Human Approval Gate |   | Recovery       |  |
|  | Sandbox Policy      |-->| (For High-Risk)     |-->| Verification   |  |
|  +---------------------+   +---------------------+   +----------------+  |
|                                                                          |
+--------------------------------------------------------------------------+
                                     |
                          SQLAlchemy ORM + SQLite / Postgres
                                     v
                        +--------------------------+
                        |  AEGIS-X Database        |
                        +--------------------------+
```

## System Components

1. **Telemetry Pipeline & Microservices Simulator**:
   - Ingests application and infrastructure telemetry (CPU, Memory, Throughput, Error Rate, Latency p50/p95/p99).
   - Provides realistic multi-service synthetic telemetry with controlled fault injection capabilities (CPU pressure, memory leak, network delay, error surge, dependency failure, deployment bug).

2. **Multi-Model Anomaly Detection Engine**:
   - Static Threshold Baseline: Hard boundary limits.
   - Telemetry-Only Baseline: Rolling window statistical z-score & IQR outlier detection.
   - Proposed Method: Dependency-Aware Temporal Correlation & Root Cause Ranking combining metric deviation z-scores, NetworkX topology graph shortest-path influence, and deployment event proximity.

3. **Safe Remediation & Policy Engine**:
   - Preconditions check, action allowlisting (`RESTART_SERVICE`, `SCALE_SERVICE`, `ROLLBACK_DEPLOYMENT`).
   - Risk classification (LOW, MEDIUM, HIGH), blast-radius limits.
   - Human approval requirement for HIGH risk actions.
   - Dry-run mode enabled by default. Immutable audit trail.

4. **Recovery Verification Engine**:
   - Captures pre-action baseline metrics.
   - Monitors post-remediation metrics over a verification window.
   - Calculates recovery outcome: `RECOVERED`, `PARTIALLY_RECOVERED`, `FAILED`, `INCONCLUSIVE`.

5. **Research & Evaluation Lab**:
   - Runs diagnostic methods against benchmark scenarios.
   - Calculates Precision@1, Precision@3, MRR, Detection Delay, Diagnosis Latency, False Positive Rate.
   - Supports exporting benchmark results as CSV/JSON.

6. **Web Dashboard**:
   - Operations Overview, Service Dependency Map (React Flow), Incident Intelligence, AI RCA Engine, Research Lab, Safe Remediation Center, Recovery Verification, Settings & System Health.
