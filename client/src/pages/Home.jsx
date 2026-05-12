/**
 * client/src/pages/Home.jsx
 * Phase 3.2 — Homepage with location gate + product feed
 */

import { useState, useEffect } from 'react';
import GeoLocationPicker from '../components/geo/GeoLocationPicker.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { fetchOutlets } from '../services/api/outlets';
import { fetchProducts, fetchCategories } from '../services/api/products';
import './Home.css';

export default function Home() {
  const [outlets, setOutlets]         = useState([]);
  const [confirmed, setConfirmed]     = useState(null);
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    fetchOutlets()
      .then(setOutlets)
      .catch(() => setOutlets([]))
      .finally(() => setLoadingOutlets(false));
  }, []);

  useEffect(() => {
    if (!confirmed) return;
    setLoadingProducts(true);
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [confirmed]);

  const visibleProducts = activeCategory
    ? products.filter((p) => p.category_slug === activeCategory)
    : products;

  if (loadingOutlets) {
    return (
      <div className="home-loading">
        <span className="home-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="home-feed">
        <div className="home-banner">
          <div className="home-banner__left">
            <span className="home-banner__icon">📍</span>
            <div>
              <div className="home-banner__outlet">{confirmed.outlet?.name}</div>
              <div className="home-banner__meta">
                {confirmed.etaMinutes ? `~${confirmed.etaMinutes} min` : ''}
                {confirmed.fee === 0 ? ' · Free delivery' : confirmed.fee != null ? ` · ₹${confirmed.fee} delivery` : ''}
              </div>
            </div>
          </div>
          <button className="home-banner__change" onClick={() => setConfirmed(null)}>Change</button>
        </div>

        {categories.length > 0 && (
          <div className="home-categories">
            <button
              className={`home-cat-tab${!activeCategory ? ' home-cat-tab--active' : ''}`}
              onClick={() => setActiveCategory(null)}
            >All</button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`home-cat-tab${activeCategory === cat.slug ? ' home-cat-tab--active' : ''}`}
                onClick={() => setActiveCategory(cat.slug)}
              >{cat.name}</button>
            ))}
          </div>
        )}

        {loadingProducts ? (
          <div className="home-loading" style={{ minHeight: '200px' }}>
            <span className="home-spinner" />
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="home-empty"><p>No products found.</p></div>
        ) : (
          <div className="home-grid">
            {visibleProducts.flatMap((product) =>
              product.variants.map((variant) => (
                <ProductCard key={variant.id} product={product} variant={variant} />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="home-gate">
      <div className="home-gate__hero">
        <div className="home-gate__icon">🛒</div>
        <h1 className="home-gate__title">Delivery RMS</h1>
        <p className="home-gate__sub">Groceries delivered in minutes · Kota</p>
      </div>
      <GeoLocationPicker outlets={outlets} onConfirm={setConfirmed} />
    </div>
  );
}
