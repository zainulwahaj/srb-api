// Loads .env once and exposes the settings the rest of the app needs.
require('dotenv').config({ quiet: true });

const env = {
  port: Number(process.env.PORT) || 3000,
  mongoUrl: process.env.MONGO_URL,
  adminKey: process.env.ADMIN_KEY,
};

if (!env.mongoUrl) {
  console.error('MONGO_URL is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (!env.adminKey) {
  console.warn('ADMIN_KEY is not set, so nobody can connect to the /admin namespace.');
}

module.exports = env;
