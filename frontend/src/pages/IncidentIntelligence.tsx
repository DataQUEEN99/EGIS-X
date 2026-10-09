import React, { useState } from 'react';
import {
  AlertOctagon, Filter, Search, CheckCircle2, ShieldAlert,
  ArrowRight, Activity, Clock, FileText, ChevronRight, Play
} from 'lucide-react';
import { Incident, RootCauseCandidate } from '../types';

interface IncidentIntelligenceProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
  onRequestRemediation: (incidentId: string, actionType: string, targetServiceId: string) => void;
}

export const IncidentIntelligence: React.FC<IncidentIntelligenceProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onRequestRemediation
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredIncidents = incidents.filter(inc => {
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    if (searchQuery && !inc.title.toLowerCase().includes(searchQuery.toLowerCase()) && !inc.incident_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeInc = selectedIncident || filteredIncidents[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Incident Intelligence &amp; Root Cause Analysis</span>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
            INVESTIGATION DESK
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Detailed incident diagnostic feed with AI candidate root-cause ranking, confidence scoring, and diagnostic evidence matrix.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by incident number or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - High</option>
              <option value="P3">P3 - Moderate</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incident Feed List */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Incidents Feed ({filteredIncidents.length})
          </h2>

          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-[#111827] border border-slate-800">
              No incidents matching active filters.
            </div>
          ) : (
            filteredIncidents.map(inc => {
              const isSelected = activeInc?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc)}
                  className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/30'
                      : 'bg-[#111827] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400">{inc.incident_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inc.severity === 'P1' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {inc.severity}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-white line-clamp-2">{inc.title}</h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                    <span className="capitalize">{inc.status}</span>
                    <span>{new Date(inc.start_time).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detailed Investigation Pane */}
        <div className="lg:col-span-8 space-y-6">
          {activeInc ? (
            <div className="space-y-6">
              {/* Header Info Box */}
              <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                        {activeInc.incident_number}
                      </span>
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        activeInc.severity === 'P1' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {activeInc.severity} SEVERITY
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Started: {new Date(activeInc.start_time).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{activeInc.title}</h2>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    activeInc.status === 'resolved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                  }`}>
                    {activeInc.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  {activeInc.summary}
                </p>

                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Affected Service Scope:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeInc.affected_services.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ranked Root Cause Candidates */}
              <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    <span>Ranked Root-Cause Candidates</span>
                  </span>
                  <span className="text-xs font-normal text-slate-400 font-mono">
                    Detection: {activeInc.detection_method}
                  </span>
                </h3>

                {activeInc.candidates.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                    No diagnostic candidates generated yet. Run on-demand RCA.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeInc.candidates.map(cand => (
                      <div key={cand.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-xs font-bold flex items-center justify-center">
                              #{cand.rank}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-white">{cand.candidate_service_name}</h4>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Algorithm: {cand.method_used}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-slate-400 font-medium">Confidence Score</div>
                            <div className="text-base font-bold font-mono text-cyan-400">
                              {(cand.confidence_score * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* Diagnostic Evidence Matrix */}
                        {cand.evidence_items && cand.evidence_items.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-800">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Diagnostic Evidence Matrix
                            </span>
                            <div className="space-y-1.5">
                              {cand.evidence_items.map(ev => (
                                <div key={ev.id} className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${
                                  ev.supporting
                                    ? 'bg-slate-950/60 border-slate-800 text-slate-200'
                                    : 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                                }`}>
                                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${ev.supporting ? 'text-emerald-400' : 'text-amber-400'}`} />
                                  <div>
                                    <div className="font-semibold text-slate-100">{ev.title}</div>
                                    <div className="text-[11px] text-slate-400">{ev.description}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Uncertainty Note */}
                        {cand.uncertainty_explanation && (
                          <div className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2.5 rounded border border-slate-800/80">
                            Note: {cand.uncertainty_explanation}
                          </div>
                        )}

                        {/* Action Trigger Button */}
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => onRequestRemediation(activeInc.id, 'RESTART_SERVICE', cand.candidate_service_id)}
                            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg transition"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Propose Sandbox Remediation Action</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs rounded-xl bg-[#111827] border border-slate-800">
              Select an incident from the feed to view full diagnostic evidence and root cause candidate rankings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
