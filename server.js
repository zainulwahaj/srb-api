const http = require('http');
const mongoose = require('mongoose');
const env = require('./config/env');
const connectDB = require('./config/db');
const createApp = require('./app');
const createGraphQLMiddleware = require('./graphql');
const initSockets = require('./sockets');

async function start() {
  await connectDB(env.mongoUrl);
  // create the unique indexes before the first request can race them
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  const graphql = await createGraphQLMiddleware();
  const app = createApp({ graphql: graphql.middleware });
  const httpServer = http.createServer(app);
  const io = initSockets(httpServer, { adminKey: env.adminKey });

  httpServer.listen(env.port, () => {
    console.log(`srb-api listening on http://localhost:${env.port}`);
    console.log(`  board:   http://localhost:${env.port}/board.html?room=ROOM-01`);
    console.log(`  graphql: http://localhost:${env.port}/graphql`);
  });

  let closing = false;
  async function shutdown(signal) {
    if (closing) return;
    closing = true;
    console.log(`${signal} received, shutting down`);
    io.close();
    await graphql.server.stop();
    await mongoose.disconnect();
    process.exit(0);
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Could not start the server:', err.message);
  process.exit(1);
});
