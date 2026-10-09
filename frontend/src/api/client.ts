import axios from 'axios';
import {
  Service, Dependency, GraphData, OperationsSummary, TelemetryObservation,
  Anomaly, Incident, Runbook, RemediationApproval, RemediationExecution,
  RecoveryVerification, EvaluationRun, SystemHealth
} from '../types';

const API_BASE = '/api/v1';

export const api = {
  // System Health
  getHealth: () => axios.get<SystemHealth>(`${API_BASE}/health`).then(res => res.data),

  // Services & Topology
  getServices: () => axios.get<Service[]>(`${API_BASE}/services`).then(res => res.data),
  getGraph: () => axios.get<GraphData>(`${API_BASE}/services/graph`).then(res => res.data),

  // Telemetry & Operations
  getSummary: () => axios.get<OperationsSummary>(`${API_BASE}/telemetry/metrics/summary`).then(res => res.data),
  getObservations: (serviceId?: string) => axios.get<TelemetryObservation[]>(`${API_BASE}/telemetry/observations`, { params: { service_id: serviceId } }).then(res => res.data),
  getAnomalies: () => axios.get<Anomaly[]>(`${API_BASE}/telemetry/anomalies`).then(res => res.data),
  triggerSnapshot: () => axios.post<TelemetryObservation[]>(`${API_BASE}/telemetry/snapshot`).then(res => res.data),
  injectFault: (target_service_id: string, fault_type: string, intensity: number = 1.0) => 
    axios.post(`${API_BASE}/telemetry/fault-injection/inject`, { target_service_id, fault_type, intensity, duration_seconds: 300 }).then(res => res.data),
  clearFaults: (service_id?: string) => axios.post(`${API_BASE}/telemetry/fault-injection/clear`, null, { params: { service_id } }).then(res => res.data),

  // Incidents & RCA Diagnostics
  getIncidents: (params?: { status?: string; severity?: string }) => axios.get<Incident[]>(`${API_BASE}/incidents`, { params }).then(res => res.data),
  getIncidentDetail: (id: string) => axios.get<Incident>(`${API_BASE}/incidents/${id}`).then(res => res.data),
  runRCA: (method: string, lookback_minutes: number = 15, target_service_id?: string) => 
    axios.post(`${API_BASE}/diagnostics/analyze`, { method, lookback_minutes, target_service_id }).then(res => res.data),

  // Safe Remediation
  getRunbooks: () => axios.get<Runbook[]>(`${API_BASE}/remediation/runbooks`).then(res => res.data),
  getApprovals: (status?: string) => axios.get<RemediationApproval[]>(`${API_BASE}/remediation/approvals`, { params: { status } }).then(res => res.data),
  requestRemediation: (incident_id: string, action_type: string, target_service_id: string, parameters: Record<string, any> = {}, is_dry_run: boolean = true) =>
    axios.post<RemediationApproval>(`${API_BASE}/remediation/request`, { incident_id, action_type, target_service_id, parameters, is_dry_run }).then(res => res.data),
  approveRemediation: (approval_id: string) => axios.post<RemediationApproval>(`${API_BASE}/remediation/approvals/${approval_id}/approve`).then(res => res.data),
  rejectRemediation: (approval_id: string) => axios.post<RemediationApproval>(`${API_BASE}/remediation/approvals/${approval_id}/reject`).then(res => res.data),
  executeRemediation: (approval_id: string, is_dry_run: boolean = true) =>
    axios.post<RemediationExecution>(`${API_BASE}/remediation/execute/${approval_id}?is_dry_run=${is_dry_run}`).then(res => res.data),
  getAuditLogs: () => axios.get(`${API_BASE}/remediation/audit-logs`).then(res => res.data),

  // Verification
  getVerifications: (incident_id?: string) => axios.get<RecoveryVerification[]>(`${API_BASE}/verification`, { params: { incident_id } }).then(res => res.data),

  // Research & Evaluation Lab
  getEvaluationHistory: () => axios.get<EvaluationRun[]>(`${API_BASE}/evaluation/history`).then(res => res.data),
  runBenchmark: (dataset_name: string = "rca_eval_sample.json", methods: string[] = ["static_rules", "telemetry_only", "dependency_aware"]) =>
    axios.post<EvaluationRun>(`${API_BASE}/evaluation/run`, { dataset_name, methods }).then(res => res.data),
  exportCsvUrl: () => `${API_BASE}/evaluation/export/csv`
};
