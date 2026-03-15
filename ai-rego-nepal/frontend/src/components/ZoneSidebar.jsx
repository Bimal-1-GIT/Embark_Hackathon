import React from 'react';
import { getStatusColor, getStatusTextColor, formatMW } from '../utils/dataSimulator';

export default function ZoneSidebar({ zones, selectedZone, onSelectZone }) {
  if (!zones || zones.length === 0) {
    return (
      <div className="w-64 bg-slate-800 border-r border-slate-700 p-4">
        <p className="text-slate-400 text-sm">Loading zones...</p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Grid Zones
        </h2>
        <p className="text-xs text-slate-500 mt-1">ग्रिड क्षेत्रहरू</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {zones.map((zone) => {
          const isSelected = selectedZone?.id === zone.id;
          return (
            <button
              key={zone.id}
              onClick={() => onSelectZone(zone)}
              className={`w-full text-left px-4 py-3 border-b border-slate-700/50 transition-colors ${
                isSelected
                  ? 'bg-slate-700/80 border-l-2 border-l-crimson'
                  : 'hover:bg-slate-750 hover:bg-slate-700/40'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${getStatusColor(zone.status)}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {zone.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {zone.nepali_name}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs font-mono ${getStatusTextColor(zone.status)}`}>
                      {formatMW(zone.load_mw)}
                    </span>
                    <span className="text-xs text-slate-500">
                      / {zone.capacity_mw} MW
                    </span>
                  </div>
                  {/* Utilization bar */}
                  <div className="w-full h-1.5 bg-slate-600 rounded-full mt-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getStatusColor(zone.status)}`}
                      style={{ width: `${Math.min(100, zone.utilization_pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500">
                      {zone.utilization_pct}%
                    </span>
                    {zone.import_mw > 0 && (
                      <span className="text-[10px] text-yellow-400">
                        Import: {zone.import_mw} MW
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-slate-700 space-y-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Legend / संकेत</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-slate-400">Normal / सामान्य</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-[10px] text-slate-400">Elevated / बढेको</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-slate-400">Near Capacity / क्षमता नजिक</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] text-slate-400">Surplus / अधिशेष</span>
        </div>
      </div>
    </div>
  );
}
