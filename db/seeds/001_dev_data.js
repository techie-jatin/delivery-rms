/**
 * db/seeds/001_dev_data.js
 * Sample data for local development.
 * Run: npm run db:seed
 *
 * Creates:
 *  - 1 admin user  (admin@delivery.local / admin123)
 *  - 1 outlet      (Kota city centre, 5km radius)
 *  - 2 categories  (Dairy, Health Drinks)
 *  - 2 products with variants incl. max_qty_per_order limits
 */

const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // Clear in reverse FK order
  await knex('order_items').del();
  await knex('orders').del();
  await knex('cart_items').del();
  await knex('carts').del();
  await knex('product_variants').del();
  await knex('products').del();
  await knex('product_categories').del();
  await knex('outlets').del();
  await knex('users').del();

  // ── Admin user ────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10);
  await knex('users').insert({
    name: 'Admin',
    email: 'admin@delivery.local',
    password_hash: passwordHash,
    role: 'admin',
  });

  // ── Outlet — Kota city centre ─────────────────────────────────
  // NOTE: Knex .returning('id') gives [{id: N}], so we destructure .id
  const [outletRow] = await knex('outlets').insert({
    name: 'Kota Main Store',
    address: 'Talwandi, Kota, Rajasthan 324005',
    lat: 25.1792,
    lng: 75.8394,
    delivery_radius_km: 5,
    free_delivery_above: 499,
    is_active: true,
  }).returning('id');
  const outletId = outletRow.id;

  // ── Categories ────────────────────────────────────────────────
  const [dairyRow, healthRow] = await knex('product_categories').insert([
    { name: 'Dairy', slug: 'dairy', sort_order: 1 },
    { name: 'Health Drinks', slug: 'health-drinks', sort_order: 2 },
  ]).returning('id');
  const dairyId  = dairyRow.id;
  const healthId = healthRow.id;

  // ── Products + Variants ───────────────────────────────────────
  const [horlicksRow] = await knex('products').insert({
    category_id: healthId,
    name: 'Horlicks',
    slug: 'horlicks',
    brand: 'GSK',
    description: 'Classic health drink mix',
  }).returning('id');
  const horlicksId = horlicksRow.id;

  await knex('product_variants').insert([
    {
      product_id: horlicksId,
      name: '500g',
      sku: 'HOR-500G',
      price: 189,
      mrp: 220,
      stock: 50,
      max_qty_per_order: 2,  // ← the Horlicks limit from your original idea
      unit: 'g',
    },
    {
      product_id: horlicksId,
      name: '1kg',
      sku: 'HOR-1KG',
      price: 349,
      mrp: 400,
      stock: 30,
      max_qty_per_order: 2,
      unit: 'g',
    },
  ]);

  const [amulRow] = await knex('products').insert({
    category_id: dairyId,
    name: 'Amul Butter',
    slug: 'amul-butter',
    brand: 'Amul',
    description: 'Pasteurised butter',
  }).returning('id');
  const amulId = amulRow.id;

  await knex('product_variants').insert({
    product_id: amulId,
    name: '500g',
    sku: 'AMB-500G',
    price: 245,
    mrp: 260,
    stock: 100,
    max_qty_per_order: 5,
    unit: 'g',
  });
};
