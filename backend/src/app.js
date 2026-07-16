import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { productsRouter } from './routes/products.js';
import { shippingRouter } from './routes/shipping.js';
import { ordersRouter } from './routes/orders.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // 4over integration
  app.use('/api/products', productsRouter);
  app.use('/api/shipping', shippingRouter);
  app.use('/api/orders', ordersRouter);

  app.use(errorHandler);
  return app;
}
