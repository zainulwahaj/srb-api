const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// Turns any error into the same JSON shape:
//   { "error": { "status": 404, "message": "Route not found" } }
// Express 5 forwards rejected promises from async handlers here on its own.
function toApiError(err) {
  if (!err) return null;
  if (err instanceof ApiError) return err;

  // express.json() could not parse the body
  if (err.type === 'entity.parse.failed') return ApiError.badRequest('Request body is not valid JSON');
  if (err.type === 'entity.too.large') return new ApiError(413, 'Request body is too large');

  // Schema rules (required, min, enum, match ...) failed
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((e) => (e.name === 'CastError' ? `${e.path} must be a ${e.kind.toLowerCase()}` : e.message))
      .join('; ');
    return ApiError.unprocessable(message, 'VALIDATION_ERROR');
  }
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }
  // Unique index hit (two requests raced past the "already exists" check)
  if (err.code === 11000) return ApiError.conflict('Duplicate value', 'DUPLICATE');

  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiErr = toApiError(err);

  if (!apiErr) {
    console.error(err);
    return res.status(500).json({ error: { status: 500, message: 'Internal server error' } });
  }

  const body = { status: apiErr.status, message: apiErr.message };
  if (apiErr.code) body.code = apiErr.code;
  res.status(apiErr.status).json({ error: body });
}

module.exports = errorHandler;
module.exports.toApiError = toApiError;
