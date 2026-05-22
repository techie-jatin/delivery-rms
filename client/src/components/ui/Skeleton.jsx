/**
 * client/src/components/ui/Skeleton.jsx
 * Phase 11 — Skeleton loader
 *
 * Usage:
 *   <Skeleton width="100%" height="20px" />
 *   <Skeleton variant="card" />
 *   <Skeleton variant="product-card" />
 */

import './Skeleton.css';

export function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="skeleton-product-card">
      <div className="skeleton skeleton-product-card__img" />
      <div className="skeleton-product-card__body">
        <Skeleton width="40%" height="11px" />
        <Skeleton width="80%" height="14px" style={{ marginTop: '6px' }} />
        <Skeleton width="50%" height="11px" style={{ marginTop: '4px' }} />
        <Skeleton width="35%" height="16px" style={{ marginTop: '8px' }} />
        <Skeleton width="100%" height="32px" borderRadius="8px" style={{ marginTop: '10px' }} />
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="skeleton-order-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Skeleton width="80px" height="14px" />
          <Skeleton width="120px" height="11px" style={{ marginTop: '6px' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <Skeleton width="50px" height="14px" />
          <Skeleton width="80px" height="11px" style={{ marginTop: '6px' }} />
        </div>
      </div>
    </div>
  );
}
