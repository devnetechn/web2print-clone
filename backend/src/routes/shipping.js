// Routes for 4over shipping -> mounted at /api/shipping
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from './helpers.js';
import { AppError } from '../middleware/error.js';
import * as shipping from '../services/fourover/shipping.js';

export const shippingRouter = Router();

const addressSchema = z.object({
  address: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zipcode: z.string().min(1),
  country: z.string().min(1),
});

const quoteSchema = addressSchema.extend({
  product_uuid: z.string().min(1),
  runsize_uuid: z.string().min(1),
  turnaround_uuid: z.string().min(1),
  colorspec_uuid: z.string().optional(),
  option_uuids: z.array(z.string()).optional(),
  sets: z.number().int().positive().optional(),
});

function parseOrThrow(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(result.error.issues[0].message, 400, 'VALIDATION_ERROR');
  }
  return result.data;
}

// POST /api/shipping/quote
shippingRouter.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const payload = parseOrThrow(quoteSchema, req.body);
    res.json(await shipping.getShippingQuote(payload));
  })
);

// POST /api/shipping/validate-address
shippingRouter.post(
  '/validate-address',
  asyncHandler(async (req, res) => {
    const payload = parseOrThrow(addressSchema, req.body);
    res.json(await shipping.validateAddress(payload));
  })
);
