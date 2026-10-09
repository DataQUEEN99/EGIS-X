import React from 'react';
import { ShieldAlert, Activity, Cpu, Server, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { SystemHealth, OperationsSummary } from '../types';

interface NavbarProps {
  health: SystemHealth | null;
  summary: OperationsSummary | null;
  selectedService: string;
  onSelectService: (service: string) => void;
  services: { id: string; display_name: string }[];
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  summary,
  selectedService,
  onSelectService,
  services,
  onRefresh
}) => {
  const isHealthy = summary?.overall_health === 'healthy';
  const isCritical = summary?.overall_health === 'critical';

  return (
    <header className="h-16 bg-[#0f172a] border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-white tracking-wider">AEGIS-X</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
              v1.0.0-MVP
            </span>
          </div>
          <p className="text-xs text-slate-400">Cloud Failure Intelligence & Autonomous Recovery</p>
        </div>
      </div>

      {/* Global Controls & Status */}
      <div className="flex items-center space-x-4">
        {/* Global Service Scope Selector */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
          <Server className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Scope:</span>
          <select
            value={selectedService}
            onChange={(e) => onSelectService(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900">All Microservices (7)</option>
            {services.map(s => (
              <option key={s.id} value={s.id} className="bg-slate-900">{s.display_name}</option>
            ))}
          </select>
        </div>

        {/* Environment Badge */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs text-slate-300 font-mono font-medium">LIVE TELEMETRY</span>
        </div>

        {/* System Overall Health Badge */}
        <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
          isHealthy
            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
            : isCritical
            ? 'bg-red-950/60 text-red-400 border-red-800/60 animate-pulse'
            : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
        }`}>
          {isHealthy && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {isCritical && <XCircle className="w-4 h-4 text-red-400" />}
          {!isHealthy && !isCritical && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          <span>SYSTEM {summary?.overall_health.toUpperCase() || 'HEALTHY'}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Refresh Telemetry Snapshot"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
