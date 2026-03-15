import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, ComposedChart, Line,
} from 'recharts';
import axios from 'axios';

const API_BASE = '/api';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  const seasonColors = {
    monsoon: 'text-blue-400',
    pre_monsoon: 'text-orange-400',
    post_monsoon: 'text-yellow-400',
    dry_winter: 'text-cyan-400',
  };
  const seasonLabels = {
    monsoon: 'Monsoon / बर्खा',
    pre_monsoon: 'Pre-Monsoon / प्रि-मनसुन',
    post_monsoon: 'Post-Monsoon / पोस्ट-मनसुन',
    dry_winter: 'Dry/Winter / जाडो',
  };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl max-w-xs">
      <p className="text-xs text-slate-300 font-semibold mb-1">{dataPoint?.date}</p>
      {dataPoint?.season && (
        <p className={`text-[10px] mb-1 ${seasonColors[dataPoint.season] || 'text-slate-400'}`}>
          {seasonLabels[dataPoint.season] || dataPoint.season}
          {dataPoint.type === 'prediction' && ' (ML Predicted)'}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono font-semibold">{entry.value?.toFixed(1)} MW</span>
        </p>
      ))}
    </div>
  );
}

function SeasonBand({ season }) {
  const colors = {
    monsoon: '#3b82f6',
    pre_monsoon: '#f97316',
    post_monsoon: '#eab308',
    dry_winter: '#06b6d4',
  };
  const labels = {
    monsoon: 'Monsoon',
    pre_monsoon: 'Pre-Monsoon',
    post_monsoon: 'Post-Monsoon',
    dry_winter: 'Winter',
  };
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: `${colors[season]}20`,
        color: colors[season],
        border: `1px solid ${colors[season]}40`,
      }}
    >
      {labels[season] || season}
    </span>
  );
}

export default function ForecastChart() {
  const [historicalData, setHistoricalData] = useState([]);
  const [predictionData, setPredictionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMetric, setActiveMetric] = useState('demand_supply');
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [histRes, predRes, infoRes] = await Promise.all([
          axios.get(`${API_BASE}/ml/historical`),
          axios.get(`${API_BASE}/ml/predict`),
          axios.get(`${API_BASE}/ml/model-info`),
        ]);
        setHistoricalData(histRes.data.data);
        setPredictionData(predRes.data.data);
        setModelInfo(infoRes.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch ML data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Training ML model & generating predictions...</p>
        </div>
        <p className="text-slate-500 text-xs mt-1">यन्त्र सिकाइ मोडेल तालिम दिँदै र भविष्यवाणी गर्दै...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-red-900">
        <p className="text-red-400 text-sm">Failed to load ML predictions: {error}</p>
        <p className="text-slate-500 text-xs mt-1">Ensure the backend is running with ML dependencies installed.</p>
      </div>
    );
  }

  // Combine historical + predictions for the chart
  const combinedData = [...historicalData, ...predictionData];

  // Label every ~30 days for X-axis, mark boundary
  const boundaryIndex = historicalData.length - 1;
  const boundaryLabel = historicalData.length > 0
    ? `→ ${historicalData[historicalData.length - 1].date.slice(0, 7)}`
    : null;
  const chartData = combinedData.map((d, i) => ({
    ...d,
    label: i === boundaryIndex
      ? boundaryLabel
      : i % 30 === 0
      ? d.date.slice(0, 7)
      : '',
  }));

  const metrics = {
    demand_supply: {
      label: 'Demand vs Supply / माग बनाम आपूर्ति',
      areas: [
        { key: 'demand_mw', name: 'Demand (MW)', stroke: '#ef4444', fill: 'demandGrad' },
        { key: 'supply_mw', name: 'Supply (MW)', stroke: '#3b82f6', fill: 'supplyGrad' },
      ],
    },
    hydro_solar: {
      label: 'Hydro & Solar / जलविद्युत र सौर्य',
      areas: [
        { key: 'hydro_mw', name: 'Hydro (MW)', stroke: '#06b6d4', fill: 'hydroGrad' },
        { key: 'solar_mw', name: 'Solar (MW)', stroke: '#eab308', fill: 'solarGrad' },
      ],
    },
    surplus: {
      label: 'Surplus/Deficit / अधिशेष-घाटा',
      areas: [
        { key: 'surplus_deficit_mw', name: 'Surplus/Deficit (MW)', stroke: '#10b981', fill: 'surplusGrad' },
      ],
    },
    utilization: {
      label: 'Utilization % / उपयोग',
      areas: [
        { key: 'utilization_pct', name: 'Utilization (%)', stroke: '#a855f7', fill: 'utilGrad' },
      ],
    },
  };

  const currentMetric = metrics[activeMetric];

  // Seasonal stats summary
  const seasonalStats = {};
  for (const d of predictionData) {
    if (!seasonalStats[d.season]) {
      seasonalStats[d.season] = { demand: [], supply: [], surplus: [] };
    }
    seasonalStats[d.season].demand.push(d.demand_mw);
    seasonalStats[d.season].supply.push(d.supply_mw);
    seasonalStats[d.season].surplus.push(d.surplus_deficit_mw);
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            ML Prediction — Historical + Forecast to Dec 2026
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            यन्त्र सिकाइ भविष्यवाणी — ऐतिहासिक + डिसेम्बर २०२६ सम्म पूर्वानुमान
            {modelInfo && (
              <span className="ml-2 text-blue-400">
                (RandomForest, {modelInfo.training_samples?.toLocaleString()} samples)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[9px]">
            <div className="w-6 h-0.5 bg-slate-400" />
            <span className="text-slate-400">Historical</span>
            <div className="w-6 h-0.5 bg-slate-400" style={{ borderTop: '2px dashed' }} />
            <span className="text-slate-400">Predicted</span>
          </div>
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex items-center gap-1 mb-3">
        {Object.entries(metrics).map(([key, m]) => (
          <button
            key={key}
            onClick={() => setActiveMetric(key)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              activeMetric === key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {m.label.split(' / ')[0]}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="hydroGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="surplusGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: activeMetric === 'utilization' ? '%' : 'MW',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#64748b', fontSize: 11 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />

            {/* Prediction boundary line */}
            {boundaryLabel && (
              <ReferenceLine
                x={boundaryLabel}
                stroke="#f59e0b"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={{
                  value: 'ML Prediction →',
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 10,
                }}
              />
            )}

            {currentMetric.areas.map((area) => (
              <Area
                key={area.key}
                type="monotone"
                dataKey={area.key}
                stroke={area.stroke}
                fill={`url(#${area.fill})`}
                strokeWidth={1.5}
                name={area.name}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Seasonal prediction summary cards */}
      {Object.keys(seasonalStats).length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Object.entries(seasonalStats).map(([season, stats]) => {
            const avgDemand = stats.demand.reduce((a, b) => a + b, 0) / stats.demand.length;
            const avgSupply = stats.supply.reduce((a, b) => a + b, 0) / stats.supply.length;
            const avgSurplus = stats.surplus.reduce((a, b) => a + b, 0) / stats.surplus.length;
            return (
              <div key={season} className="bg-slate-700/50 rounded-lg p-2 border border-slate-600">
                <div className="flex items-center justify-between mb-1">
                  <SeasonBand season={season} />
                  <span className="text-[9px] text-slate-500">Predicted</span>
                </div>
                <div className="space-y-0.5 text-[10px]">
                  <p className="text-slate-300">
                    Demand: <span className="font-mono text-red-400">{avgDemand.toFixed(0)} MW</span>
                  </p>
                  <p className="text-slate-300">
                    Supply: <span className="font-mono text-blue-400">{avgSupply.toFixed(0)} MW</span>
                  </p>
                  <p className="text-slate-300">
                    Balance: <span className={`font-mono ${avgSurplus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {avgSurplus > 0 ? '+' : ''}{avgSurplus.toFixed(0)} MW
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
