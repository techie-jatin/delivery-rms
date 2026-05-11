/**
 * client/src/pages/Home.jsx
 * Phase 3.2 will build this out fully.
 * For now: boots the app and shows the location gate.
 */

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '24px',
      fontFamily: 'Space Mono, monospace',
    }}>
      <div style={{ fontSize: '2.5rem' }}>🛒</div>
      <h1 style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: '1.8rem',
        fontWeight: 800,
        background: 'linear-gradient(135deg, #00e5a0, #00b4d8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Delivery RMS
      </h1>
      <p style={{ color: '#6b6b88', fontSize: '0.8rem' }}>
        Phase 0 complete — repo is alive ✓
      </p>
      <p style={{ color: '#6b6b88', fontSize: '0.75rem' }}>
        Full homepage built in Phase 3.2
      </p>
    </div>
  );
}
