const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected!"))
.catch((err) => console.log("❌ Error:", err));

// ✅ Nodemailer Setup - IPv4 Force
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    },
    family: 4
});

// ✅ Email Function
async function sendOrderConfirmationEmail(customerEmail, customerName, order) {
    const bookList = order.books.map(b => `
        <tr>
            <td style="padding:8px; border:1px solid #ddd;">${b.title}</td>
            <td style="padding:8px; border:1px solid #ddd;">${b.qty}</td>
            <td style="padding:8px; border:1px solid #ddd;">₹${b.price}</td>
            <td style="padding:8px; border:1px solid #ddd;">₹${b.price * b.qty}</td>
        </tr>
    `).join("");

    const mailOptions = {
        from: `"📚 eBook Store" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `✅ Order Confirmed! - Order ID: ${order.orderId}`,
        html: `
            <div style="font-family:Arial,sans-serif; max-width:600px; margin:auto; border:1px solid #ddd; border-radius:10px; padding:20px;">
                <h2 style="color:#4CAF50; text-align:center;">📚 Order Confirmation</h2>
                <p>Hi <strong>${customerName}</strong>,</p>
                <p>Thank you for your purchase! Your order has been placed successfully.</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th style="padding:8px; border:1px solid #ddd;">Book</th>
                            <th style="padding:8px; border:1px solid #ddd;">Qty</th>
                            <th style="padding:8px; border:1px solid #ddd;">Price</th>
                            <th style="padding:8px; border:1px solid #ddd;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${bookList}</tbody>
                </table>
                <br/>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr><td style="padding:6px;"><strong>Order ID:</strong></td><td>${order.orderId}</td></tr>
                    <tr><td style="padding:6px;"><strong>Payment Method:</strong></td><td>${order.paymentMethod}</td></tr>
                    <tr><td style="padding:6px;"><strong>Total Amount:</strong></td><td><strong>₹${order.totalAmount}</strong></td></tr>
                    <tr><td style="padding:6px;"><strong>Status:</strong></td><td style="color:green;"><strong>✅ Completed</strong></td></tr>
                    <tr><td style="padding:6px;"><strong>Order Date:</strong></td><td>${new Date().toLocaleDateString("en-IN")}</td></tr>
                </table>
                <br/>
                <p style="color:#888; font-size:13px; text-align:center;">Thank you for shopping with us! 🙏</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Email sent to:", customerEmail);
}

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
    customerName:  String,
    customerEmail: String,
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

        if (req.body.customerEmail) {
            await sendOrderConfirmationEmail(
                req.body.customerEmail,
                req.body.customerName || "Customer",
                order
            );
        }

        res.status(201).json({ message: "✅ Order saved & Email sent!", order });
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


 