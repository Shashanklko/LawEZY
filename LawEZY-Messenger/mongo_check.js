const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.MONGO_URI;

async function run() {
    try {
        console.log("Attempting to connect to MongoDB via Mongoose...");
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log("SUCCESS: Connected to MongoDB cluster.");
        console.log("Database Name:", mongoose.connection.name);
    } catch (err) {
        console.error("FAILURE: Could not connect to MongoDB.");
        console.error("Error Message:", err.message);
        
        if (err.message.includes("whitelist")) {
            console.log("\n💡 DIAGNOSIS: Your IP address is not whitelisted in MongoDB Atlas.");
        } else if (err.message.includes("Authentication failed")) {
            console.log("\n💡 DIAGNOSIS: Incorrect username or password.");
        } else if (err.message.includes("timed out")) {
            console.log("\n💡 DIAGNOSIS: Connection timed out. This is usually an IP whitelist issue or firewall.");
        }
    } finally {
        await mongoose.disconnect();
    }
}
run();
