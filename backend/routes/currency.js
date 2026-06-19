/**
 * Currency / FX rates
 * Base currency is CNY because product prices are stored in RMB.
 * Uses a public no-key FX endpoint with in-memory cache; falls back to static rates.
 */
const express = require('express');
const axios = require('axios');
const router = express.Router();

const FALLBACK_RATES = {
  CNY: 1,
  USD: 0.138,
  EUR: 0.128,
  JPY: 21.8,
  SAR: 0.518,
};

let cache = null;
const CACHE_MS = 1000 * 60 * 60; // 1 hour

async function fetchLiveRates(base) {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const resp = await axios.get(url, { timeout: 8000 });
  if (!resp.data || resp.data.result !== 'success' || !resp.data.rates) {
    throw new Error('Invalid FX response');
  }
  return resp.data.rates;
}

router.get('/rates', async (req, res) => {
  const base = String(req.query.base || 'CNY').toUpperCase();
  const now = Date.now();

  if (base === 'CNY' && cache && now - cache.fetchedAt < CACHE_MS) {
    return res.json({ base, rates: cache.rates, source: cache.source, fetchedAt: cache.fetchedAt });
  }

  try {
    const liveRates = await fetchLiveRates(base);
    const rates = {
      CNY: Number(liveRates.CNY || 1),
      USD: Number(liveRates.USD || FALLBACK_RATES.USD),
      EUR: Number(liveRates.EUR || FALLBACK_RATES.EUR),
      JPY: Number(liveRates.JPY || FALLBACK_RATES.JPY),
      SAR: Number(liveRates.SAR || FALLBACK_RATES.SAR),
    };
    if (base === 'CNY') cache = { rates, source: 'live', fetchedAt: now };
    res.json({ base, rates, source: 'live', fetchedAt: now });
  } catch (err) {
    const rates = base === 'CNY' ? FALLBACK_RATES : { ...FALLBACK_RATES };
    if (base === 'CNY') cache = { rates, source: 'fallback', fetchedAt: now, error: err.message };
    res.json({ base, rates, source: 'fallback', fetchedAt: now, error: err.message });
  }
});

module.exports = router;
