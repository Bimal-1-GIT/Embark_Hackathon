import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = '/api';

export function useGridData(rainfallFactor = 1.0) {
  const [gridData, setGridData] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [zonePredictions, setZonePredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [festivalMode, setFestivalMode] = useState(false);
  const [seasonOverride, setSeasonOverride] = useState(null);

  const fetchGridData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (festivalMode) params.set('festival_mode', 'true');
      if (seasonOverride) params.set('season', seasonOverride);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [gridRes, forecastRes] = await Promise.all([
        axios.get(`${API_BASE}/grid/snapshot${qs}`),
        axios.get(`${API_BASE}/forecast/${qs}`),
      ]);

      setGridData(gridRes.data);
      setForecast(forecastRes.data.forecast);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch grid data:', err);
    } finally {
      setLoading(false);
    }
  }, [festivalMode, seasonOverride]);

  const fetchZonePredictions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (Math.abs(rainfallFactor - 1.0) >= 0.01) {
        params.set('rainfall_factor', rainfallFactor);
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`${API_BASE}/ml/zone-summary${qs}`);
      setZonePredictions(res.data.data);
    } catch (err) {
      console.error('Failed to fetch zone predictions:', err);
    }
  }, [rainfallFactor]);

  const fetchRecommendations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (festivalMode) params.set('festival_mode', 'true');
      if (seasonOverride) params.set('season', seasonOverride);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const res = await axios.get(`${API_BASE}/ai/recommendations${qs}`);
      setRecommendations(res.data.recommendations);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  }, [festivalMode, seasonOverride]);

  const sendChatMessage = useCallback(async (question) => {
    try {
      const res = await axios.post(`${API_BASE}/ai/chat`, {
        question,
        festival_mode: festivalMode,
        season: seasonOverride,
      });
      return res.data.response;
    } catch (err) {
      console.error('Chat error:', err);
      return 'Sorry, could not process your question. Please try again.';
    }
  }, [festivalMode, seasonOverride]);

  // Initial fetch + refetch when festival/season changes
  useEffect(() => {
    fetchGridData();
    fetchRecommendations();
  }, [fetchGridData, fetchRecommendations]);

  // Zone predictions: refetch when rainfallFactor changes
  useEffect(() => {
    fetchZonePredictions();
  }, [fetchZonePredictions]);

  // Auto-refresh grid data every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchGridData, 30000);
    return () => clearInterval(interval);
  }, [fetchGridData]);

  return {
    gridData,
    forecast,
    recommendations,
    zonePredictions,
    loading,
    error,
    festivalMode,
    setFestivalMode,
    seasonOverride,
    setSeasonOverride,
    refreshGrid: fetchGridData,
    refreshRecommendations: fetchRecommendations,
    sendChatMessage,
  };
}
