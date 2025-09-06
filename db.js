const { MongoClient } = require("mongodb");
const uri =
  "mongodb+srv://nomas:Ckvn3WqrsVG6Ahcm@youtube.iakosuk.mongodb.net/chatApp?retryWrites=true&w=majority";

const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db("chatApp"); // database name
    return db;
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

function getMessagesCollection() {
  if (!db) throw new Error("Database not initialized yet");
  return db.collection("messages");
}

function getUsersCollection() {
  if(!db) throw new Error("Database not initialized yet")
    return db.collection("users")
}

function getRoomCollection() {
  if(!db) throw new Error("Database not initialized yet")
    return db.collection("rooms")
}

module.exports = { connectDB, getMessagesCollection, getUsersCollection, getRoomCollection };
