export interface Service {
  id: string;
  name: string;
  display_name: string;
  type: 'microservice' | 'database' | 'cache' | 'gateway' | 'message_queue';
  tier: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  owner: string;
  cpu_limit: number;
  memory_limit_mb: number;
  created_at: string;
  updated_at: string;
}

export interface Dependency {
  id: string;
  source_service_id: string;
  target_service_id: string;
  dependency_type: 'sync_http' | 'async_queue' | 'db_connection' | 'cache_lookup';
  criticality: 'high' | 'medium' | 'low';
  latency_budget_ms: number;
  is_inferred: boolean;
}

export interface GraphData {
  nodes: {
    id: string;
    name: string;
    display_name: string;
    type: string;
    tier: string;
    status: string;
    cpu_limit: number;
    memory_limit_mb: number;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    type: string;
    criticality: string;
    is_inferred: boolean;
  }[];
}

export interface OperationsSummary {
  overall_health: 'healthy' | 'degraded' | 'critical';
  total_services: number;
  healthy_services: number;
  degraded_services: number;
  request_throughput_rps: number;
  avg_error_rate_pct: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  avg_cpu_pct: number;
  avg_memory_mb: number;
  active_faults: Record<string, {
    fault_type: string;
    intensity: number;
    started_at: string;
    expires_at: string;
  }>;
}

export interface TelemetryObservation {
  id: string;
  service_id: string;
  timestamp: string;
  throughput_rps: number;
  error_rate_pct: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  cpu_usage_pct: number;
  memory_usage_mb: number;
  is_anomaly: boolean;
  anomaly_score: number;
  source_type: string;
}

export interface Anomaly {
  id: string;
  service_id: string;
  service_name?: string;
  timestamp: string;
  metric_name: string;
  observed_value: number;
  baseline_value: number;
  z_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  status: string;
}

export interface EvidenceItem {
  id: string;
  evidence_type: string;
  title: string;
  description: string;
  supporting: boolean;
  metric_data: Record<string, any>;
}

export interface RootCauseCandidate {
  id: string;
  candidate_service_id: string;
  candidate_service_name?: string;
  rank: number;
  confidence_score: number;
  method_used: string;
  evidence_summary: Record<string, any>;
  uncertainty_explanation?: string;
  evidence_items: EvidenceItem[];
}

export interface Incident {
  id: string;
  incident_number: string;
  title: string;
  summary?: string;
  status: 'active' | 'investigating' | 'mitigating' | 'resolved';
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  affected_services: string[];
  detection_method: string;
  start_time: string;
  updated_time: string;
  resolved_time?: string;
  candidates: RootCauseCandidate[];
}

export interface Runbook {
  id: string;
  name: string;
  description: string;
  target_service_type: string;
  action_type: string;
  default_parameters: Record<string, any>;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  blast_radius: string;
}

export interface RemediationApproval {
  id: string;
  incident_id: string;
  action_type: string;
  target_service_id: string;
  parameters: Record<string, any>;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  requested_by: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  justification?: string;
  created_at: string;
}

export interface RemediationExecution {
  id: string;
  approval_id: string;
  incident_id: string;
  action_type: string;
  target_service_id: string;
  parameters: Record<string, any>;
  is_dry_run: boolean;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  execution_logs: string[];
  executed_at: string;
  completed_at: string;
}

export interface RecoveryVerification {
  id: string;
  execution_id: string;
  incident_id: string;
  service_id: string;
  verification_window_seconds: number;
  pre_action_health: Record<string, any>;
  post_action_health: Record<string, any>;
  recovery_status: 'RECOVERED' | 'PARTIALLY_RECOVERED' | 'FAILED' | 'INCONCLUSIVE';
  criteria_met: Record<string, boolean>;
  duration_seconds: number;
  checked_at: string;
}

export interface EvaluationMetric {
  method_name: string;
  precision_at_1: number;
  precision_at_3: number;
  mean_reciprocal_rank: number;
  detection_delay_sec: number;
  diagnosis_latency_ms: number;
  false_positive_rate: number;
  scenario_details: {
    scenario_id: string;
    scenario_name: string;
    true_root_cause: string;
    top_ranked_candidate: string;
    true_rc_rank: number;
    reciprocal_rank: number;
    diagnosis_latency_ms: number;
  }[];
}

export interface EvaluationRun {
  id: string;
  name: string;
  dataset_name: string;
  timestamp: string;
  total_scenarios: number;
  evaluated_methods: string[];
  metrics: EvaluationMetric[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  version: string;
  environment: string;
  safe_mode_enabled: boolean;
  dry_run_default: boolean;
  database_connected: boolean;
  telemetry_collector_status: string;
  rca_engine_models: string[];
}
