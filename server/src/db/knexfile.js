/**
 * server/src/db/knexfile.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const path = require('path');

// __dirname = <repo_root>/server/src/db
// migrations = <repo_root>/db/migrations  (3 levels up, then into db/)
const migrationsDir = path.resolve(__dirname, '../../../db/migrations');
const seedsDir      = path.resolve(__dirname, '../../../db/seeds');

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host:     'localhost',
      port:     5432,
      database: 'delivery_rms',
      user:     'postgres',
      password: '@#1256!#',
    },
    migrations: { directory: migrationsDir, extension: 'js' },
    seeds:      { directory: seedsDir },
  },

  production: {
    client: 'pg',
    connection: process.env.DB_URL,
    migrations: { directory: migrationsDir },
    pool: { min: 2, max: 10 },
  },
};
