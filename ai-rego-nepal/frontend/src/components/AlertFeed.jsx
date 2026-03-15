import React from 'react';

const severityStyles = {
  high: {
    border: 'border-red-600',
    bg: 'bg-red-950/40',
    badge: 'bg-red-600 text-white',
    badgeLabel: 'HIGH',
    badgeLabelNp: 'उच्च',
  },
  warning: {
    border: 'border-yellow-600',
    bg: 'bg-yellow-950/30',
    badge: 'bg-yellow-600 text-black',
    badgeLabel: 'WARN',
    badgeLabelNp: 'चेतावनी',
  },
  info: {
    border: 'border-blue-600',
    bg: 'bg-blue-950/30',
    badge: 'bg-blue-600 text-white',
    badgeLabel: 'INFO',
    badgeLabelNp: 'सूचना',
  },
};

export default function AlertFeed({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">
          NEA Alerts / चेतावनीहरू
        </h3>
        <p className="text-xs text-green-400">No active alerts — System stable</p>
        <p className="text-xs text-green-500">कुनै चेतावनी छैन — प्रणाली स्थिर</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            NEA Alerts / चेतावनीहरू
          </h3>
          <p className="text-[10px] text-slate-500">
            नेपाल विद्युत प्राधिकरण
          </p>
        </div>
        <span className="text-xs bg-crimson/20 text-crimson px-2 py-0.5 rounded-full font-mono">
          {alerts.length} active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-slate-700/50">
        {alerts.map((alert, i) => {
          const style = severityStyles[alert.severity] || severityStyles.info;
          return (
            <div
              key={i}
              className={`p-3 ${style.bg} border-l-2 ${style.border} transition-all hover:brightness-110`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {alert.message_en}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {alert.message_np}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${style.badge}`}>
                    {style.badgeLabel}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {alert.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
