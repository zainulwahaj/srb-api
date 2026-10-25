const mongoose = require('mongoose');

async function connectDB(url) {
  await mongoose.connect(url);
  console.log(`MongoDB connected (${mongoose.connection.name})`);
}

module.exports = connectDB;
