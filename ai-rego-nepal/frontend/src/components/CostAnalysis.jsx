import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import axios from 'axios';

const API_BASE = '/api';

const SEASON_COLORS = {
  monsoon: '#3b82f6',
  pre_monsoon: '#f97316',
  post_monsoon: '#eab308',
  dry_winter: '#06b6d4',
};

const SEASON_LABELS = {
  monsoon: 'Monsoon / बर्खा',
  pre_monsoon: 'Pre-Monsoon / प्रि-मनसुन',
  post_monsoon: 'Post-Monsoon / पोस्ट-मनसुन',
  dry_winter: 'Winter / जाडो',
};

const SEASON_LABELS_SHORT = {
  monsoon: 'Monsoon',
  pre_monsoon: 'Pre-Monsoon',
  post_monsoon: 'Post-Monsoon',
  dry_winter: 'Winter',
};

function formatNPR(value) {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

function CostTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl max-w-xs">
      <p className="text-xs text-slate-300 font-semibold mb-1">{data?.month || label}</p>
      {data?.season && (
        <p className="text-[10px] mb-1" style={{ color: SEASON_COLORS[data.season] }}>
          {SEASON_LABELS[data.season]}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono font-semibold">NPR {formatNPR(entry.value)}</span>
        </p>
      ))}
      {data?.net_cost_nrs !== undefined && (
        <p className={`text-xs mt-1 font-semibold ${data.net_cost_nrs > 0 ? 'text-red-400' : 'text-green-400'}`}>
          Net: <span className="font-mono">NPR {data.net_cost_nrs > 0 ? '-' : '+'}{formatNPR(Math.abs(data.net_cost_nrs))}</span>
        </p>
      )}
    </div>
  );
}

export default function CostAnalysis({ rainfallFactor = 1.0 }) {
  const [costData, setCostData] = useState(null);
  const [normalCostData, setNormalCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('monthly'); // monthly | seasonal

  // Fetch normal baseline on mount
  useEffect(() => {
    async function fetchBaseline() {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/ml/cost-analysis`);
        setNormalCostData(res.data);
        setCostData(res.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch cost analysis:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBaseline();
  }, []);

  // Re-fetch when rainfallFactor changes
  useEffect(() => {
    if (!normalCostData) return;
    if (Math.abs(rainfallFactor - 1.0) < 0.01) {
      setCostData(normalCostData);
      return;
    }
    async function fetchWhatIfCost() {
      try {
        const res = await axios.get(`${API_BASE}/ml/cost-analysis`, {
          params: { rainfall_factor: rainfallFactor },
        });
        setCostData(res.data);
      } catch (err) {
        console.error('What-If cost fetch failed:', err);
      }
    }
    fetchWhatIfCost();
  }, [rainfallFactor, normalCostData]);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Computing cost impact analysis...</p>
        </div>
        <p className="text-slate-500 text-xs mt-1">लागत प्रभाव विश्लेषण गणना गर्दै...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-red-900">
        <p className="text-red-400 text-sm">Failed to load cost analysis: {error}</p>
      </div>
    );
  }

  if (!costData) return null;

  const { seasonal_prices, monthly, seasonal, annual } = costData;
  const isWhatIf = Math.abs(rainfallFactor - 1.0) >= 0.01;
  const normalAnnual = normalCostData?.annual;

  // Prepare monthly chart data
  const monthlyChartData = monthly.map(m => ({
    ...m,
    label: m.month.slice(2), // "25-01" format
    import_cost: m.total_import_cost_nrs,
    export_revenue: m.total_export_revenue_nrs,
  }));

  // Prepare seasonal chart data
  const seasonOrder = ['monsoon', 'pre_monsoon', 'post_monsoon', 'dry_winter'];
  const seasonalChartData = seasonOrder
    .filter(s => seasonal[s])
    .map(s => ({
      ...seasonal[s],
      name: SEASON_LABELS_SHORT[s],
      import_cost: seasonal[s].total_import_cost_nrs,
      export_revenue: seasonal[s].total_export_revenue_nrs,
    }));

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Cost Impact Analysis — Import/Export Projections
            {isWhatIf && (
              <span className="ml-2 text-amber-400 text-xs font-normal">
                (What-If: {Math.round(rainfallFactor * 100)}% rainfall)
              </span>
            )}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            लागत प्रभाव विश्लेषण — आयात/निर्यात प्रक्षेपण
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-0.5">
          <button
            onClick={() => setView('monthly')}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              view === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setView('seasonal')}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              view === 'seasonal' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Seasonal
          </button>
        </div>
      </div>

      {/* Annual summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-2 text-center">
          <p className="text-[10px] text-red-400/70">Total Import Cost / आयात लागत</p>
          <p className="text-sm font-mono font-bold text-red-400">
            NPR {formatNPR(annual.total_import_cost_nrs)}
          </p>
          {isWhatIf && normalAnnual && (
            <p className={`text-[9px] font-mono ${annual.total_import_cost_nrs > normalAnnual.total_import_cost_nrs ? 'text-red-400' : 'text-green-400'}`}>
              {annual.total_import_cost_nrs > normalAnnual.total_import_cost_nrs ? '+' : ''}
              {formatNPR(annual.total_import_cost_nrs - normalAnnual.total_import_cost_nrs)} vs normal
            </p>
          )}
        </div>
        <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-2 text-center">
          <p className="text-[10px] text-green-400/70">Total Export Revenue / निर्यात आम्दानी</p>
          <p className="text-sm font-mono font-bold text-green-400">
            NPR {formatNPR(annual.total_export_revenue_nrs)}
          </p>
          {isWhatIf && normalAnnual && (
            <p className={`text-[9px] font-mono ${annual.total_export_revenue_nrs < normalAnnual.total_export_revenue_nrs ? 'text-red-400' : 'text-green-400'}`}>
              {annual.total_export_revenue_nrs >= normalAnnual.total_export_revenue_nrs ? '+' : ''}
              {formatNPR(annual.total_export_revenue_nrs - normalAnnual.total_export_revenue_nrs)} vs normal
            </p>
          )}
        </div>
        <div className={`${annual.net_cost_nrs > 0 ? 'bg-red-900/20 border-red-800/40' : 'bg-green-900/20 border-green-800/40'} border rounded-lg p-2 text-center`}>
          <p className="text-[10px] text-slate-400">Net Balance / खुद सन्तुलन</p>
          <p className={`text-sm font-mono font-bold ${annual.net_cost_nrs > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {annual.net_cost_nrs > 0 ? '-' : '+'}NPR {formatNPR(Math.abs(annual.net_cost_nrs))}
          </p>
          <p className="text-[9px] text-slate-500">
            {annual.prediction_days} days projected
            {isWhatIf && normalAnnual && (
              <span className={`ml-1 font-mono ${annual.net_cost_nrs > normalAnnual.net_cost_nrs ? 'text-red-400' : 'text-green-400'}`}>
                ({annual.net_cost_nrs > normalAnnual.net_cost_nrs ? '+' : ''}{formatNPR(annual.net_cost_nrs - normalAnnual.net_cost_nrs)})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'monthly' ? (
            <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
                interval={1}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
                tickFormatter={v => formatNPR(v)}
                label={{
                  value: 'NPR',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#64748b', fontSize: 11 },
                }}
              />
              <Tooltip content={<CostTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Bar dataKey="import_cost" name="Import Cost" stackId="a" radius={[0, 0, 0, 0]}>
                {monthlyChartData.map((entry, index) => (
                  <Cell key={index} fill={`${SEASON_COLORS[entry.season] || '#ef4444'}90`} stroke={SEASON_COLORS[entry.season] || '#ef4444'} />
                ))}
              </Bar>
              <Bar dataKey="export_revenue" name="Export Revenue" stackId="b" radius={[2, 2, 0, 0]}>
                {monthlyChartData.map((entry, index) => (
                  <Cell key={index} fill="#10b98140" stroke="#10b981" />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={seasonalChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
                tickFormatter={v => formatNPR(v)}
                label={{
                  value: 'NPR',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#64748b', fontSize: 11 },
                }}
              />
              <Tooltip content={<CostTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Bar dataKey="import_cost" name="Import Cost" fill="#ef444490" stroke="#ef4444" radius={[4, 4, 0, 0]}>
                {seasonalChartData.map((entry, index) => (
                  <Cell key={index} fill={`${SEASON_COLORS[entry.season]}60`} stroke={SEASON_COLORS[entry.season]} />
                ))}
              </Bar>
              <Bar dataKey="export_revenue" name="Export Revenue" fill="#10b98140" stroke="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Seasonal price + breakdown cards */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {seasonOrder.map(s => {
          const prices = seasonal_prices[s];
          const stats = seasonal[s];
          if (!prices) return null;
          return (
            <div
              key={s}
              className="bg-slate-700/50 rounded-lg p-2 border border-slate-600"
              style={{ borderLeftColor: SEASON_COLORS[s], borderLeftWidth: 3 }}
            >
              <p className="text-[10px] font-semibold mb-1" style={{ color: SEASON_COLORS[s] }}>
                {SEASON_LABELS_SHORT[s]}
              </p>
              <div className="space-y-0.5 text-[10px]">
                <p className="text-slate-400">
                  Import: <span className="font-mono text-red-400">NPR {prices.avg_import_cost_nrs_per_mwh.toFixed(0)}/MWh</span>
                </p>
                <p className="text-slate-400">
                  Export: <span className="font-mono text-green-400">NPR {prices.avg_export_revenue_nrs_per_mwh.toFixed(0)}/MWh</span>
                </p>
                {stats && (
                  <>
                    <hr className="border-slate-600 my-1" />
                    <p className="text-slate-400">
                      Cost: <span className="font-mono text-red-400">NPR {formatNPR(stats.total_import_cost_nrs)}</span>
                    </p>
                    <p className="text-slate-400">
                      Rev: <span className="font-mono text-green-400">NPR {formatNPR(stats.total_export_revenue_nrs)}</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
