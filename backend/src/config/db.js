const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI);
  console.log('[db] MongoDB connected:', mongoose.connection.name);
  return mongoose.connection;
}

module.exports = { connectDb, mongoose };
