import React, { useState, useEffect } from 'react';
import logo from '../logo.png';
import ZoneSidebar from './components/ZoneSidebar';
import NepalGridMap from './components/NepalGridMap';
import ForecastChart from './components/ForecastChart';
import AlertFeed from './components/AlertFeed';
import RecommendationCards from './components/RecommendationCards';
import WhatIfChat from './components/WhatIfChat';
import { useGridData } from './hooks/useGridData';
import { formatNSTTime, formatNSTDate, getNSTDate } from './utils/nstTime';
import { getSeasonLabel, getSeasonLabelNepali } from './utils/dataSimulator';

export default function App() {
  const {
    gridData,
    forecast,
    recommendations,
    loading,
    error,
    festivalMode,
    setFestivalMode,
    seasonOverride,
    setSeasonOverride,
    refreshGrid,
    refreshRecommendations,
    sendChatMessage,
  } = useGridData();

  const [selectedZone, setSelectedZone] = useState(null);
  const [clock, setClock] = useState(formatNSTTime());
  const [dateLine, setDateLine] = useState(formatNSTDate());
  const [activeTab, setActiveTab] = useState('alerts'); // alerts | recommendations | chat

  // Live clock update
  useEffect(() => {
    const interval = setInterval(() => {
      setClock(formatNSTTime());
      setDateLine(formatNSTDate());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const nstNow = getNSTDate();
  const currentMonth = seasonOverride === 'monsoon' ? 7 : seasonOverride === 'dry' ? 3 : nstNow.getMonth() + 1;
  const seasonEN = getSeasonLabel(currentMonth);
  const seasonNP = getSeasonLabelNepali(currentMonth);

  if (loading && !gridData) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-crimson border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-lg font-semibold">AI REGO</p>
          <p className="text-slate-500 text-sm">Loading Nepal Grid Data...</p>
          <p className="text-slate-600 text-xs mt-1">नेपाल ग्रिड डाटा लोड हुँदैछ...</p>
        </div>
      </div>
    );
  }

  if (error && !gridData) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg font-semibold mb-2">Connection Error</p>
          <p className="text-slate-400 text-sm mb-4">
            Could not connect to AI REGO backend. Make sure the backend is running:
          </p>
          <code className="text-xs text-slate-500 bg-slate-800 px-3 py-2 rounded block">
            cd backend && uvicorn main:app --reload
          </code>
          <button
            onClick={refreshGrid}
            className="mt-4 bg-crimson hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const national = gridData?.national_summary;
  const crossBorder = gridData?.cross_border;

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* ═══ Top Navbar ═══ */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="AI REGO logo" className="w-8 h-8 rounded-lg object-contain bg-slate-900" />
            <div>
              <h1 className="text-base font-bold text-white leading-tight">AI REGO</h1>
              <p className="text-[10px] text-slate-400">नेपाल विद्युत प्राधिकरण — NEA</p>
            </div>
          </div>

          {/* Cross-border ticker */}
          {crossBorder && (
            <div className={`ml-4 px-3 py-1 rounded-full text-xs font-mono ${
              crossBorder.status === 'exporting'
                ? 'bg-blue-900/40 text-blue-400 border border-blue-800'
                : crossBorder.status === 'importing'
                ? 'bg-red-900/40 text-red-400 border border-red-800'
                : 'bg-slate-700 text-slate-400 border border-slate-600'
            }`}>
              {crossBorder.direction} • {crossBorder.amount_mw} MW
            </div>
          )}
        </div>

        {/* Center: National summary */}
        {national && (
          <div className="hidden lg:flex items-center gap-6 text-xs">
            <div className="text-center">
              <p className="text-slate-500">Demand / माग</p>
              <p className="font-mono font-semibold text-slate-200">{national.total_demand_mw} MW</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500">Hydro / जलविद्युत</p>
              <p className="font-mono font-semibold text-blue-400">{national.total_hydro_generation_mw} MW</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500">Balance / सन्तुलन</p>
              <p className={`font-mono font-semibold ${
                national.surplus_deficit_mw >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {national.surplus_deficit_mw > 0 ? '+' : ''}{national.surplus_deficit_mw} MW
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-500">Utilization</p>
              <p className="font-mono font-semibold text-slate-200">{national.national_utilization_pct}%</p>
            </div>
          </div>
        )}

        {/* Right: Clock + Toggles */}
        <div className="flex items-center gap-3">
          {/* Season toggle */}
          <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setSeasonOverride(null)}
              className={`text-[10px] px-2 py-1 rounded ${
                !seasonOverride ? 'bg-slate-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setSeasonOverride('monsoon')}
              className={`text-[10px] px-2 py-1 rounded ${
                seasonOverride === 'monsoon' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monsoon
            </button>
            <button
              onClick={() => setSeasonOverride('dry')}
              className={`text-[10px] px-2 py-1 rounded ${
                seasonOverride === 'dry' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dry
            </button>
          </div>

          {/* Festival mode toggle */}
          <button
            onClick={() => setFestivalMode(!festivalMode)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
              festivalMode
                ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'
            }`}
          >
            {festivalMode ? 'Dashain ON' : 'Festival'}
          </button>

          {/* Clock */}
          <div className="text-right">
            <p className="text-xs font-mono text-slate-200">{clock}</p>
            <p className="text-[10px] text-slate-500">{dateLine}</p>
          </div>
        </div>
      </header>

      {/* ═══ Season banner ═══ */}
      <div className={`px-4 py-1 text-[10px] flex items-center justify-between ${
        seasonOverride === 'dry' || currentMonth <= 5 && currentMonth >=3
          ? 'bg-orange-900/30 text-orange-400'
          : seasonOverride === 'monsoon' || currentMonth >= 6 && currentMonth <= 9
          ? 'bg-blue-900/30 text-blue-400'
          : 'bg-slate-800 text-slate-500'
      }`}>
        <span>Season: {seasonEN} / {seasonNP}</span>
        {gridData?.kulekhani_reservoir && (
          <span>
            Kulekhani Reservoir: {gridData.kulekhani_reservoir.level_pct}% |
            {gridData.kulekhani_reservoir.available_mw}/{gridData.kulekhani_reservoir.max_mw} MW available
          </span>
        )}
      </div>

      {/* ═══ Main Layout ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar — Zones */}
        <ZoneSidebar
          zones={gridData?.zones || []}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
        />

        {/* Center — Map + Forecast */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
          {/* Map */}
          <div className="flex-1 min-h-[300px]">
            <NepalGridMap
              zones={gridData?.zones || []}
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
            />
          </div>

          {/* Forecast Chart */}
          <div className="flex-shrink-0">
            <ForecastChart forecast={forecast} />
          </div>
        </div>

        {/* Right Panel — Alerts / Recommendations / Chat */}
        <div className="w-80 bg-slate-800/50 border-l border-slate-700 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Tab buttons */}
          <div className="flex border-b border-slate-700 flex-shrink-0">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 text-xs py-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'text-crimson border-b-2 border-crimson bg-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Alerts
              {gridData?.alerts?.length > 0 && (
                <span className="ml-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                  {gridData.alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex-1 text-xs py-2 transition-colors ${
                activeTab === 'recommendations'
                  ? 'text-crimson border-b-2 border-crimson bg-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              AI Recs
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 text-xs py-2 transition-colors ${
                activeTab === 'chat'
                  ? 'text-crimson border-b-2 border-crimson bg-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chat
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'alerts' && (
              <AlertFeed alerts={gridData?.alerts || []} />
            )}
            {activeTab === 'recommendations' && (
              <RecommendationCards
                recommendations={recommendations}
                onRefresh={refreshRecommendations}
              />
            )}
            {activeTab === 'chat' && (
              <WhatIfChat onSendMessage={sendChatMessage} />
            )}
          </div>
        </div>
      </div>

      {/* ═══ Footer ═══ */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-500 flex-shrink-0">
        <span>Powered by AI REGO | Data: Nepal Electricity Authority (NEA) | Simulated Demo</span>
        <span>AI REGO Nepal v1.0 | नेपाल विद्युत प्राधिकरण</span>
      </footer>
    </div>
  );
}
