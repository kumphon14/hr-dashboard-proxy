/**
 * ============================================================
 * Vercel Serverless Proxy for Google Apps Script (GAS)
 * File: api/[...path].js
 *
 * Responsibilities:
 * - Catch-all API routing (/api/*)
 * - Forward request to GAS Web App
 * - Handle CORS
 * - Pass through query parameters
 * ============================================================
 */

export default async function handler(req, res) {
  /**
   * ------------------------------------------------------------
   * 1. Allow CORS (important for browser requests)
   * ------------------------------------------------------------
   */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  /**
   * ------------------------------------------------------------
   * 2. Only allow GET (current scope)
   * ------------------------------------------------------------
   */
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      }
    });
  }

  /**
   * ------------------------------------------------------------
   * 3. Read GAS base URL from environment variable
   * ------------------------------------------------------------
   */
  const GAS_BASE_URL = process.env.GAS_BASE_URL;

  if (!GAS_BASE_URL) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'GAS_BASE_URL is not configured',
        code: 'MISSING_GAS_BASE_URL'
      }
    });
  }

  /**
   * ------------------------------------------------------------
   * 4. Extract path segments from URL
   *    Example:
   *    /api/employee/profile  -> ['employee', 'profile']
   * ------------------------------------------------------------
   */
  const { path = [] } = req.query;

  /**
   * ------------------------------------------------------------
   * 5. Forward query parameters (except "path")
   * ------------------------------------------------------------
   */
  const query = new URLSearchParams(req.query);
  query.delete('path');

  /**
   * ------------------------------------------------------------
   * 6. Build GAS request URL
   *    GAS expects:
   *    ?path=employee/profile&id=EMP_ID
   * ------------------------------------------------------------
   */
  const gasPath = Array.isArray(path) ? path.join('/') : path;
  const gasUrl =
    `${GAS_BASE_URL}?path=${encodeURIComponent(gasPath)}` +
    (query.toString() ? `&${query.toString()}` : '');

  /**
   * ------------------------------------------------------------
   * 7. Proxy request to Google Apps Script
   * ------------------------------------------------------------
   */
  try {
    const response = await fetch(gasUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();

    /**
     * ----------------------------------------------------------
     * 8. Return response as-is
     *    (GAS already returns JSON)
     * ----------------------------------------------------------
     */
    return res.status(200).send(text);

  } catch (error) {
    console.error('Proxy error:', error);

    return res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Proxy request failed',
        code: 'PROXY_ERROR'
      }
    });
  }
}
