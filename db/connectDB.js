const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = `mongodb+srv://${process.env.USERID}:${process.env.PASSWORD}@cluster0.rdbtijm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

if (!uri) throw new Error("MONGODB_URI is not defined in .env");
console.log(uri);
const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db(process.env.USERID); // database name
    return db;
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

function getMessagesCollection() {
  if (!db) throw new Error("Database not initialized yet1");
  return db.collection("messages");
}

function getUsersCollection() {
  if(!db) throw new Error("Database not initialized yet2")
    return db.collection("users")
}


module.exports = { connectDB, getMessagesCollection, getUsersCollection };
