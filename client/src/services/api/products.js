/**
 * client/src/services/api/products.js
 * Product and category API calls.
 */

import api from './client';

export async function fetchProducts(categorySlug = null) {
  const path = categorySlug
    ? `/products?category=${categorySlug}`
    : '/products';
  const data = await api.get(path);
  return data.products;
}

export async function fetchProduct(id) {
  const data = await api.get(`/products/${id}`);
  return data.product;
}

export async function fetchCategories() {
  // Categories come embedded in products — extract unique ones
  const products = await fetchProducts();
  const seen = new Set();
  const categories = [];
  for (const p of products) {
    if (!seen.has(p.category_id)) {
      seen.add(p.category_id);
      categories.push({
        id:   p.category_id,
        name: p.category_name,
        slug: p.category_slug,
      });
    }
  }
  return categories;
}
