import React, { useState, useEffect } from 'react';
import { ShieldCheck, Play, CheckCircle2, XCircle, AlertTriangle, FileText, Lock, RefreshCw } from 'lucide-react';
import { Runbook, RemediationApproval } from '../types';
import { api } from '../api/client';

export const SafeRemediation: React.FC = () => {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [approvals, setApprovals] = useState<RemediationApproval[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isDryRun, setIsDryRun] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [rData, aData, logData] = await Promise.all([
        api.getRunbooks(),
        api.getApprovals(),
        api.getAuditLogs()
      ]);
      setRunbooks(rData);
      setApprovals(aData);
      setAuditLogs(logData);
    } catch (err) {
      console.error('Failed to load remediation data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.approveRemediation(id);
      fetchData();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectRemediation(id);
      fetchData();
    } catch (err) {
      console.error('Rejection failed:', err);
    }
  };

  const handleExecute = async (approvalId: string) => {
    setLoading(true);
    try {
      await api.executeRemediation(approvalId, isDryRun);
      fetchData();
    } catch (err) {
      console.error('Execution failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Safe Remediation Center</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              POLICY GOVERNANCE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enforce precondition validation, blast-radius limits, dry-run simulations, and human approval gates for high-risk recovery runbooks.
          </p>
        </div>

        {/* Global Dry Run Mode Toggle */}
        <div className="flex items-center space-x-3 bg-[#111827] border border-slate-800 rounded-xl px-4 py-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">Dry-Run Simulation Mode:</span>
          <button
            onClick={() => setIsDryRun(!isDryRun)}
            className={`px-3 py-1 rounded font-mono text-xs font-bold transition ${
              isDryRun ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            {isDryRun ? 'ENABLED (DRY RUN)' : 'ACTIVE EXECUTION'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allowlisted Predefined Runbooks */}
        <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Allowlisted Sandbox Recovery Runbooks</span>
          </h2>

          <div className="space-y-3">
            {runbooks.map(rb => (
              <div key={rb.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{rb.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    rb.risk_level === 'HIGH' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {rb.risk_level} RISK
                  </span>
                </div>
                <p className="text-xs text-slate-400">{rb.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                  <span>Action: {rb.action_type}</span>
                  <span>Blast Radius: {rb.blast_radius}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending & Historical Remediation Approvals */}
        <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Remediation Approvals Queue ({approvals.length})</span>
            </h2>
            <button onClick={fetchData} className="p-1 rounded text-slate-400 hover:text-white">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {approvals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
              No pending remediation requests in approval queue.
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map(app => (
                <div key={app.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-cyan-400">{app.action_type}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      app.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      app.status === 'REJECTED' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    Target Service: <span className="font-mono text-cyan-300">{app.target_service_id}</span>
                  </div>

                  {app.justification && (
                    <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                      {app.justification}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end space-x-2 pt-2">
                    {app.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="px-3 py-1.5 rounded bg-red-950 text-red-400 border border-red-800 text-xs font-semibold hover:bg-red-900 transition"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => handleApprove(app.id)}
                          className="px-3 py-1.5 rounded bg-emerald-600 text-slate-950 text-xs font-bold hover:bg-emerald-500 transition"
                        >
                          Approve Action
                        </button>
                      </>
                    )}

                    {app.status === 'APPROVED' && (
                      <button
                        onClick={() => handleExecute(app.id)}
                        disabled={loading}
                        className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Execute {isDryRun ? '(Dry Run)' : 'Sandbox Action'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span>Immutable Governance Audit Trail</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Resource</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {auditLogs.slice(0, 10).map(log => (
                <tr key={log.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-2.5 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-bold text-cyan-400">{log.actor}</td>
                  <td className="px-4 py-2.5">{log.action}</td>
                  <td className="px-4 py-2.5 text-slate-300">{log.resource}</td>
                  <td className="px-4 py-2.5 text-slate-500">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
