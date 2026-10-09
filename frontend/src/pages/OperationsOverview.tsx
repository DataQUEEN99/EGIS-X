import React, { useState } from 'react';
import {
  Activity, AlertOctagon, Cpu, HardDrive, Zap, Gauge, Flame, CheckCircle, RefreshCw, AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { OperationsSummary, TelemetryObservation, Anomaly, Service } from '../types';

interface OperationsOverviewProps {
  summary: OperationsSummary | null;
  observations: TelemetryObservation[];
  anomalies: Anomaly[];
  services: Service[];
  onInjectFault: (serviceId: string, faultType: string, intensity: number) => void;
  onClearFaults: () => void;
  onRefresh: () => void;
}

export const OperationsOverview: React.FC<OperationsOverviewProps> = ({
  summary,
  observations,
  anomalies,
  services,
  onInjectFault,
  onClearFaults,
  onRefresh
}) => {
  const [selectedFaultSvc, setSelectedFaultSvc] = useState<string>(services[0]?.id || '');
  const [selectedFaultType, setSelectedFaultType] = useState<string>('cpu_pressure');
  const [intensity, setIntensity] = useState<number>(1.0);

  // Prepare time-series chart data from observations
  const chartData = observations.slice(0, 30).reverse().map(obs => ({
    time: new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    throughput: obs.throughput_rps,
    error_rate: obs.error_rate_pct,
    latency_p95: obs.latency_p95_ms,
    cpu: obs.cpu_usage_pct,
    memory: obs.memory_usage_mb
  }));

  const activeFaultsList = summary ? Object.entries(summary.active_faults) : [];

  return (
    <div className="space-[#1e293b] space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Operations Command Center</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              REAL-TIME OBSERVABILITY
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Collecting multi-service telemetry, monitoring SLA baselines, and tracking automated recovery status.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Throughput Card */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Throughput</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {summary?.request_throughput_rps ?? 0} <span className="text-xs font-normal text-slate-400">RPS</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">Nominal Traffic Load</div>
        </div>

        {/* Error Rate Card */}
        <div className={`p-4 rounded-xl bg-[#111827] border space-y-2 ${
          (summary?.avg_error_rate_pct ?? 0) > 5.0 ? 'border-red-800/80 bg-red-950/20' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg Error Rate</span>
            <AlertOctagon className={`w-4 h-4 ${(summary?.avg_error_rate_pct ?? 0) > 5.0 ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${(summary?.avg_error_rate_pct ?? 0) > 5.0 ? 'text-red-400' : 'text-white'}`}>
            {summary?.avg_error_rate_pct ?? 0}%
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            SLA Threshold: &lt; 1.0%
          </div>
        </div>

        {/* p95 Latency Card */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">p95 Latency</span>
            <Gauge className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {summary?.latency_p95_ms ?? 0} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            p50: {summary?.latency_p50_ms ?? 0}ms | p99: {summary?.latency_p99_ms ?? 0}ms
          </div>
        </div>

        {/* CPU Utilization */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg CPU Load</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {summary?.avg_cpu_pct ?? 0}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.min(100, summary?.avg_cpu_pct ?? 0)}%` }}></div>
          </div>
        </div>

        {/* Memory Load */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg Memory</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {summary?.avg_memory_mb ?? 0} <span className="text-xs font-normal text-slate-400">MB</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, ((summary?.avg_memory_mb ?? 0) / 1024) * 100)}%` }}></div>
          </div>
        </div>

        {/* Active Services Count */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Services Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {summary?.healthy_services ?? 0} / {summary?.total_services ?? 0}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {summary?.degraded_services ?? 0} Degraded / Critical
          </div>
        </div>
      </div>

      {/* Fault Injection Interactive Sandbox Control */}
      <div className="p-5 rounded-xl bg-[#111827] border border-amber-900/50 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white tracking-wide">Interactive Fault Scenario Simulator</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
              DEMO CONTROL
            </span>
          </div>
          {activeFaultsList.length > 0 && (
            <button
              onClick={onClearFaults}
              className="px-3 py-1.5 rounded-lg bg-red-950 text-red-400 border border-red-800 text-xs font-semibold hover:bg-red-900 transition"
            >
              Clear All Active Faults ({activeFaultsList.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Target Microservice</label>
            <select
              value={selectedFaultSvc}
              onChange={(e) => setSelectedFaultSvc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none"
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.display_name} ({s.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Synthetic Fault Scenario</label>
            <select
              value={selectedFaultType}
              onChange={(e) => setSelectedFaultType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none"
            >
              <option value="cpu_pressure">CPU Pressure Spike (&gt; 95%)</option>
              <option value="memory_leak">Memory Leak (&gt; 900MB)</option>
              <option value="latency_spike">Artificial Network Delay (+850ms)</option>
              <option value="error_surge">Upstream Error Surge (&gt; 25%)</option>
              <option value="dependency_failure">DB Connection Exhaustion</option>
              <option value="deployment_bug">Deployment Regression Bug</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Intensity ({intensity}x)</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <button
            onClick={() => onInjectFault(selectedFaultSvc, selectedFaultType, intensity)}
            className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg shadow transition"
          >
            Inject Fault Scenario
          </button>
        </div>
      </div>

      {/* Telemetry Visualizations (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Rate & Latency Chart */}
        <div className="p-5 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Error Rate &amp; p95 Latency Over Time</h3>
            <span className="text-xs text-slate-400 font-mono">Live Window (30s)</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="error_rate" name="Error Rate (%)" stroke="#ef4444" fillOpacity={1} fill="url(#errorGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU & Memory Utilization Chart */}
        <div className="p-5 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">CPU (%) &amp; Memory (MB) Utilization</h3>
            <span className="text-xs text-slate-400 font-mono">Rolling Baseline</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="#06b6d4" fillOpacity={1} fill="url(#cpuGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Active Anomalies Feed */}
      <div className="p-5 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Active Anomaly Alerts ({anomalies.length})</span>
        </h3>

        {anomalies.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
            No active anomalies detected across microservice endpoints.
          </div>
        ) : (
          <div className="space-y-2">
            {anomalies.slice(0, 5).map(anom => (
              <div key={anom.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    anom.severity === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {anom.severity.toUpperCase()}
                  </span>
                  <span className="font-semibold text-slate-200">{anom.service_name}</span>
                  <span className="text-slate-400">{anom.description}</span>
                </div>
                <div className="font-mono text-slate-400 text-[11px]">
                  Observed: <span className="text-cyan-400 font-bold">{anom.observed_value}</span> (Z-Score: {anom.z_score})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
