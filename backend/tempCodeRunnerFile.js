const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.log("MongoDB Error:", err);
});

// Sample Schema
const UserSchema = new mongoose.Schema({
    name: String,
    email: String
});

const User = mongoose.model("User", UserSchema);

// Home Route
app.get("/", (req, res) => {
    res.send("Server is running successfully 🚀");
});

// Create User API
app.post("/user", async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Users
app.get("/users", async (req, res) => {
    const users = await User.find();
    res.json(users);
});

// 404 Route (Important Fix)
app.use((req, res) => {
    res.status(404).send("Route not found");
});

// PORT for Render
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
