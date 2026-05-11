/**
 * db/migrations/001_initial_schema.js
 * ─────────────────────────────────────────────────────────────────
 * Creates all core tables for Phase 1.
 * PostGIS extension must be installed on the database.
 *
 * Run: npm run db:migrate
 * Rollback: npm run db:rollback
 * ─────────────────────────────────────────────────────────────────
 */

exports.up = async function (knex) {

  // ── Enable PostGIS ────────────────────────────────────────────
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');

  // ── users ─────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('email').notNullable().unique();
    t.string('phone', 15);
    t.string('password_hash').notNullable();
    t.enu('role', ['customer', 'admin']).notNullable().defaultTo('customer');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true); // created_at, updated_at
  });

  // ── outlets ───────────────────────────────────────────────────
  // One outlet = one dark store / warehouse / shop
  await knex.schema.createTable('outlets', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('address').notNullable();
    t.decimal('lat', 10, 7).notNullable();
    t.decimal('lng', 10, 7).notNullable();
    t.decimal('delivery_radius_km', 5, 2).defaultTo(5); // fallback if no polygon
    t.decimal('free_delivery_above', 8, 2).defaultTo(499); // cart total for free delivery
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // delivery_zone: PostGIS GEOMETRY column — added separately
  // (Knex doesn't have a built-in type for PostGIS geometry)
  await knex.raw(`
    ALTER TABLE outlets
    ADD COLUMN delivery_zone geometry(Polygon, 4326)
  `);
  await knex.raw(`
    CREATE INDEX idx_outlets_delivery_zone
    ON outlets USING GIST (delivery_zone)
  `);

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
  // Each variant = one purchasable unit (e.g. Horlicks 500g, Horlicks 1kg)
  await knex.schema.createTable('product_variants', (t) => {
    t.increments('id').primary();
    t.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('name').notNullable();           // e.g. "500g", "1kg"
    t.string('sku').notNullable().unique();
    t.decimal('price', 10, 2).notNullable();
    t.decimal('mrp', 10, 2);                  // max retail price (for showing discount)
    t.integer('stock').notNullable().defaultTo(0);
    t.integer('max_qty_per_order').notNullable().defaultTo(10); // THE quantity limit
    t.string('unit');                          // e.g. "g", "kg", "ml", "pcs"
    t.string('image_url');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // ── carts ─────────────────────────────────────────────────────
  // One active cart per user. Recreated fresh after order placed.
  await knex.schema.createTable('carts', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('outlet_id').references('id').inTable('outlets'); // which outlet serves this cart
    t.timestamps(true, true);
    t.unique('user_id'); // one cart per user
  });

  // ── cart_items ────────────────────────────────────────────────
  await knex.schema.createTable('cart_items', (t) => {
    t.increments('id').primary();
    t.integer('cart_id').notNullable().references('id').inTable('carts').onDelete('CASCADE');
    t.integer('variant_id').notNullable().references('id').inTable('product_variants').onDelete('CASCADE');
    t.integer('quantity').notNullable().defaultTo(1);
    t.timestamps(true, true);
    t.unique(['cart_id', 'variant_id']); // no duplicate rows
  });

  // ── orders ────────────────────────────────────────────────────
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users');
    t.integer('outlet_id').notNullable().references('id').inTable('outlets');
    t.enu('status', [
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ]).notNullable().defaultTo('confirmed');
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
    t.string('variant_name').notNullable(); // snapshot at time of order
    t.string('product_name').notNullable(); // snapshot at time of order
    t.decimal('price', 10, 2).notNullable(); // snapshot at time of order
    t.integer('quantity').notNullable();
    t.timestamps(true, true);
  });

};

exports.down = async function (knex) {
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
