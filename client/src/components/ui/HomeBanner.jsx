/**
 * client/src/components/ui/HomeBanner.jsx
 * Shows active festival/seasonal banners fetched from /api/v1/banners.
 * Auto-hides when no banners are active (between dates).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api/client';
import './HomeBanner.css';

export default function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/banners')
      .then((data) => setBanners(data.banners || []))
      .catch(() => {});
  }, []);

  // Auto-rotate if multiple banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const banner = banners[current];

  return (
    <div
      className="home-banner-festival"
      style={{ background: banner.bg_color, color: banner.text_color }}
    >
      <div className="home-banner-festival__content">
        {banner.emoji && (
          <span className="home-banner-festival__emoji">{banner.emoji}</span>
        )}
        <div className="home-banner-festival__text">
          <div className="home-banner-festival__title">{banner.title}</div>
          {banner.subtitle && (
            <div className="home-banner-festival__sub">{banner.subtitle}</div>
          )}
        </div>
        {banner.cta_label && banner.cta_link && (
          <button
            className="home-banner-festival__cta"
            style={{ color: banner.bg_color, background: banner.text_color }}
            onClick={() => navigate(banner.cta_link)}
          >
            {banner.cta_label}
          </button>
        )}
      </div>

      {/* Dots for multiple banners */}
      {banners.length > 1 && (
        <div className="home-banner-festival__dots">
          {banners.map((_, i) => (
            <button
              key={i}
              className={`home-banner-festival__dot${i === current ? ' active' : ''}`}
              onClick={() => setCurrent(i)}
              style={{ background: i === current ? banner.text_color : 'rgba(0,0,0,0.2)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
