/**
 * server/src/db/knexfile.js
 * Fixed for Railway deployment — uses __dirname-based absolute paths
 * so migrations work regardless of where Railway sets the working directory.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const path = require('path');

// When root dir = /server, migrations are at ../db/migrations (sibling of server/)
// When root dir = / (monorepo root), migrations are at ./db/migrations
// __dirname = /app/src/db (on Railway with root=/server)
// so migrations = /app/src/db/../../../db/migrations = /app/db/migrations ✓

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
