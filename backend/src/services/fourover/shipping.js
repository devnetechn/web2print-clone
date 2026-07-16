// 4over shipping: shipping quotes + address validation.
import { fouroverRequest } from './client.js';

/**
 * Get shipping options/quote for a configured product to a destination.
 * 4over expects the product configuration + destination address.
 * @param {object} payload
 * @param {string} payload.product_uuid
 * @param {string} payload.runsize_uuid
 * @param {string} payload.turnaround_uuid
 * @param {string} [payload.colorspec_uuid]
 * @param {string[]} [payload.option_uuids]
 * @param {number} [payload.sets]
 * @param {string} payload.address     destination street address
 * @param {string} [payload.address2]
 * @param {string} payload.city
 * @param {string} payload.state
 * @param {string} payload.zipcode
 * @param {string} payload.country
 */
export function getShippingQuote(payload) {
  return fouroverRequest('POST', '/shippingquote', { body: payload });
}

/**
 * Validate / normalize a shipping address before quoting or ordering.
 * @param {object} payload  { address, address2?, city, state, country, zipcode }
 */
export function validateAddress(payload) {
  return fouroverRequest('POST', '/addressvalidation', { body: payload });
}
