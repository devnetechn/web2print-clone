// 4over product catalog: categories, products, option groups, prices, quotes.
import { fouroverRequest } from './client.js';

/** List all print product categories. */
export function listCategories({ max = 500 } = {}) {
  return fouroverRequest('GET', '/printproducts/categories', { query: { max } });
}

/** Get a single category by uuid. */
export function getCategory(categoryUuid) {
  return fouroverRequest('GET', `/printproducts/categories/${categoryUuid}`);
}

/**
 * List products. Optionally filter by category.
 * @param {object} [opts]
 * @param {string} [opts.categoryUuid]  Only products in this category
 * @param {number} [opts.max=500]
 */
export function listProducts({ categoryUuid, max = 500 } = {}) {
  const query = { max };
  if (categoryUuid) query.category_uuid = categoryUuid;
  return fouroverRequest('GET', '/printproducts/products', { query });
}

/** Get a single product by uuid. */
export function getProduct(productUuid) {
  return fouroverRequest('GET', `/printproducts/products/${productUuid}`);
}

/** Get the option groups (e.g. paper, coating, sizes) for a product. */
export function getProductOptionGroups(productUuid) {
  return fouroverRequest(
    'GET',
    `/printproducts/products/${productUuid}/optiongroups`
  );
}

/** Get base prices for a product (per runsize/turnaround). */
export function getProductBasePrices(productUuid) {
  return fouroverRequest(
    'GET',
    `/printproducts/products/${productUuid}/baseprices`
  );
}

/**
 * Get a live price quote for a configured product.
 * @param {object} params
 * @param {string} params.productUuid
 * @param {object} [params.options]  Extra quote args (runsize_uuid, turnaround_uuid, option_uuids, etc.)
 */
export function getProductQuote({ productUuid, options = {} }) {
  return fouroverRequest('GET', '/printproducts/productquote', {
    query: { product_uuid: productUuid, ...options },
  });
}
