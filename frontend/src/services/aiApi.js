import api from '../api/axios';

export const getCropPrediction = (crop, district, season) =>
  api.post('/ai/crop-prediction', { crop, district, season }).then(r => r.data);

export const getJobMatches = () =>
  api.get('/ai/job-match').then(r => r.data);

export const askAdvisor = (message, history) =>
  api.post('/ai/advisor', { message, history }).then(r => r.data);

export const getEarningsSummary = () =>
  api.get('/ai/earnings-summary').then(r => r.data);

export const getMarketInsights = () =>
  api.get('/ai/market-insights').then(r => r.data);
