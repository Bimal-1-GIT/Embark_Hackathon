import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Popup, useMap } from 'react-leaflet';
import { zones as zoneGeo, rivers, statusColors, NEPAL_CENTER, NEPAL_ZOOM } from '../data/nepalZones';
import { formatMW } from '../utils/dataSimulator';

function MapController({ selectedZone }) {
  const map = useMap();
  useEffect(() => {
    if (selectedZone) {
      const geo = zoneGeo.find(z => z.id === selectedZone.id);
      if (geo) {
        map.flyTo(geo.center, 9, { duration: 0.8 });
      }
    } else {
      map.flyTo(NEPAL_CENTER, NEPAL_ZOOM, { duration: 0.8 });
    }
  }, [selectedZone, map]);
  return null;
}

/** Mini sparkline-style risk curve rendered as inline SVG */
function RiskCurve({ monthlyRisk }) {
  if (!monthlyRisk || monthlyRisk.length === 0) return null;

  const width = 190;
  const height = 50;
  const padding = { top: 4, right: 4, bottom: 12, left: 20 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxLS = Math.max(10, ...monthlyRisk.map(d => d.avg_load_shedding_pct));
  const maxUtil = Math.max(60, ...monthlyRisk.map(d => d.avg_utilization_pct));

  const xStep = chartW / Math.max(1, monthlyRisk.length - 1);

  // Build utilization path
  const utilPoints = monthlyRisk.map((d, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + chartH - (d.avg_utilization_pct / maxUtil) * chartH;
    return `${x},${y}`;
  });
  const utilPath = `M${utilPoints.join(' L')}`;

  // Build load shedding path
  const lsPoints = monthlyRisk.map((d, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + chartH - (d.avg_load_shedding_pct / maxLS) * chartH;
    return `${x},${y}`;
  });
  const lsPath = `M${lsPoints.join(' L')}`;

  // Fill area under load shedding
  const lsFillPath = `${lsPath} L${padding.left + (monthlyRisk.length - 1) * xStep},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;

  // X-axis labels (every 3rd month)
  const xLabels = monthlyRisk
    .filter((_, i) => i % 3 === 0)
    .map((d, i, arr) => ({
      x: padding.left + (monthlyRisk.indexOf(d)) * xStep,
      label: d.month.slice(2),  // "24-06" → "24-06" or just month
    }));

  return (
    <svg width={width} height={height} className="block">
      {/* Grid lines */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke="#475569" strokeWidth="0.5" />
      <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="#475569" strokeWidth="0.5" />

      {/* Load shedding fill */}
      <path d={lsFillPath} fill="#ef444430" />
      {/* Load shedding line */}
      <path d={lsPath} fill="none" stroke="#ef4444" strokeWidth="1.5" />
      {/* Utilization line */}
      <path d={utilPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" />

      {/* X labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={padding.top + chartH + 12} fill="#94a3b8" fontSize="7" textAnchor="middle">{l.label}</text>
      ))}

      {/* Y labels */}
      <text x={padding.left - 3} y={padding.top + 4} fill="#94a3b8" fontSize="7" textAnchor="end">{maxLS.toFixed(0)}%</text>
      <text x={padding.left - 3} y={padding.top + chartH} fill="#94a3b8" fontSize="7" textAnchor="end">0</text>
    </svg>
  );
}

const predictionStatusColors = {
  green: { fill: '#22c55e', border: '#16a34a' },
  yellow: { fill: '#eab308', border: '#ca8a04' },
  red: { fill: '#ef4444', border: '#dc2626' },
  blue: { fill: '#3b82f6', border: '#2563eb' },
};

export default function NepalGridMap({ zones, selectedZone, onSelectZone, zonePredictions, rainfallFactor = 1.0 }) {
  const getZoneColor = (zoneId) => {
    // Use predicted status if available, otherwise fall back to live status
    if (zonePredictions) {
      const pred = zonePredictions.find(p => p.zone_id === zoneId);
      if (pred) {
        const pc = predictionStatusColors[pred.predicted_status] || predictionStatusColors.green;
        return { fillColor: pc.fill, color: pc.border };
      }
    }
    const liveZone = zones?.find(z => z.id === zoneId);
    if (!liveZone) return { fillColor: '#64748b', color: '#475569' };
    const sc = statusColors[liveZone.status] || statusColors.green;
    return { fillColor: sc.fill, color: sc.border };
  };

  const getZoneLiveData = (zoneId) => {
    return zones?.find(z => z.id === zoneId);
  };

  const getZonePrediction = (zoneId) => {
    return zonePredictions?.find(p => p.zone_id === zoneId);
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-slate-700">
      <MapContainer
        center={NEPAL_CENTER}
        zoom={NEPAL_ZOOM}
        className="w-full h-full"
        style={{ height: '100%', minHeight: '500px', background: '#0f172a' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapController selectedZone={selectedZone} />

        {/* River overlays */}
        {rivers.map((river) => (
          <Polyline
            key={river.name}
            positions={river.coordinates}
            pathOptions={{
              color: '#3b82f6',
              weight: 2,
              opacity: 0.4,
              dashArray: '8,4',
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{river.name}</p>
                <p className="text-slate-400">{river.nepali_name}</p>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Zone polygons */}
        {zoneGeo.map((geo) => {
          const colors = getZoneColor(geo.id);
          const live = getZoneLiveData(geo.id);
          const pred = getZonePrediction(geo.id);
          const isSelected = selectedZone?.id === geo.id;

          return (
            <Polygon
              key={geo.id}
              positions={geo.polygon}
              pathOptions={{
                fillColor: colors.fillColor,
                fillOpacity: isSelected ? 0.5 : 0.3,
                color: isSelected ? '#ffffff' : colors.color,
                weight: isSelected ? 3 : 2,
                opacity: isSelected ? 1 : 0.7,
              }}
              eventHandlers={{
                click: () => onSelectZone(live || geo),
              }}
            >
              <Popup maxWidth={240} minWidth={200} autoPanPadding={[30, 30]}>
                <div className="w-[200px] text-[10px] space-y-1 max-h-[250px] overflow-y-auto">
                  <p className="font-bold text-xs leading-tight">{geo.name} <span className="font-normal text-slate-400">({geo.nepali_name})</span></p>
                  {live && (
                    <>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <p className="text-slate-500">Load <span className="font-mono float-right">{formatMW(live.load_mw)}</span></p>
                        <p className="text-slate-500">Cap <span className="font-mono float-right">{formatMW(live.capacity_mw)}</span></p>
                        <p className="text-slate-500">Hydro <span className="font-mono text-blue-400 float-right">{formatMW(live.hydro_generation_mw)}</span></p>
                        <p className="text-slate-500">Import <span className="font-mono text-yellow-400 float-right">{formatMW(live.import_mw)}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 shrink-0">Util</span>
                        <div className="flex-1 h-1.5 bg-slate-600 rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, live.utilization_pct)}%`, backgroundColor: colors.fillColor }} />
                        </div>
                        <span className="font-mono shrink-0">{live.utilization_pct}%</span>
                      </div>
                      {live.load_shedding_probability > 10 && (
                        <p className="text-red-400 text-[9px] bg-red-900/30 rounded px-1 py-0.5">
                          LS probability: {live.load_shedding_probability}%
                        </p>
                      )}
                    </>
                  )}
                  {pred && (
                    <div className="border-t border-slate-600 pt-1 mt-1">
                      <p className="text-[9px] font-semibold text-blue-400 mb-0.5">ML Forecast (30d)</p>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <div className="text-center">
                          <p className="text-slate-500 leading-none">Avg</p>
                          <p className={`font-mono font-semibold ${pred.avg_utilization_30d >= 92 ? 'text-red-400' : pred.avg_utilization_30d >= 78 ? 'text-yellow-400' : 'text-green-400'}`}>{pred.avg_utilization_30d}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500 leading-none">Peak</p>
                          <p className={`font-mono font-semibold ${pred.max_utilization_30d >= 92 ? 'text-red-400' : pred.max_utilization_30d >= 78 ? 'text-yellow-400' : 'text-green-400'}`}>{pred.max_utilization_30d}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500 leading-none">LS</p>
                          <p className={`font-mono font-semibold ${pred.avg_load_shedding_30d >= 20 ? 'text-red-400' : pred.avg_load_shedding_30d >= 10 ? 'text-yellow-400' : 'text-green-400'}`}>{pred.avg_load_shedding_30d}%</p>
                        </div>
                      </div>
                      {pred.monthly_risk_curve && pred.monthly_risk_curve.length > 0 && (
                        <div className="mt-1">
                          <div className="flex items-center gap-2 text-[8px] mb-0.5">
                            <span className="text-slate-500">Risk Curve</span>
                            <span className="text-red-400"><span className="inline-block w-2 h-px bg-red-500 align-middle"></span> LS</span>
                            <span className="text-blue-400"><span className="inline-block w-2 h-px bg-blue-500 align-middle"></span> Util</span>
                          </div>
                          <div className="bg-slate-800 rounded">
                            <RiskCurve monthlyRisk={pred.monthly_risk_curve} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Map overlay label */}
      <div className="absolute top-3 left-14 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-md z-[1000] pointer-events-none">
        <p className="text-xs font-semibold">Nepal Grid Map / नेपाल ग्रिड नक्सा</p>
      </div>

      {/* Prediction mode indicator */}
      {zonePredictions && (
        <div className="absolute top-3 right-3 bg-blue-900/80 backdrop-blur-sm text-blue-300 px-2.5 py-1 rounded-md z-[1000] pointer-events-none">
          <p className="text-[10px] font-semibold">ML Predicted Colors</p>
          {Math.abs(rainfallFactor - 1.0) >= 0.01 && (
            <p className={`text-[9px] mt-0.5 font-mono ${rainfallFactor < 1.0 ? 'text-orange-400' : 'text-cyan-400'}`}>
              Rain: {(rainfallFactor * 100).toFixed(0)}% {rainfallFactor < 1.0 ? '(Drought)' : '(Heavy Rain)'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
