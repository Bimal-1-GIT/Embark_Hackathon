import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono font-semibold">{entry.value?.toFixed(1)} MW</span>
        </p>
      ))}
    </div>
  );
}

export default function ForecastChart({ forecast }) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <p className="text-slate-400 text-sm">Loading forecast data...</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = forecast.map((d, i) => {
    const date = new Date(d.timestamp);
    const hours = date.getHours ? date.getHours() : d.hour;
    const label = i % 6 === 0
      ? `${String(hours).padStart(2, '0')}:00 (+${d.hour_offset}h)`
      : '';
    return {
      name: label,
      fullLabel: `Hour +${d.hour_offset} (${String(hours).padStart(2, '0')}:00)`,
      demand: d.demand_mw,
      hydro: d.hydro_supply_mw,
      import: d.import_cushion_mw,
      surplus: d.surplus_deficit_mw > 0 ? d.surplus_deficit_mw : 0,
      deficit: d.surplus_deficit_mw < 0 ? Math.abs(d.surplus_deficit_mw) : 0,
    };
  });

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            72-Hour Forecast / ७२ घण्टाको पूर्वानुमान
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Demand vs Hydro Supply vs Import Cushion
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded bg-red-500" />
            <span className="text-slate-400">Deficit / घाटा</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded bg-blue-500" />
            <span className="text-slate-400">Surplus / अधिशेष</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="hydroGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="importGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v) => `${v}`}
              label={{
                value: 'MW',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#64748b', fontSize: 11 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
            />
            <Area
              type="monotone"
              dataKey="demand"
              stroke="#ef4444"
              fill="url(#demandGrad)"
              strokeWidth={2}
              name="Demand (MW)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="hydro"
              stroke="#3b82f6"
              fill="url(#hydroGrad)"
              strokeWidth={2}
              name="Hydro Supply (MW)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="import"
              stroke="#eab308"
              fill="url(#importGrad)"
              strokeWidth={1.5}
              name="Import Cushion (MW)"
              dot={false}
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
