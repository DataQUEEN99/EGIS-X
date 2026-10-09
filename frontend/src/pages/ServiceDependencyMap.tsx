import React, { useState, useMemo } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, Node, Edge, Position, MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphData, Service } from '../types';
import { Server, Activity, ArrowRight, ShieldAlert, Cpu, HardDrive } from 'lucide-react';

interface ServiceDependencyMapProps {
  graph: GraphData | null;
  services: Service[];
}

export const ServiceDependencyMap: React.FC<ServiceDependencyMapProps> = ({
  graph,
  services
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Map graph backend nodes to ReactFlow nodes
  const nodes: Node[] = useMemo(() => {
    if (!graph) return [];
    
    // Auto layout grid coordinates for microservice topology
    const positions: Record<string, { x: number; y: number }> = {
      'api-gateway': { x: 250, y: 50 },
      'auth-service': { x: 80, y: 200 },
      'checkout-service': { x: 420, y: 200 },
      'inventory-api': { x: 600, y: 350 },
      'payment-gateway': { x: 350, y: 380 },
      'redis-cache': { x: 80, y: 380 },
      'user-db': { x: 250, y: 500 },
    };

    return graph.nodes.map(n => {
      const pos = positions[n.name] || { x: Math.random() * 500, y: Math.random() * 400 };
      const isDegraded = n.status === 'degraded';
      const isCritical = n.status === 'critical';

      return {
        id: n.id,
        position: pos,
        data: {
          label: (
            <div className={`p-3 rounded-xl border text-left min-w-[180px] shadow-lg transition ${
              isCritical
                ? 'bg-red-950/80 border-red-500 text-red-100 ring-2 ring-red-500/50'
                : isDegraded
                ? 'bg-amber-950/80 border-amber-500 text-amber-100'
                : 'bg-slate-900/90 border-slate-700 text-slate-100 hover:border-cyan-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {n.type}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  isCritical ? 'bg-red-500 animate-ping' : isDegraded ? 'bg-amber-500' : 'bg-emerald-400'
                }`} />
              </div>
              <div className="font-bold text-xs">{n.display_name}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                <span>Tier: {n.tier}</span>
                <span className="capitalize">{n.status}</span>
              </div>
            </div>
          )
        },
        style: { background: 'transparent', border: 'none', padding: 0 }
      };
    });
  }, [graph]);

  // Map graph edges to ReactFlow edges
  const edges: Edge[] = useMemo(() => {
    if (!graph) return [];
    return graph.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.criticality === 'critical',
      style: {
        stroke: e.criticality === 'critical' ? '#ef4444' : (e.criticality === 'high' ? '#06b6d4' : '#64748b'),
        strokeWidth: e.criticality === 'critical' ? 2.5 : 1.5
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.criticality === 'critical' ? '#ef4444' : '#06b6d4'
      }
    }));
  }, [graph]);

  const selectedService = services.find(s => s.id === selectedNodeId);

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Service Dependency Topology Map</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              REACT FLOW GRAPH
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive microservice dependency graph showing directional dependencies, status states, and incident propagation channels.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 bg-[#111827] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Healthy</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Degraded</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Critical Incident</span>
          </div>
        </div>
      </div>

      {/* Main Graph & Side Inspector Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* ReactFlow Canvas */}
        <div className="lg:col-span-3 rounded-xl bg-[#111827] border border-slate-800 overflow-hidden relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
          >
            <Background color="#1f2937" gap={16} />
            <Controls className="bg-slate-900 border-slate-800 text-white fill-white" />
            <MiniMap nodeColor={(node) => '#1f2937'} maskColor="rgba(15, 23, 42, 0.7)" />
          </ReactFlow>
        </div>

        {/* Selected Service Inspector Panel */}
        <div className="rounded-xl bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between overflow-y-auto">
          {selectedService ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {selectedService.type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedService.status === 'healthy' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {selectedService.status}
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">{selectedService.display_name}</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {selectedService.id}</p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1 font-semibold">Tier Architecture</span>
                  <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-200 font-mono block">
                    {selectedService.tier}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1 font-semibold">Allocated Limits</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center space-x-2">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{selectedService.cpu_limit}% CPU</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center space-x-2">
                      <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                      <span>{selectedService.memory_limit_mb} MB RAM</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1 font-semibold">Owner &amp; Governance</span>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-300">
                    {selectedService.owner}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
              <Server className="w-8 h-8 mb-2 opacity-50" />
              <span>Click any node in the topology graph to inspect service metadata and dependency state.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
