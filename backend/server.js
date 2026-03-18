const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected!"))
.catch((err) => console.log("❌ Error:", err));

const BookSchema = new mongoose.Schema({
    title:       { type: String, required: true },
    author:      { type: String, required: true },
    price:       { type: Number, default: 0 },
    tag:         { type: String, default: "new" },
    rating:      { type: String, default: "4.5" },
    reviews:     { type: String, default: "0" },
    img:         { type: String, default: "" },
    downloadUrl: { type: String, default: "#" },
    adminAdded:  { type: Boolean, default: false }
}, { timestamps: true });
const Book = mongoose.model("Book", BookSchema);

const OrderSchema = new mongoose.Schema({
    books:         [{ title: String, price: Number, qty: Number }],
    totalAmount:   Number,
    paymentMethod: String,
    orderId:       String,
    status:        { type: String, default: "completed" }
}, { timestamps: true });
const Order = mongoose.model("Order", OrderSchema);

const UserSchema = new mongoose.Schema({
    name:  String,
    email: String
}, { timestamps: true });
const User = mongoose.model("User", UserSchema);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/api", (req, res) => {
    res.json({ message: "📚 API is running!" });
});

app.get("/api/books", async (req, res) => {
    try {
        const books = await Book.find();
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/books", async (req, res) => {
    try {
        const book = new Book(req.body);
        await book.save();
        res.status(201).json({ message: "✅ Book added!", book });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete("/api/books/:id", async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.json({ message: "🗑️ Book deleted!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/orders", async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.status(201).json({ message: "✅ Order saved!", order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/users", async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json({ message: "✅ User saved!", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.use((req, res) => {
    res.status(404).json({ message: "❌ Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("🚀 Server running on http://localhost:" + PORT);
    console.log("📚 Books:  http://localhost:" + PORT + "/api/books");
    console.log("📦 Orders: http://localhost:" + PORT + "/api/orders");
    console.log("👤 Users:  http://localhost:" + PORT + "/api/users");
});