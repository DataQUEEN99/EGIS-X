import numpy as np
import pandas as pd
import networkx as nx
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    ServiceModel, ServiceDependencyModel, TelemetryObservationModel,
    DeploymentEventModel, RootCauseCandidateModel, DiagnosticEvidenceModel, IncidentModel
)

class DiagnosticRCAEngine:
    def __init__(self, db: Session):
        self.db = db

    def build_topology_graph(self) -> nx.DiGraph:
        G = nx.DiGraph()
        services = self.db.query(ServiceModel).all()
        for svc in services:
            G.add_node(svc.id, name=svc.name, display_name=svc.display_name, type=svc.type)
            
        deps = self.db.query(ServiceDependencyModel).all()
        for dep in deps:
            # Directed edge from source to target (source depends on target)
            G.add_edge(dep.source_service_id, dep.target_service_id, weight=1.0, type=dep.dependency_type, criticality=dep.criticality)
        return G

    def get_telemetry_window_df(self, lookback_minutes: int = 15) -> pd.DataFrame:
        cutoff = datetime.utcnow() - timedelta(minutes=lookback_minutes)
        obs = self.db.query(TelemetryObservationModel).filter(TelemetryObservationModel.timestamp >= cutoff).all()
        
        if not obs:
            return pd.DataFrame()
            
        records = []
        for o in obs:
            records.append({
                "service_id": o.service_id,
                "timestamp": o.timestamp,
                "throughput_rps": o.throughput_rps,
                "error_rate_pct": o.error_rate_pct,
                "latency_p50_ms": o.latency_p50_ms,
                "latency_p95_ms": o.latency_p95_ms,
                "latency_p99_ms": o.latency_p99_ms,
                "cpu_usage_pct": o.cpu_usage_pct,
                "memory_usage_mb": o.memory_usage_mb,
                "is_anomaly": o.is_anomaly,
                "anomaly_score": o.anomaly_score
            })
        return pd.DataFrame(records)

    def run_static_rules_baseline(self, lookback_minutes: int = 15) -> List[Dict[str, Any]]:
        services = self.db.query(ServiceModel).all()
        df = self.get_telemetry_window_df(lookback_minutes)
        
        results = []
        for svc in services:
            svc_df = df[df["service_id"] == svc.id] if not df.empty else pd.DataFrame()
            broken_rules = []
            
            if not svc_df.empty:
                max_cpu = svc_df["cpu_usage_pct"].max()
                max_mem = svc_df["memory_usage_mb"].max()
                max_error = svc_df["error_rate_pct"].max()
                max_p95 = svc_df["latency_p95_ms"].max()
                
                if max_cpu > 85.0:
                    broken_rules.append(f"CPU Usage exceeded 85.0% threshold (Max: {max_cpu:.1f}%)")
                if max_mem > 900.0:
                    broken_rules.append(f"Memory Usage exceeded 900MB limit (Max: {max_mem:.1f}MB)")
                if max_error > 5.0:
                    broken_rules.append(f"Error Rate exceeded 5.0% threshold (Max: {max_error:.2f}%)")
                if max_p95 > 300.0:
                    broken_rules.append(f"p95 Latency exceeded 300ms SLA (Max: {max_p95:.1f}ms)")
                    
            score = len(broken_rules) / 4.0 # max 4 rules
            if score > 0:
                results.append({
                    "service_id": svc.id,
                    "service_name": svc.name,
                    "display_name": svc.display_name,
                    "score": round(score, 3),
                    "broken_rules": broken_rules,
                    "method": "static_rules"
                })
                
        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    def run_telemetry_only_baseline(self, lookback_minutes: int = 15) -> List[Dict[str, Any]]:
        services = self.db.query(ServiceModel).all()
        df = self.get_telemetry_window_df(lookback_minutes)
        
        if df.empty:
            return []

        results = []
        metrics = ["cpu_usage_pct", "memory_usage_mb", "error_rate_pct", "latency_p95_ms"]
        
        for svc in services:
            svc_df = df[df["service_id"] == svc.id]
            if svc_df.empty:
                continue
                
            max_z = 0.0
            metric_z_scores = {}
            
            for m in metrics:
                vals = svc_df[m].values
                mean_val = np.mean(vals)
                std_val = np.std(vals) or 1.0
                recent_val = vals[-1] if len(vals) > 0 else 0.0
                z = (recent_val - mean_val) / std_val
                if z > 0:
                    metric_z_scores[m] = float(z)
                    if z > max_z:
                        max_z = float(z)

            confidence = min(0.99, max_z / 5.0)
            if max_z > 1.2:
                results.append({
                    "service_id": svc.id,
                    "service_name": svc.name,
                    "display_name": svc.display_name,
                    "score": round(confidence, 3),
                    "max_z_score": round(max_z, 2),
                    "metric_z_scores": metric_z_scores,
                    "method": "telemetry_only"
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    def run_dependency_aware_rca(self, lookback_minutes: int = 15) -> List[Dict[str, Any]]:
        G = self.build_topology_graph()
        df = self.get_telemetry_window_df(lookback_minutes)
        services = self.db.query(ServiceModel).all()
        svc_dict = {s.id: s for s in services}
        
        if df.empty:
            return []

        # Find recent deployment events
        cutoff_deploy = datetime.utcnow() - timedelta(minutes=45)
        recent_deploys = self.db.query(DeploymentEventModel).filter(DeploymentEventModel.timestamp >= cutoff_deploy).all()
        deploy_map = {d.service_id: d for d in recent_deploys}

        candidates = []
        metrics = ["cpu_usage_pct", "memory_usage_mb", "error_rate_pct", "latency_p95_ms"]

        for svc in services:
            svc_df = df[df["service_id"] == svc.id]
            if svc_df.empty:
                continue
                
            # 1. Metric anomaly score
            anomaly_z_scores = {}
            for m in metrics:
                vals = svc_df[m].values
                mean_val = np.mean(vals)
                std_val = np.std(vals) or 1.0
                latest = vals[-1] if len(vals) > 0 else 0.0
                z = (latest - mean_val) / std_val
                if z > 1.0:
                    anomaly_z_scores[m] = float(z)

            raw_anomaly_score = max(anomaly_z_scores.values()) if anomaly_z_scores else 0.0

            # 2. Topology propagation score
            # Upstream services (e.g. database, downstream dependencies) that break first boost root cause score
            # Downstream consumers experiencing latency propagated from upstream get reduced root-cause score
            topology_boost = 0.0
            downstream_affected = 0
            
            # Check reachable downstream nodes in graph
            if svc.id in G:
                for target_node in G.nodes():
                    if target_node != svc.id and nx.has_path(G, target_node, svc.id):
                        # svc.id is UPSTREAM of target_node
                        target_df = df[df["service_id"] == target_node]
                        if not target_df.empty and target_df["error_rate_pct"].max() > 2.0:
                            downstream_affected += 1
                topology_boost = min(0.35, downstream_affected * 0.15)

            # 3. Deployment event correlation score
            deploy_boost = 0.0
            deploy_event = deploy_map.get(svc.id)
            if deploy_event:
                deploy_boost = 0.25

            # Combine score components
            anomaly_component = min(0.45, raw_anomaly_score / 6.0)
            composite_score = min(0.98, anomaly_component + topology_boost + deploy_boost)

            if composite_score > 0.15:
                # Construct explicit Evidence items
                evidence_items = []

                if anomaly_z_scores:
                    evidence_items.append({
                        "evidence_type": "metric_anomaly",
                        "title": f"Statistical Telemetry Deviation (z-score: {max(anomaly_z_scores.values()):.1f})",
                        "description": f"Significant deviation detected across: {', '.join(anomaly_z_scores.keys())}.",
                        "supporting": True,
                        "metric_data": anomaly_z_scores
                    })

                if downstream_affected > 0:
                    evidence_items.append({
                        "evidence_type": "topology_propagation",
                        "title": f"Upstream Dependency Cascading Effect ({downstream_affected} downstream service(s) impacted)",
                        "description": f"Service {svc.display_name} is upstream dependency for impacted downstream callers.",
                        "supporting": True,
                        "metric_data": {"impacted_downstream_count": downstream_affected}
                    })

                if deploy_event:
                    evidence_items.append({
                        "evidence_type": "deployment_correlation",
                        "title": f"Recent Deployment Event ({deploy_event.version})",
                        "description": f"Deployment commit {deploy_event.commit_hash} occurred at {deploy_event.timestamp.strftime('%H:%M:%S UTC')}.",
                        "supporting": True,
                        "metric_data": {"commit": deploy_event.commit_hash, "version": deploy_event.version}
                    })

                # Contradicting evidence check
                if svc.type == "gateway" and downstream_affected == 0:
                    evidence_items.append({
                        "evidence_type": "latency_spike",
                        "title": "API Gateway Symptom Only",
                        "description": "API Gateway error is likely secondary symptom of deeper backend dependency failure.",
                        "supporting": False,
                        "metric_data": {}
                    })

                uncertainty_note = "High confidence root cause diagnosis." if composite_score > 0.7 else (
                    "Moderate confidence; candidate is upstream dependency of failing service." if composite_score > 0.4 else
                    "Low confidence; observations may contain noise or concurrent background activity."
                )

                candidates.append({
                    "service_id": svc.id,
                    "service_name": svc.name,
                    "display_name": svc.display_name,
                    "confidence_score": round(composite_score, 3),
                    "rank": 0, # set after sorting
                    "method_used": "dependency_aware",
                    "evidence_items": evidence_items,
                    "evidence_summary": {
                        "anomaly_score": round(raw_anomaly_score, 2),
                        "downstream_impacted": downstream_affected,
                        "recent_deployment": bool(deploy_event)
                    },
                    "uncertainty_explanation": uncertainty_note
                })

        candidates.sort(key=lambda x: x["confidence_score"], reverse=True)
        for i, c in enumerate(candidates):
            c["rank"] = i + 1

        return candidates
