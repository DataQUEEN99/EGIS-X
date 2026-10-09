import React, { useState } from 'react';
import { BrainCircuit, Play, ShieldAlert, CheckCircle2, AlertTriangle, Cpu, Activity, Clock } from 'lucide-react';
import { RootCauseCandidate, Service } from '../types';
import { api } from '../api/client';

interface DiagnosticsRCAProps {
  services: Service[];
}

export const DiagnosticsRCA: React.FC<DiagnosticsRCAProps> = ({ services }) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('dependency_aware');
  const [lookbackMinutes, setLookbackMinutes] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);
  const [rcaResult, setRcaResult] = useState<{
    timestamp: string;
    method_used: string;
    ranked_candidates: RootCauseCandidate[];
    uncertainty_note: string;
    telemetry_window_minutes: number;
  } | null>(null);

  const handleRunRCA = async () => {
    setLoading(true);
    try {
      const data = await api.runRCA(selectedMethod, lookbackMinutes);
      setRcaResult(data);
    } catch (err) {
      console.error('RCA run failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>AI Root Cause Analysis Engine</span>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
            DIAGNOSTIC PIPELINE
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Execute multi-baseline diagnostic algorithms to isolate primary fault vectors across microservice dependencies and deployment events.
        </p>
      </div>

      {/* Control Configuration Panel */}
      <div className="p-5 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Diagnostic Algorithm Selection
            </label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none"
            >
              <option value="dependency_aware">Proposed: Dependency-Aware Temporal Correlation</option>
              <option value="telemetry_only">Baseline 2: Telemetry-Only Rolling Z-Score Detector</option>
              <option value="static_rules">Baseline 1: Static Threshold Violation Rules</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Telemetry Window Lookback
            </label>
            <select
              value={lookbackMinutes}
              onChange={(e) => setLookbackMinutes(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none"
            >
              <option value={15}>15 Minutes Lookback Window</option>
              <option value={30}>30 Minutes Lookback Window</option>
              <option value={60}>60 Minutes Lookback Window</option>
            </select>
          </div>

          <button
            onClick={handleRunRCA}
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>{loading ? 'Analyzing Diagnostics...' : 'Execute RCA Diagnosis'}</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Causality Safety Notice */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/50 flex items-start space-x-3 text-xs text-amber-200">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-300">Causality &amp; Uncertainty Framing</span>
          Correlation does not prove causation. AEGIS-X ranks candidates based on graph topological propagation, temporal metric z-scores, and deployment event proximity. Unresolved or ambiguous signals maintain lower confidence bounds.
        </div>
      </div>

      {/* RCA Results View */}
      {rcaResult && (
        <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>RCA Diagnostic Results</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                  {rcaResult.method_used}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Generated at {new Date(rcaResult.timestamp).toLocaleString()} | Lookback: {rcaResult.telemetry_window_minutes}m
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            Summary: {rcaResult.uncertainty_note}
          </div>

          {/* Candidates Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ranked Root-Cause Candidates ({rcaResult.ranked_candidates.length})
            </h3>

            <div className="space-y-3">
              {rcaResult.ranked_candidates.map(cand => (
                <div key={cand.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-sm font-bold flex items-center justify-center">
                        #{cand.rank}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white">{cand.candidate_service_name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">Method: {cand.method_used}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">Confidence Score</div>
                      <div className="text-base font-bold font-mono text-cyan-400">
                        {(cand.confidence_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Evidence Items */}
                  {cand.evidence_items && cand.evidence_items.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      {cand.evidence_items.map(ev => (
                        <div key={ev.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs flex items-start space-x-2">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${ev.supporting ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <div>
                            <span className="font-semibold text-slate-200">{ev.title}: </span>
                            <span className="text-slate-400">{ev.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
