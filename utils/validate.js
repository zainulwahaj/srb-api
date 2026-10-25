const mongoose = require('mongoose');
const ApiError = require('./ApiError');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Slot ids come from the URL or the body, so check them before Mongoose
// throws a CastError somewhere deeper.
function checkObjectId(id, name = 'id') {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id) || !/^[a-f\d]{24}$/i.test(id)) {
    throw ApiError.badRequest(`${name} is not a valid id`);
  }
  return id;
}

// "2026-11-02" style dates. new Date() alone would accept 2026-02-31.
function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function positiveInt(value, name, fallback, max) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest(`${name} must be a positive whole number`);
  return max ? Math.min(n, max) : n;
}

// The body has to be a plain JSON object, not an array or a string.
function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest('Request body must be a JSON object');
  }
  return body;
}

module.exports = { checkObjectId, isValidDate, positiveInt, requireObject };
