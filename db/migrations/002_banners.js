/**
 * db/migrations/002_banners.js
 * Adds banners table for festival/seasonal homepage banners.
 * Admin creates banners with start/end dates — auto-show/hide.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('banners', (t) => {
    t.increments('id').primary();
    t.string('title').notNullable();
    t.string('subtitle');
    t.string('cta_label');          // button text e.g. "Shop Now"
    t.string('cta_link');           // where CTA goes e.g. "/category/dairy"
    t.string('bg_color').defaultTo('#00e5a0'); // banner background
    t.string('text_color').defaultTo('#0a0a0f');
    t.string('emoji');              // e.g. "🪔" for Diwali
    t.timestamp('starts_at').notNullable();
    t.timestamp('ends_at').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('sort_order').defaultTo(0);
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('banners');
};
