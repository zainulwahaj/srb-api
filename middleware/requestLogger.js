// Prints one line per request once the response has been sent, e.g.
//   POST /api/v1/students/FA23-BAI-058/bookings 201 - 14.2 ms
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms.toFixed(1)} ms`);
  });

  next();
}

module.exports = requestLogger;
