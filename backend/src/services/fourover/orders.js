// 4over orders: create order, check status, get tracking.
import { fouroverRequest } from './client.js';

/**
 * Submit a new order to 4over.
 * NOTE: in the live environment this places a real, billable order.
 * @param {object} order  The order payload (items, shipping, address, payment ref, etc.)
 */
export function createOrder(order) {
  return fouroverRequest('POST', '/orders', { body: order });
}

/** Get the production/fulfillment status of an order. */
export function getOrderStatus(jobId) {
  return fouroverRequest('GET', `/orders/${jobId}/status`);
}

/** Get shipping/tracking info for an order. */
export function getOrderTracking(jobId) {
  return fouroverRequest('GET', `/orders/${jobId}/tracking`);
}
