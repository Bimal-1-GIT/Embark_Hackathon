import React, { useEffect, useRef } from 'react';
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

export default function NepalGridMap({ zones, selectedZone, onSelectZone }) {
  const getZoneColor = (zoneId) => {
    const liveZone = zones?.find(z => z.id === zoneId);
    if (!liveZone) return { fillColor: '#64748b', color: '#475569' };
    const sc = statusColors[liveZone.status] || statusColors.green;
    return { fillColor: sc.fill, color: sc.border };
  };

  const getZoneLiveData = (zoneId) => {
    return zones?.find(z => z.id === zoneId);
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-slate-700">
      <MapContainer
        center={NEPAL_CENTER}
        zoom={NEPAL_ZOOM}
        className="w-full h-full"
        style={{ height: '100%', minHeight: '350px', background: '#0f172a' }}
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
              <Popup>
                <div className="min-w-[220px] text-sm space-y-2">
                  <div>
                    <p className="font-bold text-base">{geo.name}</p>
                    <p className="text-slate-400">{geo.nepali_name}</p>
                  </div>
                  {live && (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Load / भार</p>
                          <p className="font-mono font-semibold">{formatMW(live.load_mw)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Capacity / क्षमता</p>
                          <p className="font-mono">{formatMW(live.capacity_mw)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Hydro / जलविद्युत</p>
                          <p className="font-mono text-blue-400">{formatMW(live.hydro_generation_mw)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Import / आयात</p>
                          <p className="font-mono text-yellow-400">{formatMW(live.import_mw)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Utilization / उपयोग</p>
                        <div className="w-full h-2 bg-slate-600 rounded-full mt-1">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, live.utilization_pct)}%`,
                              backgroundColor: colors.fillColor,
                            }}
                          />
                        </div>
                        <p className="text-right text-xs mt-0.5 font-mono">{live.utilization_pct}%</p>
                      </div>
                      {live.load_shedding_probability > 10 && (
                        <div className="bg-red-900/30 border border-red-800 rounded px-2 py-1">
                          <p className="text-red-400 text-xs">
                            Load shedding probability: {live.load_shedding_probability}%
                          </p>
                          <p className="text-red-500 text-[10px]">
                            लोडशेडिङ सम्भावना: {live.load_shedding_probability}%
                          </p>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500">
                        <p>Source: {live.primary_source}</p>
                        <p>Substations: {live.key_substations?.join(', ')}</p>
                      </div>
                    </>
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
    </div>
  );
}
