/**
 * db/migrations/004_sellers.js
 * Adds sellers table and seller_id to products.
 */

exports.up = async function (knex) {

  // ── Add seller to users role check ───────────────────────────
  // Drop old constraint and add new one including 'seller'
  await knex.raw(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
  `);
  await knex.raw(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'admin', 'seller'))
  `);

  // ── sellers table ─────────────────────────────────────────────
  await knex.schema.createTable('sellers', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('shop_name').notNullable();
    t.string('shop_slug').notNullable().unique();
    t.text('shop_description');
    t.string('address').notNullable();
    t.string('phone', 15).notNullable();
    t.string('gstin', 15);
    t.string('bank_account');
    t.string('bank_ifsc');
    t.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    t.text('rejection_reason');
    t.boolean('is_active').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  // ── Add seller_id to products ─────────────────────────────────
  await knex.schema.alterTable('products', (t) => {
    t.integer('seller_id').references('id').inTable('sellers').onDelete('SET NULL');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('seller_id');
  });
  await knex.schema.dropTableIfExists('sellers');
  await knex.raw(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
  `);
  await knex.raw(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'admin'))
  `);
};
