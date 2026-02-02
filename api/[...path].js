/**
 * ============================================================
 * Vercel Serverless Proxy for Google Apps Script (GAS)
 * File: api/[...path].js
 * ============================================================
 */

export default async function handler(req, res) {
  /* ==========================================================
   * 1. CORS
   * ========================================================== */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      }
    });
  }

  /* ==========================================================
   * 2. GAS URL
   * ========================================================== */
  const GAS_BASE_URL = process.env.GAS_BASE_URL;

  if (!GAS_BASE_URL) {
    console.error('[Proxy] GAS_BASE_URL missing');
    return res.status(500).json({
      success: false,
      error: {
        message: 'GAS_BASE_URL is not configured',
        code: 'MISSING_GAS_BASE_URL'
      }
    });
  }

  /* ==========================================================
   * 3. Extract path
   * ========================================================== */
  const { path = [] } = req.query;
  const gasPath = Array.isArray(path) ? path.join('/') : path;

  /* ==========================================================
   * 4. Forward query params (except path)
   * ========================================================== */
  const query = new URLSearchParams(req.query);
  query.delete('path');

  /* ==========================================================
   * 5. Build GAS URL
   * ========================================================== */
  const gasUrl =
    `${GAS_BASE_URL}?path=${encodeURIComponent(gasPath)}` +
    (query.toString() ? `&${query.toString()}` : '');

  /* ===================== DEBUG ===================== */
  console.log('[Proxy] Incoming URL:', req.url);
  console.log('[Proxy] GAS Path:', gasPath);
  console.log('[Proxy] GAS URL:', gasUrl);
  /* ================================================= */

  try {
    /* ========================================================
     * 6. Call GAS
     * ======================================================== */
    const response = await fetch(gasUrl, {
      method: 'GET'
    });

    const text = await response.text();

    /* ===================== DEBUG ===================== */
    console.log('[Proxy] GAS status:', response.status);
    console.log('[Proxy] GAS raw response:', text);
    /* ================================================= */

    /* ========================================================
     * 7. Try parse JSON (fallback to text)
     * ======================================================== */
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('[Proxy] Fetch error:', error);

    return res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Proxy request failed',
        code: 'PROXY_ERROR'
      }
    });
  }
}
