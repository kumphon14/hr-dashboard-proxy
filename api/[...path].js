/**
 * ============================================================
 * Vercel Serverless Proxy for Google Apps Script (GAS)
 * File: api/[...path].js
 * ============================================================
 */

export default async function handler(req, res) {
  /* =========================
   * 1. CORS
   * ========================= */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }
    });
  }

  /* =========================
   * 2. GAS URL
   * ========================= */
  const GAS_BASE_URL = process.env.GAS_BASE_URL;
  if (!GAS_BASE_URL) {
    return res.status(500).json({
      success: false,
      error: { message: 'GAS_BASE_URL missing', code: 'CONFIG_ERROR' }
    });
  }

  /* =========================
   * 3. Extract path SAFELY
   * ========================= */
  // req.url example: /api/employees?id=123
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.replace(/^\/api\/?/, '');

  const gasPath = pathname || '';

  /* =========================
   * 4. Forward query params
   * ========================= */
  const query = new URLSearchParams(url.searchParams);
  query.delete('path'); // safety

  /* =========================
   * 5. Build GAS URL
   * ========================= */
  const gasUrl =
    `${GAS_BASE_URL}?path=${encodeURIComponent(gasPath)}` +
    (query.toString() ? `&${query.toString()}` : '');

  /* ========================= DEBUG ========================= */
  console.log('[Proxy] req.url:', req.url);
  console.log('[Proxy] pathname:', pathname);
  console.log('[Proxy] GAS path:', gasPath);
  console.log('[Proxy] GAS URL:', gasUrl);
  /* ======================================================== */

  try {
    const response = await fetch(gasUrl);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return res.status(response.status).json(data);

  } catch (err) {
    console.error('[Proxy] Error:', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message, code: 'PROXY_ERROR' }
    });
  }
}
