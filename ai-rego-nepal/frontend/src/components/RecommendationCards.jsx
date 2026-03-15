import React from 'react';
import { formatMW, formatNPR } from '../utils/dataSimulator';

const priorityStyles = {
  high: {
    border: 'border-red-500/50',
    badge: 'bg-red-600 text-white',
    icon: '🔴',
  },
  medium: {
    border: 'border-yellow-500/50',
    badge: 'bg-yellow-600 text-black',
    icon: '🟡',
  },
  low: {
    border: 'border-green-500/50',
    badge: 'bg-green-600 text-white',
    icon: '🟢',
  },
};

export default function RecommendationCards({ recommendations, onRefresh }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">
          AI Recommendations / AI सिफारिसहरू
        </h3>
        <p className="text-xs text-slate-400">Loading recommendations...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            AI Recommendations / AI सिफारिसहरू
          </h3>
          <p className="text-[10px] text-slate-500">Auto-generated grid optimization actions</p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="divide-y divide-slate-700/50">
        {recommendations.map((rec, i) => {
          const style = priorityStyles[rec.priority] || priorityStyles.medium;
          return (
            <div
              key={i}
              className={`p-3 border-l-2 ${style.border} hover:bg-slate-750 transition-colors`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-medium text-slate-200 leading-tight">
                  {style.icon} {rec.title}
                </h4>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${style.badge}`}>
                  {rec.priority?.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-2">
                {rec.description}
              </p>

              <div className="flex flex-wrap gap-1 mb-2">
                {rec.zones_affected?.map((zone, j) => (
                  <span
                    key={j}
                    className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
                  >
                    {zone}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/50 rounded px-2 py-1.5">
                  <p className="text-[10px] text-slate-500">Relief</p>
                  <p className="text-xs font-mono text-green-400 font-semibold">
                    +{rec.mw_relief} MW
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded px-2 py-1.5">
                  <p className="text-[10px] text-slate-500">CO₂ Saved</p>
                  <p className="text-xs font-mono text-emerald-400 font-semibold">
                    {rec.co2_saved_tonnes}t
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded px-2 py-1.5">
                  <p className="text-[10px] text-slate-500">Savings</p>
                  <p className="text-xs font-mono text-amber-400 font-semibold">
                    {formatNPR(rec.estimated_npr_savings)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
