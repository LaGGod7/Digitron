import localProducts from '../data/products';

const API_URL = '/api';
const READ_TIMEOUT_MS = 3500;

const slugify = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function normalizeLocalProduct(product) {
  return {
    ...product,
    reviews: product.reviews || [],
    avg_rating: product.avg_rating || 0,
    review_count: product.review_count || 0,
  };
}

function getLocalProducts(categorySlug, search, limit = 1000) {
  const query = search?.trim().toLowerCase();
  return localProducts
    .filter((product) => !categorySlug || slugify(product.category) === categorySlug)
    .filter((product) => !query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query))
    .slice(0, limit)
    .map(normalizeLocalProduct);
}

async function apiFetch(path, options = {}) {
  const headers = options.body
    ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
    : options.headers;
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_URL}/categories`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function fetchProducts(categorySlug, search, admin = false, options = {}) {
  const limit = options.limit || 1000;
  let url = `${API_URL}/products?limit=${limit}`;
  if (categorySlug) url += `&category=${categorySlug}`;
  if (search) url += `&search=${search}`;
  if (admin) url += `&admin=true`;
  if (options.includeReviews) url += `&includeReviews=true`;
  try {
    const res = await fetch(url, { credentials: 'include', signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
    return data.products;
  } catch {
    return getLocalProducts(categorySlug, search, limit);
  }
}

export async function searchProducts(search, limit = 8) {
  if (!search?.trim()) return [];
  return fetchProducts(null, search.trim(), false, { limit });
}

export async function fetchProductById(id) {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, { credentials: 'include', signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
    if (!res.ok) throw new Error('Failed to fetch product');
    return res.json();
  } catch {
    const product = localProducts.find((item) => String(item.id) === String(id));
    if (!product) throw new Error('Failed to fetch product');
    return normalizeLocalProduct(product);
  }
}

export async function submitQuoteRequest(data) {
  const res = await fetch(`${API_URL}/quotes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit quote');
  return res.json();
}

export async function submitReview(data) {
  const res = await fetch(`${API_URL}/reviews`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit review');
  return res.json();
}

export async function updateReview(id, data) {
  const res = await fetch(`${API_URL}/reviews/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update review');
  return res.json();
}

export async function fetchPopularProducts() {
  try {
    const res = await fetch(`${API_URL}/products/popular`, { credentials: 'include', signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
    if (!res.ok) throw new Error('Failed to fetch popular products');
    return res.json();
  } catch {
    return localProducts
      .slice()
      .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
      .slice(0, 8)
      .map(normalizeLocalProduct);
  }
}

export async function fetchSettings() {
  const res = await fetch(`${API_URL}/settings`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(data, token) {
  const res = await fetch(`${API_URL}/admin/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

export async function resetSettings(token) {
  const res = await fetch(`${API_URL}/admin/settings`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to reset settings');
  return res.json();
}

export async function updateProduct(id, data, token) {
  const res = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
}

export async function fetchQuotes(token) {
  const res = await fetch(`${API_URL}/admin/quotes`, {
    credentials: 'include',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch quotes');
  return res.json();
}

export async function loginAdmin(username, password) {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  return res.json();
}

export async function addProduct(data, token) {
  const res = await fetch(`${API_URL}/admin/products`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add product');
  return res.json();
}

export async function deleteProduct(id, token) {
  const res = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
}

export async function toggleProductVisibility(id, token) {
  const res = await fetch(`${API_URL}/admin/products/${id}/toggle-visibility`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to toggle product visibility');
  return res.json();
}

export async function updateQuoteStatus(id, status, token) {
  const res = await fetch(`${API_URL}/admin/quotes/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to update quote status');
  return res.json();
}

export const getCart = () => apiFetch(`${API_URL}/customer/cart`);
export const addToCart = (productId, quantity = 1) => apiFetch(`${API_URL}/customer/cart`, { method: 'POST', body: { productId, quantity } });
export const removeFromCart = (productId) => apiFetch(`${API_URL}/customer/cart/${productId}`, { method: 'DELETE' });
export const updateCartQty = (productId, quantity) => apiFetch(`${API_URL}/customer/cart/${productId}/quantity`, { method: 'PUT', body: { quantity } });
export const clearCart = () => apiFetch(`${API_URL}/customer/cart`, { method: 'DELETE' });
export const toggleWishlist = (productId) => apiFetch(`${API_URL}/customer/wishlist`, { method: 'POST', body: { productId } });
export const getWishlist = () => apiFetch(`${API_URL}/customer/wishlist`);
export const getProfile = () => apiFetch(`${API_URL}/customer/profile`);
export const updateProfile = (data) => apiFetch(`${API_URL}/customer/profile`, { method: 'PUT', body: data });
export const getMyReviews = () => apiFetch(`${API_URL}/customer/reviews`);
export const addAddress = (addr) => apiFetch(`${API_URL}/customer/addresses`, { method: 'POST', body: addr });
export const deleteAddress = (index) => apiFetch(`${API_URL}/customer/addresses/${index}`, { method: 'DELETE' });
