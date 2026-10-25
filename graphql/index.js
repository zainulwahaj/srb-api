const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');
const { unwrapResolverError } = require('@apollo/server/errors');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const { toApiError } = require('../middleware/errorHandler');

// Service errors (SLOT_FULL, STUDENT_NOT_FOUND ...) keep their code and
// status in "extensions", so GraphQL clients see the same codes as REST ones.
function formatError(formatted, error) {
  const apiErr = toApiError(unwrapResolverError(error));
  if (!apiErr) return formatted;
  return {
    message: apiErr.message,
    locations: formatted.locations,
    path: formatted.path,
    extensions: { code: apiErr.code || 'BAD_REQUEST', status: apiErr.status },
  };
}

async function createGraphQLMiddleware() {
  const server = new ApolloServer({ typeDefs, resolvers, formatError });
  await server.start();
  return { server, middleware: expressMiddleware(server) };
}

module.exports = createGraphQLMiddleware;
