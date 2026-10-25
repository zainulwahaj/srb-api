const path = require('path');
const express = require('express');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const apiRoutes = require('./routes');

// Builds the Express app. server.js passes in the GraphQL middleware because
// Apollo has to be started (async) before it can be mounted.
function createApp({ graphql } = {}) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(healthRoutes);
  app.use('/api/v1', apiRoutes);
  if (graphql) app.use('/graphql', graphql);

  // these two must stay last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
