/**
 * server/src/db/index.js
 * Single Knex instance shared across the whole server.
 * Import as: const db = require('../db');
 */

const knex = require('knex');
const config = require('./knexfile');

const env = process.env.NODE_ENV || 'development';
const db = knex(config[env]);

module.exports = db;
