const mongoose = require('mongoose');

// Fail early with a clear message if required settings are missing.
function checkEnv() {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(', ')}. Copy server/.env.example to server/.env and fill them in.`
    );
  }
  if (process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET is too short. Use at least 16 characters (preferably a long random string).');
  }
}

async function connectDB() {
  checkEnv();
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'jobtrack',
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
  } catch (err) {
    // Log only the error message; never print the connection string.
    throw new Error(`MongoDB connection failed: ${err.message}`);
  }
}

module.exports = connectDB;
