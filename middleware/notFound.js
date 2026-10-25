const ApiError = require('../utils/ApiError');

// Reached only when no route matched.
function notFound(req, res, next) {
  next(ApiError.notFound('Route not found'));
}

module.exports = notFound;
