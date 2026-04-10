const express    = require("express");
const mongoose   = require("mongoose");
const dotenv     = require("dotenv");
const cors       = require("cors");
const path       = require("path");
const nodemailer = require("nodemailer");
const Razorpay   = require("razorpay");
const crypto     = require("crypto");

// ✅ MUST be first before anything else
dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ✅ Nodemailer Setup
const transporter = nodemailer.createTransport({
  host:   "smtp.gmail.com",
  port:   587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
  family: 4
});

// ✅ Email Function
async function sendOrderConfirmationEmail(customerEmail, customerName, order) {
  const bookList = order.books.map(b => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">${b.title}</td>
      <td style="padding:8px;border:1px solid #ddd;">${b.qty}</td>
      <td style="padding:8px;border:1px solid #ddd;">₹${b.price}</td>
      <td style="padding:8px;border:1px solid #ddd;">₹${b.price * b.qty}</td>
    </tr>`).join("");

  const mailOptions = {
    from:    `"📚 eBook Store" <${process.env.EMAIL_USER}>`,
    to:      customerEmail,
    subject: `✅ Order Confirmed! - Order ID: ${order.orderId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;padding:20px;">
        <h2 style="color:#4CAF50;text-align:center;">📚 Order Confirmation</h2>
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Thank you for your purchase! Your order has been placed successfully.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#f2f2f2;">
              <th style="padding:8px;border:1px solid #ddd;">Book</th>
              <th style="padding:8px;border:1px solid #ddd;">Qty</th>
              <th style="padding:8px;border:1px solid #ddd;">Price</th>
              <th style="padding:8px;border:1px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${bookList}</tbody>
        </table>
        <br/>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr><td style="padding:6px;"><strong>Order ID:</strong></td><td>${order.orderId}</td></tr>
          <tr><td style="padding:6px;"><strong>Payment:</strong></td><td>${order.paymentMethod}</td></tr>
          <tr><td style="padding:6px;"><strong>Total:</strong></td><td><strong>₹${order.totalAmount}</strong></td></tr>
          <tr><td style="padding:6px;"><strong>Status:</strong></td><td style="color:green;"><strong>✅ Completed</strong></td></tr>
          <tr><td style="padding:6px;"><strong>Date:</strong></td><td>${new Date().toLocaleDateString("en-IN")}</td></tr>
        </table>
        <br/>
        <p style="color:#888;font-size:13px;text-align:center;">Thank you for shopping with us! 🙏</p>
      </div>`,
  };

  await transporter.sendMail(mailOptions);
  console.log("📧 Email sent to:", customerEmail);
}

// ✅ Contact Form Email Function
async function sendContactEmail(name, email, phone, message) {
  const mailOptions = {
    from:    `"📚 eBook Store" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_USER,
    subject: `📩 New Contact Message from ${name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;padding:20px;">
        <h2 style="color:#7c3aed;">📩 New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Message:</strong></p>
        <p style="background:#f9f9f9;padding:12px;border-radius:8px;">${message}</p>
      </div>`,
  };
  await transporter.sendMail(mailOptions);
  console.log("📧 Contact email received from:", email);
}

// ✅ SCHEMAS
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
  orderId:       { type: String, unique: true },
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

// ✅ ROUTES

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

// API check
app.get("/api", (req, res) => {
  res.json({ message: "📚 API is running!" });
});

// ── BOOK ROUTES ──────────────────────────────
app.get("/api/books", async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/books", async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.status(201).json({ message: "✅ Book added!", book });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/books/:id", async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "🗑️ Book deleted!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ORDER ROUTES ──────────────────────────────
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
  } catch (err) {
    // ✅ Handle duplicate order gracefully
    if (err.code === 11000) {
      return res.status(200).json({ message: "✅ Order already recorded" });
    }
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── USER ROUTES ───────────────────────────────
app.post("/api/users", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: "✅ User saved!", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CONTACT ROUTE ─────────────────────────────
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required" });
    }
    await sendContactEmail(name, email, phone, message);
    res.json({ success: true, message: "✅ Message sent!" });
  } catch (err) {
    console.error("Contact email error:", err);
    res.status(500).json({ success: false, message: "❌ Failed to send email" });
  }
});

// ── PAYMENT ROUTES ────────────────────────────
// ✅ FIX — Razorpay created INSIDE route, not at top of file
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    // Free books — skip Razorpay
    if (!amount || amount === 0) {
      return res.json({
        success: true,
        order: { id: "FREE-" + Date.now(), amount: 0, currency: "INR" }
      });
    }

    // ✅ Create Razorpay instance here so .env is already loaded
    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount:   amount * 100,
      currency: "INR",
      receipt:  `receipt_${Date.now()}`,
    });

    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/payment/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "❌ Invalid signature" });
    }

    res.status(200).json({ success: true, message: "✅ Payment verified!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 404 HANDLER ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "❌ Route not found" });
});

// ── START SERVER ──────────────────────────────
app.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
  console.log("📚 Books:   http://localhost:" + PORT + "/api/books");
  console.log("📦 Orders:  http://localhost:" + PORT + "/api/orders");
  console.log("👤 Users:   http://localhost:" + PORT + "/api/users");
  console.log("📩 Contact: http://localhost:" + PORT + "/api/contact");
  console.log("💳 Payment: http://localhost:" + PORT + "/api/payment/create-order");
});