/**
 * db/migrations/001_initial_schema.js
 *
 * PostGIS-free version for Railway deployment.
 * delivery_zone stored as JSONB instead of PostGIS geometry.
 * Zone checks use Haversine + ray-casting in application code (deliveryZone.js).
 * PostGIS geometry column added back when moving to VPS (see docs/GEO_SWITCH.md).
 */

exports.up = async function (knex) {

  // ── users ─────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('email').notNullable().unique();
    t.string('phone', 15);
    t.string('password_hash').notNullable();
    t.enu('role', ['customer', 'admin']).notNullable().defaultTo('customer');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // ── outlets ───────────────────────────────────────────────────
  await knex.schema.createTable('outlets', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('address').notNullable();
    t.decimal('lat', 10, 7).notNullable();
    t.decimal('lng', 10, 7).notNullable();
    t.decimal('delivery_radius_km', 5, 2).defaultTo(5);
    t.decimal('free_delivery_above', 8, 2).defaultTo(499);
    t.jsonb('delivery_zone');   // GeoJSON polygon stored as JSONB (no PostGIS needed)
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // ── product_categories ────────────────────────────────────────
  await knex.schema.createTable('product_categories', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.string('image_url');
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // ── products ──────────────────────────────────────────────────
  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary();
    t.integer('category_id').notNullable().references('id').inTable('product_categories').onDelete('RESTRICT');
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.string('brand');
    t.text('description');
    t.string('image_url');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // ── product_variants ──────────────────────────────────────────
  await knex.schema.createTable('product_variants', (t) => {
    t.increments('id').primary();
    t.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('sku').notNullable().unique();
    t.decimal('price', 10, 2).notNullable();
    t.decimal('mrp', 10, 2);
    t.integer('stock').notNullable().defaultTo(0);
    t.integer('max_qty_per_order').notNullable().defaultTo(10);
    t.string('unit');
    t.string('image_url');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // ── carts ─────────────────────────────────────────────────────
  await knex.schema.createTable('carts', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('outlet_id').references('id').inTable('outlets');
    t.timestamps(true, true);
    t.unique('user_id');
  });

  // ── cart_items ────────────────────────────────────────────────
  await knex.schema.createTable('cart_items', (t) => {
    t.increments('id').primary();
    t.integer('cart_id').notNullable().references('id').inTable('carts').onDelete('CASCADE');
    t.integer('variant_id').notNullable().references('id').inTable('product_variants').onDelete('CASCADE');
    t.integer('quantity').notNullable().defaultTo(1);
    t.timestamps(true, true);
    t.unique(['cart_id', 'variant_id']);
  });

  // ── orders ────────────────────────────────────────────────────
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users');
    t.integer('outlet_id').notNullable().references('id').inTable('outlets');
    t.enu('status', ['confirmed','preparing','out_for_delivery','delivered','cancelled']).notNullable().defaultTo('confirmed');
    t.decimal('subtotal', 10, 2).notNullable();
    t.decimal('delivery_fee', 8, 2).notNullable().defaultTo(0);
    t.decimal('total', 10, 2).notNullable();
    t.decimal('delivery_lat', 10, 7);
    t.decimal('delivery_lng', 10, 7);
    t.text('delivery_address');
    t.integer('eta_minutes');
    t.timestamp('delivered_at');
    t.timestamps(true, true);
  });

  // ── order_items ───────────────────────────────────────────────
  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('variant_id').notNullable().references('id').inTable('product_variants');
    t.string('variant_name').notNullable();
    t.string('product_name').notNullable();
    t.decimal('price', 10, 2).notNullable();
    t.integer('quantity').notNullable();
    t.timestamps(true, true);
  });

  // ── banners ───────────────────────────────────────────────────
  await knex.schema.createTable('banners', (t) => {
    t.increments('id').primary();
    t.string('title').notNullable();
    t.string('subtitle');
    t.string('cta_label');
    t.string('cta_link');
    t.string('bg_color').defaultTo('#00e5a0');
    t.string('text_color').defaultTo('#0a0a0f');
    t.string('emoji');
    t.timestamp('starts_at').notNullable();
    t.timestamp('ends_at').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('sort_order').defaultTo(0);
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('banners');
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('cart_items');
  await knex.schema.dropTableIfExists('carts');
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('product_categories');
  await knex.schema.dropTableIfExists('outlets');
  await knex.schema.dropTableIfExists('users');
};
