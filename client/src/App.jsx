/**
 * App.jsx
 * Router root. All routes defined here.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home           from './pages/Home.jsx';
import AdminZoneEditor from './pages/AdminZoneEditor.jsx';

const Category   = () => <Stub name="Category"     phase="3.2" />;
const Product    = () => <Stub name="Product"      phase="3.3" />;
const Cart       = () => <Stub name="Cart"         phase="3.4" />;
const Checkout   = () => <Stub name="Checkout"     phase="3.4" />;
const Orders     = () => <Stub name="Orders"       phase="3.6" />;
const OrderDetail= () => <Stub name="OrderDetail"  phase="3.6" />;
const Profile    = () => <Stub name="Profile"      phase="3.5" />;
const Login      = () => <Stub name="Login"        phase="3.5" />;
const Register   = () => <Stub name="Register"     phase="3.5" />;
const AdminDashboard = () => <Stub name="Admin Dashboard" phase="4.1" />;

function Stub({ name, phase }) {
  return (
    <div style={{ padding: '40px', fontFamily: 'Space Mono, monospace', color: '#6b6b88', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🚧</div>
      <strong style={{ color: '#f0f0f8' }}>{name}</strong>
      <p style={{ marginTop: '8px', fontSize: '0.8rem' }}>Built in Phase {phase}</p>
    </div>
  );
}

export default function App() {
  // GitHub Pages SPA fix: 404.html redirects unknown paths to /?p=<original-path>
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('p');
    if (redirectPath) {
      window.history.replaceState(null, '', '/delivery-rms' + redirectPath);
    }
  }

  return (
    <BrowserRouter basename="/delivery-rms">
      <Routes>
        <Route path="/"               element={<Home />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/product/:slug"  element={<Product />} />
        <Route path="/cart"           element={<Cart />} />
        <Route path="/checkout"       element={<Checkout />} />
        <Route path="/orders"         element={<Orders />} />
        <Route path="/orders/:id"     element={<OrderDetail />} />
        <Route path="/profile"        element={<Profile />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/admin/zones"    element={<AdminZoneEditor />} />
        <Route path="/admin/*"        element={<AdminDashboard />} />
        <Route path="*"              element={<Stub name="404" phase="—" />} />
      </Routes>
    </BrowserRouter>
  );
}
