/**
 * db/migrations/003_payment_fields.js
 * Adds payment_method, payment_id, razorpay_order_id to orders table.
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('orders', (t) => {
    t.string('payment_method').defaultTo('cod');   // 'cod' | 'online'
    t.string('payment_id');                         // Razorpay payment ID
    t.string('razorpay_order_id');                  // Razorpay order ID
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('orders', (t) => {
    t.dropColumn('payment_method');
    t.dropColumn('payment_id');
    t.dropColumn('razorpay_order_id');
  });
};
