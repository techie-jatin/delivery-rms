import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout           from './components/layout/Layout.jsx';
import Home             from './pages/Home.jsx';
import Login            from './pages/Login.jsx';
import Register         from './pages/Register.jsx';
import Cart             from './pages/Cart.jsx';
import Checkout         from './pages/Checkout.jsx';
import Orders           from './pages/Orders.jsx';
import Profile          from './pages/Profile.jsx';
import AdminDashboard   from './pages/admin/AdminDashboard.jsx';
import AdminOrders      from './pages/admin/AdminOrders.jsx';
import AdminProducts    from './pages/admin/AdminProducts.jsx';
import AdminZoneEditor  from './pages/AdminZoneEditor.jsx';

const Category    = () => <Stub name="Category"    phase="3.3" />;
const Product     = () => <Stub name="Product"     phase="3.3" />;
const OrderDetail = () => <Stub name="OrderDetail" phase="3.6" />;

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
        <Route path="/admin"          element={<AdminDashboard />} />
        <Route path="/admin/orders"   element={<AdminOrders />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/zones"    element={<AdminZoneEditor />} />
        <Route path="/admin/outlets"  element={<Stub name="Admin Outlets" phase="4.4" />} />
        <Route path="/*" element={
          <Layout>
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
              <Route path="*"              element={<Stub name="404" phase="—" />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}
