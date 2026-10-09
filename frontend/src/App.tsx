import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { OperationsOverview } from './pages/OperationsOverview';
import { ServiceDependencyMap } from './pages/ServiceDependencyMap';
import { IncidentIntelligence } from './pages/IncidentIntelligence';
import { DiagnosticsRCA } from './pages/DiagnosticsRCA';
import { ResearchLab } from './pages/ResearchLab';
import { SafeRemediation } from './pages/SafeRemediation';
import { RecoveryVerification } from './pages/RecoveryVerification';
import { Settings } from './pages/Settings';
import {
  SystemHealth, OperationsSummary, Service, TelemetryObservation, Anomaly, Incident, GraphData
} from './types';
import { api } from './api/client';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('operations');
  const [selectedServiceScope, setSelectedServiceScope] = useState<string>('ALL');

  // Backend state
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [observations, setObservations] = useState<TelemetryObservation[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const fetchAllData = async () => {
    try {
      const [hData, sData, svcsData, gData, obsData, anomData, incData] = await Promise.all([
        api.getHealth(),
        api.getSummary(),
        api.getServices(),
        api.getGraph(),
        api.getObservations(selectedServiceScope === 'ALL' ? undefined : selectedServiceScope),
        api.getAnomalies(),
        api.getIncidents()
      ]);

      setHealth(hData);
      setSummary(sData);
      setServices(svcsData);
      setGraph(gData);
      setObservations(obsData);
      setAnomalies(anomData);
      setIncidents(incData);

      if (incData.length > 0 && !selectedIncident) {
        setSelectedIncident(incData[0]);
      }
    } catch (err) {
      console.error('Failed to sync backend state:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(fetchAllData, 6000);
    return () => clearInterval(timer);
  }, [selectedServiceScope]);

  const handleInjectFault = async (serviceId: string, faultType: string, intensity: number) => {
    try {
      await api.injectFault(serviceId, faultType, intensity);
      fetchAllData();
    } catch (err) {
      console.error('Fault injection failed:', err);
    }
  };

  const handleClearFaults = async () => {
    try {
      await api.clearFaults();
      fetchAllData();
    } catch (err) {
      console.error('Fault clearing failed:', err);
    }
  };

  const handleRequestRemediation = async (incidentId: string, actionType: string, targetServiceId: string) => {
    try {
      await api.requestRemediation(incidentId, actionType, targetServiceId);
      setActivePage('safe-remediation');
    } catch (err) {
      console.error('Remediation request failed:', err);
    }
  };

  const activeIncidentCount = incidents.filter(i => i.status === 'active' || i.status === 'investigating').length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        health={health}
        summary={summary}
        selectedService={selectedServiceScope}
        onSelectService={setSelectedServiceScope}
        services={services}
        onRefresh={fetchAllData}
      />

      {/* Body Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          activeIncidentCount={activeIncidentCount}
        />

        {/* Page Renderer */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activePage === 'operations' && (
            <OperationsOverview
              summary={summary}
              observations={observations}
              anomalies={anomalies}
              services={services}
              onInjectFault={handleInjectFault}
              onClearFaults={handleClearFaults}
              onRefresh={fetchAllData}
            />
          )}

          {activePage === 'dependency-map' && (
            <ServiceDependencyMap
              graph={graph}
              services={services}
            />
          )}

          {activePage === 'incidents' && (
            <IncidentIntelligence
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
              onRequestRemediation={handleRequestRemediation}
            />
          )}

          {activePage === 'rca-diagnostics' && (
            <DiagnosticsRCA
              services={services}
            />
          )}

          {activePage === 'research-lab' && (
            <ResearchLab />
          )}

          {activePage === 'safe-remediation' && (
            <SafeRemediation />
          )}

          {activePage === 'recovery-verification' && (
            <RecoveryVerification />
          )}

          {activePage === 'settings' && (
            <Settings />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
