require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

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
    migrations: {
      directory: require('path').resolve(__dirname, '../../../db/migrations'),
      extension: 'js',
    },
    seeds: {
      directory: require('path').resolve(__dirname, '../../../db/seeds'),
    },
  },
  production: {
    client: 'pg',
    connection: {
      host:     'localhost',
      port:     5432,
      database: 'delivery_rms',
      user:     'postgres',
      password: '@#1256!#',
    },
    migrations: {
      directory: require('path').resolve(__dirname, '../../../db/migrations'),
    },
    pool: { min: 2, max: 10 },
  },
};