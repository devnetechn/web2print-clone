// Low-level 4over API client.
//
// Authentication (per 4over spec):
//   hashedPrivate = SHA256(privateKey)            -> hex string
//   signature     = HMAC-SHA256(HTTP_METHOD, hashedPrivate)
//   apikey + signature are sent as query-string params on EVERY request.
//
// The signature depends on the HTTP method, so it is recomputed per request.

import crypto from 'node:crypto';
import { getFouroverConfig, assertCredentials } from './config.js';

/** Build the { apikey, signature } pair for a given HTTP method. */
export function buildAuthParams(method, publicKey, privateKey) {
  const hashedPrivate = crypto
    .createHash('sha256')
    .update(privateKey)
    .digest('hex');

  const signature = crypto
    .createHmac('sha256', hashedPrivate)
    .update(String(method).toUpperCase())
    .digest('hex');

  return { apikey: publicKey, signature };
}

/** Error thrown when 4over responds with a non-2xx status. */
export class FouroverApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'FouroverApiError';
    // status 0 = network/timeout -> surface as 502 Bad Gateway to the client
    this.status = status && status >= 400 ? status : 502;
    this.code = 'FOUROVER_ERROR';
    this.body = body;
  }
}

/**
 * Make an authenticated request to the 4over API.
 *
 * @param {string} method   HTTP method (GET, POST, PUT, DELETE)
 * @param {string} path     API path, e.g. "/printproducts/categories"
 * @param {object} [opts]
 * @param {object} [opts.query]   Extra query-string params
 * @param {object} [opts.body]    JSON body (for POST/PUT)
 * @param {number} [opts.timeoutMs=15000]
 * @returns {Promise<any>} Parsed JSON response
 */
export async function fouroverRequest(method, path, opts = {}) {
  const { query = {}, body, timeoutMs = 15000 } = opts;
  const config = getFouroverConfig();
  assertCredentials(config);

  const auth = buildAuthParams(method, config.publicKey, config.privateKey);
  const url = new URL(config.baseUrl + path);

  // auth params + caller-supplied query params
  for (const [k, v] of Object.entries({ ...auth, ...query })) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: String(method).toUpperCase(),
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new FouroverApiError(`4over request failed: ${err.message}`, {
      status: 0,
    });
  }
  clearTimeout(timer);

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || res.statusText || 'Unknown 4over error';
    throw new FouroverApiError(`4over ${res.status}: ${msg}`, {
      status: res.status,
      body: data,
    });
  }

  return data;
}
