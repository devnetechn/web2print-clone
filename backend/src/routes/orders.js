// Routes for 4over orders -> mounted at /api/orders
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from './helpers.js';
import { AppError } from '../middleware/error.js';
import * as orders from '../services/fourover/orders.js';

export const ordersRouter = Router();

// Minimal order shape guard. 4over's full schema is richer; this catches
// obviously-malformed submissions before they hit the vendor.
const orderSchema = z.object({
  items: z.array(z.object({}).passthrough()).min(1, 'Order needs at least one item'),
  shipping: z.object({}).passthrough().optional(),
  shippingAddress: z.object({}).passthrough().optional(),
}).passthrough();

function parseOrThrow(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(result.error.issues[0].message, 400, 'VALIDATION_ERROR');
  }
  return result.data;
}

// POST /api/orders  -> submit a new order to 4over
ordersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseOrThrow(orderSchema, req.body);
    const result = await orders.createOrder(payload);
    res.status(201).json(result);
  })
);

// GET /api/orders/:jobId/status
ordersRouter.get(
  '/:jobId/status',
  asyncHandler(async (req, res) => {
    res.json(await orders.getOrderStatus(req.params.jobId));
  })
);

// GET /api/orders/:jobId/tracking
ordersRouter.get(
  '/:jobId/tracking',
  asyncHandler(async (req, res) => {
    res.json(await orders.getOrderTracking(req.params.jobId));
  })
);
