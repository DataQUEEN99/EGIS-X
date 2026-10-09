import React from 'react';
import {
  LayoutDashboard, GitFork, AlertOctagon, BrainCircuit,
  FlaskConical, ShieldCheck, Activity, Settings
} from 'lucide-react';

export type PageId =
  | 'operations'
  | 'dependency-map'
  | 'incidents'
  | 'rca-diagnostics'
  | 'research-lab'
  | 'safe-remediation'
  | 'recovery-verification'
  | 'settings';

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  activeIncidentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  activeIncidentCount
}) => {
  const menuItems: { id: PageId; label: string; icon: React.FC<any>; badge?: number }[] = [
    { id: 'operations', label: 'Operations Overview', icon: LayoutDashboard },
    { id: 'dependency-map', label: 'Service Dependency Map', icon: GitFork },
    { id: 'incidents', label: 'Incident Intelligence', icon: AlertOctagon, badge: activeIncidentCount },
    { id: 'rca-diagnostics', label: 'AI Root Cause Analysis', icon: BrainCircuit },
    { id: 'research-lab', label: 'Research & Evaluation Lab', icon: FlaskConical },
    { id: 'safe-remediation', label: 'Safe Remediation Center', icon: ShieldCheck },
    { id: 'recovery-verification', label: 'Recovery Verification', icon: Activity },
    { id: 'settings', label: 'Settings & System Health', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div className="py-6 px-3 space-y-1">
        <div className="px-3 pb-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Navigation Control</p>
        </div>

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Safety Mode Banner in Footer */}
      <div className="p-4 m-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
        <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>SAFE MODE ACTIVE</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Dry-run mode default. High risk actions require explicit approval.
        </p>
      </div>
    </aside>
  );
};
