import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Gauge } from 'lucide-react';
import { RecoveryVerification as VerificationType } from '../types';
import { api } from '../api/client';

export const RecoveryVerification: React.FC = () => {
  const [verifications, setVerifications] = useState<VerificationType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const data = await api.getVerifications();
      setVerifications(data);
    } catch (err) {
      console.error('Failed to load verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Recovery Verification Engine</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              POST-REMEDIATION HEALTH
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Observe post-intervention telemetry metrics across verification windows. Command execution is NOT equated with recovery.
          </p>
        </div>

        <button
          onClick={fetchVerifications}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Verifications</span>
        </button>
      </div>

      {/* Safety Principle Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start space-x-3">
        <Gauge className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">Verification Boundary Rule</span>
          Command completion indicates execution succeeded, not that service health has recovered. AEGIS-X monitors error rates and latency across a 30-second verification window before marking incidents resolved.
        </div>
      </div>

      {/* Verifications List */}
      <div className="space-y-4">
        {verifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs rounded-xl bg-[#111827] border border-slate-800">
            No recovery verifications executed yet. Trigger a remediation execution to perform verification.
          </div>
        ) : (
          verifications.map(v => {
            const isRecovered = v.recovery_status === 'RECOVERED';
            const isFailed = v.recovery_status === 'FAILED';
            const isInconclusive = v.recovery_status === 'INCONCLUSIVE';

            return (
              <div key={v.id} className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center space-x-1.5 ${
                      isRecovered ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      isFailed ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {isRecovered && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                      {isInconclusive && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{v.recovery_status}</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Service ID: <strong className="text-slate-200">{v.service_id}</strong>
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    Checked at: {new Date(v.checked_at).toLocaleString()} | Window: {v.verification_window_seconds}s
                  </span>
                </div>

                {/* Pre vs Post Health Metric Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Pre Action Health */}
                  <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-slate-400 font-semibold block border-b border-slate-800 pb-1">
                      Pre-Action Baseline Health
                    </span>
                    <div className="flex justify-between text-slate-300">
                      <span>Status:</span>
                      <span className="text-amber-400">{v.pre_action_health.status || 'degraded'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Error Rate:</span>
                      <span className="text-red-400">{v.pre_action_health.error_rate_pct}%</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>p95 Latency:</span>
                      <span>{v.pre_action_health.latency_p95_ms} ms</span>
                    </div>
                  </div>

                  {/* Post Action Health */}
                  <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-slate-400 font-semibold block border-b border-slate-800 pb-1">
                      Post-Action Observed Health
                    </span>
                    <div className="flex justify-between text-slate-300">
                      <span>Status:</span>
                      <span className="text-emerald-400">{v.post_action_health.status || 'healthy'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Error Rate:</span>
                      <span className="text-emerald-400">{v.post_action_health.error_rate_pct}%</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>p95 Latency:</span>
                      <span className="text-emerald-400">{v.post_action_health.latency_p95_ms} ms</span>
                    </div>
                  </div>
                </div>

                {/* Recovery Criteria Checklist */}
                <div className="pt-2">
                  <span className="text-xs font-semibold text-slate-400 block mb-2">
                    Recovery Evaluation Criteria
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(v.criteria_met).map(([crit, met]) => (
                      <div key={crit} className={`p-2 rounded border flex items-center justify-between font-mono ${
                        met ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'
                      }`}>
                        <span>{crit.replace(/_/g, ' ')}</span>
                        {met ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
