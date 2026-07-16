// Routes for 4over product catalog -> mounted at /api/products
import { Router } from 'express';
import { asyncHandler } from './helpers.js';
import * as products from '../services/fourover/products.js';

export const productsRouter = Router();

// GET /api/products/categories
productsRouter.get(
  '/categories',
  asyncHandler(async (req, res) => {
    res.json(await products.listCategories({ max: req.query.max }));
  })
);

// GET /api/products/categories/:uuid
productsRouter.get(
  '/categories/:uuid',
  asyncHandler(async (req, res) => {
    res.json(await products.getCategory(req.params.uuid));
  })
);

// GET /api/products?category_uuid=...
productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(
      await products.listProducts({
        categoryUuid: req.query.category_uuid,
        max: req.query.max,
      })
    );
  })
);

// GET /api/products/:uuid
productsRouter.get(
  '/:uuid',
  asyncHandler(async (req, res) => {
    res.json(await products.getProduct(req.params.uuid));
  })
);

// GET /api/products/:uuid/optiongroups
productsRouter.get(
  '/:uuid/optiongroups',
  asyncHandler(async (req, res) => {
    res.json(await products.getProductOptionGroups(req.params.uuid));
  })
);

// GET /api/products/:uuid/baseprices
productsRouter.get(
  '/:uuid/baseprices',
  asyncHandler(async (req, res) => {
    res.json(await products.getProductBasePrices(req.params.uuid));
  })
);

// GET /api/products/:uuid/quote?runsize_uuid=...&turnaround_uuid=...
productsRouter.get(
  '/:uuid/quote',
  asyncHandler(async (req, res) => {
    const { ...options } = req.query;
    res.json(
      await products.getProductQuote({
        productUuid: req.params.uuid,
        options,
      })
    );
  })
);
