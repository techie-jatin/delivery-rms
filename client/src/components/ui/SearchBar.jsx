/**
 * client/src/components/ui/SearchBar.jsx
 * Phase 12 — Real-time product search
 * Searches via backend /api/v1/search?q=...
 * Shows results in a dropdown, click to open product detail.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api/client';
import './SearchBar.css';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function SearchBar() {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const navigate  = useNavigate();
  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced search
  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) { setResults([]); setLoading(false); return; }
      setLoading(true);
      try {
        const data = await api.get(`/search?q=${encodeURIComponent(q)}&limit=8`);
        setResults(data.hits || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250),
    []
  );

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      setLoading(true);
      doSearch(val);
    } else {
      setResults([]);
      setOpen(false);
      setLoading(false);
    }
  }

  function handleSelect(product) {
    navigate(`/product/${product.slug}`);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  const discount = (product) => {
    if (!product.variants?.[0]) return null;
    const v = product.variants[0];
    if (v.mrp && v.mrp > v.price) return Math.round((1 - v.price / v.mrp) * 100);
    return null;
  };

  return (
    <div className="searchbar" ref={wrapRef}>
      <div className="searchbar__input-wrap">
        <span className="searchbar__icon">🔍</span>
        <input
          ref={inputRef}
          className="searchbar__input"
          type="search"
          placeholder="Search products..."
          value={query}
          onChange={handleChange}
          onFocus={() => results.length && setOpen(true)}
          autoComplete="off"
        />
        {loading && <span className="searchbar__spinner" />}
        {query && !loading && (
          <button className="searchbar__clear" onClick={handleClear}>✕</button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="searchbar__dropdown">
          {results.map((product) => {
            const disc = discount(product);
            const price = product.price_min;
            return (
              <button
                key={product.id}
                className="searchbar__result"
                onClick={() => handleSelect(product)}
              >
                <div className="searchbar__result-img">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} />
                    : <span>🛒</span>
                  }
                </div>
                <div className="searchbar__result-info">
                  <div className="searchbar__result-name">{product.name}</div>
                  <div className="searchbar__result-meta">
                    {product.brand && <span>{product.brand} · </span>}
                    <span>{product.category_name}</span>
                  </div>
                </div>
                <div className="searchbar__result-price">
                  <span>₹{price?.toFixed(0)}</span>
                  {disc && <span className="searchbar__result-disc">{disc}% off</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && query && !loading && results.length === 0 && (
        <div className="searchbar__dropdown">
          <div className="searchbar__no-results">
            No results for "<strong>{query}</strong>"
          </div>
        </div>
      )}
    </div>
  );
}
