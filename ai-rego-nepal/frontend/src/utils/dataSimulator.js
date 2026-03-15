/**
 * Data simulator utilities for frontend fallback.
 * Used when backend is not available.
 */

const SEASONAL_HYDRO_FACTOR = {
  1: 0.50, 2: 0.45, 3: 0.40, 4: 0.38, 5: 0.42,
  6: 0.72, 7: 0.92, 8: 0.95, 9: 0.88, 10: 0.74,
  11: 0.62, 12: 0.54,
};

export function getSeasonLabel(month) {
  if (month >= 6 && month <= 9) return 'Monsoon';
  if (month >= 3 && month <= 5) return 'Pre-Monsoon (Dry)';
  if (month >= 10 && month <= 11) return 'Post-Monsoon';
  return 'Dry Winter';
}

export function getSeasonLabelNepali(month) {
  if (month >= 6 && month <= 9) return 'वर्षा';
  if (month >= 3 && month <= 5) return 'प्रि-मनसुन (सुख्खा)';
  if (month >= 10 && month <= 11) return 'पोस्ट-मनसुन';
  return 'सुख्खा जाडो';
}

export function getHydroFactor(month) {
  return SEASONAL_HYDRO_FACTOR[month] || 0.5;
}

export function formatMW(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(1)} MW`;
}

export function formatNPR(value) {
  if (value === null || value === undefined) return '—';
  if (value >= 1000000) return `NPR ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `NPR ${(value / 1000).toFixed(0)}K`;
  return `NPR ${value}`;
}

export function getStatusColor(status) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };
  return colors[status] || 'bg-gray-500';
}

export function getStatusBorderColor(status) {
  const colors = {
    green: 'border-green-500',
    yellow: 'border-yellow-500',
    red: 'border-red-500',
    blue: 'border-blue-500',
  };
  return colors[status] || 'border-gray-500';
}

export function getStatusTextColor(status) {
  const colors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  };
  return colors[status] || 'text-gray-400';
}
