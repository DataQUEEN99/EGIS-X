import React, { useState, useEffect } from 'react';
import { FlaskConical, Play, Download, CheckCircle, BarChart2, ShieldCheck, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { EvaluationRun, EvaluationMetric } from '../types';
import { api } from '../api/client';

export const ResearchLab: React.FC = () => {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchHistory = async () => {
    try {
      const data = await api.getEvaluationHistory();
      setRuns(data);
      if (data.length > 0 && !selectedRunId) {
        setSelectedRunId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch benchmark history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRunBenchmark = async () => {
    setLoading(true);
    try {
      const newRun = await api.runBenchmark('rca_eval_sample.json', ['static_rules', 'telemetry_only', 'dependency_aware']);
      await fetchHistory();
      setSelectedRunId(newRun.id);
    } catch (err) {
      console.error('Benchmark run failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeRun = runs.find(r => r.id === selectedRunId) || runs[0] || null;

  // Prepare chart data for Precision & MRR comparison
  const chartData = activeRun ? activeRun.metrics.map(m => ({
    method: m.method_name === 'dependency_aware' ? 'Proposed (Dep-Aware)' : (m.method_name === 'telemetry_only' ? 'Baseline 2 (Telemetry)' : 'Baseline 1 (Rules)'),
    precision_at_1: m.precision_at_1 * 100,
    precision_at_3: m.precision_at_3 * 100,
    mrr: m.mean_reciprocal_rank * 100,
    delay_sec: m.detection_delay_sec,
    latency_ms: m.diagnosis_latency_ms,
    fpr: m.false_positive_rate * 100
  })) : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Research &amp; Evaluation Lab</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              BENCHMARK METHODOLOGY
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical evaluation of RCA diagnostic accuracy, Precision@k, Mean Reciprocal Rank (MRR), and detection latency across benchmark datasets.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={api.exportCsvUrl()}
            download
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Results</span>
          </a>

          <button
            onClick={handleRunBenchmark}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{loading ? 'Evaluating...' : 'Run Benchmark Experiment'}</span>
          </button>
        </div>
      </div>

      {/* Experiment Run Selector & Metadata */}
      {activeRun && (
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400 font-medium">Evaluation Run:</span>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-1.5 focus:outline-none font-mono"
            >
              {runs.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({new Date(r.timestamp).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <span>Dataset: <strong className="text-cyan-400">{activeRun.dataset_name}</strong></span>
            <span>Total Scenarios: <strong className="text-white">{activeRun.total_scenarios}</strong></span>
          </div>
        </div>
      )}

      {/* Comparative Evaluation Metrics Table */}
      {activeRun && (
        <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span>Method Accuracy &amp; Performance Comparison</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Diagnostic Method</th>
                  <th className="px-4 py-3">Precision@1</th>
                  <th className="px-4 py-3">Precision@3</th>
                  <th className="px-4 py-3">MRR (Mean Reciprocal Rank)</th>
                  <th className="px-4 py-3">Detection Delay (sec)</th>
                  <th className="px-4 py-3">Diagnosis Latency (ms)</th>
                  <th className="px-4 py-3">False Positive Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {activeRun.metrics.map(m => {
                  const isProposed = m.method_name === 'dependency_aware';
                  return (
                    <tr key={m.method_name} className={isProposed ? 'bg-cyan-950/20 text-cyan-200 font-bold' : 'hover:bg-slate-900/50'}>
                      <td className="px-4 py-3 font-sans font-semibold flex items-center space-x-2">
                        <span>{m.method_name === 'dependency_aware' ? 'Proposed: Dependency-Aware' : (m.method_name === 'telemetry_only' ? 'Baseline 2: Telemetry-Only' : 'Baseline 1: Static Rules')}</span>
                        {isProposed && <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-900 text-cyan-300 border border-cyan-700">PROPOSED</span>}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-400">{(m.precision_at_1 * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3">{(m.precision_at_3 * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-cyan-400">{(m.mean_reciprocal_rank * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3">{m.detection_delay_sec}s</td>
                      <td className="px-4 py-3">{m.diagnosis_latency_ms}ms</td>
                      <td className="px-4 py-3 text-slate-400">{(m.false_positive_rate * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recharts Comparative Bar Chart */}
      {chartData.length > 0 && (
        <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">Precision@1, Precision@3 &amp; MRR (%) Comparative Bar Chart</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="method" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                <Bar dataKey="precision_at_1" name="Precision@1 (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="precision_at_3" name="Precision@3 (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mrr" name="MRR (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
