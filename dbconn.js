const db = require('mongoose');

async function dbconn() {
  try {
    await db.connect(
      process.env.DB_URI
    );
    return console.log("connected to database");
  } catch (error) {
    console.error("could not connect to database");
  }
}

module.exports = dbconn;