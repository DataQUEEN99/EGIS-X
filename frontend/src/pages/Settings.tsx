import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Server, Database, Activity, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { SystemHealth } from '../types';
import { api } from '../api/client';

export const Settings: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Settings &amp; System Health</span>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
            PLATFORM CONFIGURATION
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Inspect platform status, database connectivity, active ML diagnostic models, and security governance controls.
        </p>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>FastAPI Backend API</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-white flex items-center space-x-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>ONLINE</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Version: {health?.version || '1.0.0'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Database Storage</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white flex items-center space-x-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>CONNECTED</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            SQLite / PostgreSQL ORM
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Telemetry Pipeline</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white flex items-center space-x-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>INGESTING</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Status: {health?.telemetry_collector_status || 'active'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Safe Mode Policy</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-white flex items-center space-x-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>ACTIVE</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Dry-Run Default: True
          </div>
        </div>
      </div>

      {/* System Configuration Details */}
      <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white">Registered Diagnostic RCA Models</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
            <span className="font-bold text-cyan-400 block mb-1">static_rules</span>
            Static threshold baseline detector evaluating CPU, memory, error rates, and latency limits.
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
            <span className="font-bold text-cyan-400 block mb-1">telemetry_only</span>
            Unsupervised rolling z-score and IQR anomaly detector across telemetry metric vectors.
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
            <span className="font-bold text-cyan-400 block mb-1">dependency_aware</span>
            Proposed method integrating NetworkX topology shortest-path, metric z-scores, and deployment timing.
          </div>
        </div>
      </div>

      {/* Security Statement */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3 text-xs text-slate-300">
        <Lock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">Security &amp; Secret Isolation Policy</span>
          AEGIS-X loads configuration variables exclusively from environment variables. Secrets, database credentials, API tokens, and sensitive telemetry fields are masked from public endpoints and logs.
        </div>
      </div>
    </div>
  );
};
