# AEGIS-X Research Experiment Methodology

## Research Question

Does combining temporal telemetry features with service-dependency graph information improve root-cause ranking compared to static threshold and telemetry-only methods under noisy, cascading failure conditions?

## Evaluated Methods

1. **Static Threshold Rules (`static_rules`)**: Baseline evaluating static metric bounds (CPU > 85%, Error > 5%, p95 Latency > 300ms).
2. **Telemetry-Only Anomaly Detector (`telemetry_only`)**: Unsupervised rolling window Z-score calculation across telemetry channels.
3. **Proposed Method: Dependency-Aware Temporal Correlation (`dependency_aware`)**: Combines metric anomaly z-scores, NetworkX directed graph topology shortest-path distance, and deployment event timing.

## Evaluation Metrics

- **Precision@1**: Ratio of test scenarios where the true root-cause service is ranked #1.
- **Precision@3**: Ratio of test scenarios where true root cause is within top 3 candidates.
- **Mean Reciprocal Rank (MRR)**: Average of 1/rank for the true root cause across test scenarios.
- **Detection Delay (sec)**: Time delta between fault onset and alert trigger.
- **Diagnosis Latency (ms)**: Computation time taken to compute diagnosis.
- **False Positive Rate (FPR)**: Rate of false anomaly detections during steady-state normal operation.
