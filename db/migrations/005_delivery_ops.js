/**
 * db/migrations/005_delivery_ops.js
 * Adds riders table and delivery OTP fields to orders.
 */

exports.up = async function (knex) {

  // ── riders ────────────────────────────────────────────────────
  await knex.schema.createTable('riders', (t) => {
    t.increments('id').primary();
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('phone', 15).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_available').notNullable().defaultTo(true); // on shift or not
    t.timestamps(true, true);
  });

  // ── Add delivery ops columns to orders ────────────────────────
  await knex.schema.alterTable('orders', (t) => {
    t.integer('rider_id').references('id').inTable('riders').onDelete('SET NULL');
    t.string('delivery_otp', 6);        // 4-digit OTP
    t.timestamp('otp_verified_at');     // when rider confirmed delivery
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('orders', (t) => {
    t.dropColumn('rider_id');
    t.dropColumn('delivery_otp');
    t.dropColumn('otp_verified_at');
  });
  await knex.schema.dropTableIfExists('riders');
};
