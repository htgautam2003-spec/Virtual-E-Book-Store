const express    = require("express");
const mongoose   = require("mongoose");
const dotenv     = require("dotenv");
const cors       = require("cors");
const path       = require("path");
const nodemailer = require("nodemailer");
const Razorpay   = require("razorpay");
const crypto     = require("crypto");
const twilio     = require("twilio");

// ✅ MUST be first before anything else
dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));

// ── MONGODB ───────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ── NODEMAILER SETUP ──────────────────────────────────
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

// ── TWILIO WHATSAPP CLIENT ────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ═════════════════════════════════════════════════════
// SCHEMAS
// ═════════════════════════════════════════════════════
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
  books:         { type: Array, default: [] },
  totalAmount:   { type: Number, default: 0 },
  paymentMethod: { type: String, default: "Razorpay" },
  orderId:       { type: String, unique: true, sparse: true },
  customerName:  { type: String, default: "" },
  customerEmail: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  status:        { type: String, default: "completed" }
}, { timestamps: true });
const Order = mongoose.model("Order", OrderSchema);

const UserSchema = new mongoose.Schema({
  name:     String,
  email:    { type: String, unique: true, sparse: true },
  photo:    String,
  provider: String,
}, { timestamps: true });
const User = mongoose.model("User", UserSchema);

// ═════════════════════════════════════════════════════
// EMAIL FUNCTIONS
// ═════════════════════════════════════════════════════
async function sendOrderConfirmationEmail(customerEmail, customerName, order) {
  try {
    const books    = order.books || [];
    const bookList = books.length > 0
      ? books.map(b => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${b.title || "Book"}</td>
            <td style="padding:8px;border:1px solid #ddd;">${b.qty || 1}</td>
            <td style="padding:8px;border:1px solid #ddd;">₹${b.price || 0}</td>
            <td style="padding:8px;border:1px solid #ddd;">₹${(b.price || 0) * (b.qty || 1)}</td>
          </tr>`).join("")
      : `<tr><td colspan="4" style="padding:8px;text-align:center;">Books purchased</td></tr>`;

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
            <tr><td style="padding:6px;"><strong>Order ID:</strong></td><td>${order.orderId || "N/A"}</td></tr>
            <tr><td style="padding:6px;"><strong>Payment:</strong></td><td>${order.paymentMethod || "Online"}</td></tr>
            <tr><td style="padding:6px;"><strong>Total:</strong></td><td><strong>₹${order.totalAmount || 0}</strong></td></tr>
            <tr><td style="padding:6px;"><strong>Status:</strong></td><td style="color:green;"><strong>✅ Completed</strong></td></tr>
            <tr><td style="padding:6px;"><strong>Date:</strong></td><td>${new Date().toLocaleDateString("en-IN")}</td></tr>
          </table>
          <br/>
          <p style="color:#888;font-size:13px;text-align:center;">Thank you for shopping with us! 🙏</p>
        </div>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Email sent to:", customerEmail);
  } catch (err) {
    console.error("❌ Email failed:", err.message);
  }
}

async function sendContactEmail(name, email, phone, message) {
  try {
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
  } catch (err) {
    console.error("❌ Contact email failed:", err.message);
  }
}

// ═════════════════════════════════════════════════════
// ✅ WHATSAPP FUNCTION
// ═════════════════════════════════════════════════════
async function sendWhatsAppMessage(customerPhone, customerName, order) {
  try {
    console.log("📱 Attempting WhatsApp to:", customerPhone);
    console.log("TWILIO_SID:",   process.env.TWILIO_ACCOUNT_SID  ? "✅ Loaded" : "❌ Missing");
    console.log("TWILIO_TOKEN:", process.env.TWILIO_AUTH_TOKEN    ? "✅ Loaded" : "❌ Missing");
    console.log("TWILIO_FROM:",  process.env.TWILIO_WHATSAPP_FROM ? "✅ Loaded" : "❌ Missing");

    // Clean phone number — remove spaces, +91 prefix
    const cleanPhone = customerPhone
      .toString()
      .replace(/\s+/g, "")
      .replace(/^(\+91|91)/, "");

    console.log("📱 Sending to: +91" + cleanPhone);

    // Build book list
    const books      = order.books || [];
    const bookTitles = books.length > 0
      ? books.map(b => `• ${b.title}`).join("\n")
      : "• Books purchased";

    const message = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   `whatsapp:+91${cleanPhone}`,
      body:
        `🎉 *Order Confirmed!*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏪 *Virtual E-Book Store*\n\n` +
        `Hello *${customerName}*! 👋\n\n` +
        `Your order has been placed successfully!\n\n` +
        `📚 *Books Ordered:*\n${bookTitles}\n\n` +
        `🧾 *Order ID:* ${order.orderId || "N/A"}\n` +
        `💳 *Payment:* ${order.paymentMethod || "Online"}\n` +
        `💰 *Total:* ${order.totalAmount === 0 ? "FREE 🎁" : `₹${order.totalAmount} ✅`}\n` +
        `📅 *Date:* ${new Date().toLocaleDateString("en-IN")}\n\n` +
        `📧 Check your email for confirmation!\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Thank you for shopping! 🙏\n` +
        `📚 *Virtual E-Book Store*`
    });

    console.log("✅ WhatsApp sent! SID:", message.sid);
    return true;
  } catch (err) {
    console.error("❌ WhatsApp error:", err.message);
    return false;
  }
}

// ═════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════

// ── HEALTH ROUTE ──────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    time:   new Date(),
    uptime: Math.floor(process.uptime()) + "s"
  });
});

// ── STATIC PAGES ──────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});
app.get("/report", (req, res) => {
  res.sendFile(path.join(__dirname, "../report.html"));
});

// ── ROBOTS.TXT ────────────────────────────────────────
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(
    "User-agent: *\n" +
    "Allow: /\n" +
    "Sitemap: https://virtual-e-book-store.onrender.com/sitemap.xml"
  );
});

// ── SITEMAP.XML ───────────────────────────────────────
app.get("/sitemap.xml", (req, res) => {
  const base = "https://virtual-e-book-store.onrender.com";
  res.type("application/xml");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n` +
    `  <url><loc>${base}/blog-1.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n` +
    `  <url><loc>${base}/blog-2.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n` +
    `</urlset>`
  );
});

// ── API CHECK ─────────────────────────────────────────
app.get("/api", (req, res) => {
  res.json({ message: "📚 API is running!" });
});

// ── LIVE STATS ────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const [bookCount, userCount, orderCount, revenueData] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ])
    ]);
    res.json({
      books:   bookCount,
      users:   userCount,
      orders:  orderCount,
      revenue: revenueData[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── BOOK ROUTES ───────────────────────────────────────
app.get("/api/books", async (req, res) => {
  try {
    const { sort, limit } = req.query;
    let query = Book.find();
    if (sort === "newest") query = query.sort({ createdAt: -1 });
    if (limit)             query = query.limit(parseInt(limit));
    const books = await query;
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/books/featured", async (req, res) => {
  try {
    let books = await Book.find({
      tag: { $in: ["popular", "featured", "new", "premium"] }
    }).sort({ createdAt: -1 }).limit(8);
    if (books.length === 0) {
      books = await Book.find().sort({ createdAt: -1 }).limit(8);
    }
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/books/recent", async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 }).limit(6);
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

app.put("/api/books/:id", async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ message: "✅ Book updated!", book });
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

// ── ORDER ROUTES ──────────────────────────────────────
app.post("/api/orders", async (req, res) => {
  try {
    console.log("📦 New order:", req.body.customerName, "| Phone:", req.body.customerPhone);

    const order = new Order(req.body);
    await order.save();

    // ✅ Send Email
    if (req.body.customerEmail) {
      await sendOrderConfirmationEmail(
        req.body.customerEmail,
        req.body.customerName || "Customer",
        order
      );
    }

    // ✅ Send WhatsApp
    if (req.body.customerPhone) {
      await sendWhatsAppMessage(
        req.body.customerPhone,
        req.body.customerName || "Customer",
        order
      );
    }

    res.status(201).json({
      message: "✅ Order saved, Email & WhatsApp sent!",
      order
    });
  } catch (err) {
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

// ── USER ROUTES ───────────────────────────────────────
app.post("/api/users", async (req, res) => {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) {
      return res.status(200).json({ message: "✅ User exists", user: existing });
    }
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

// ── CONTACT ROUTE ─────────────────────────────────────
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Name, email and message are required"
      });
    }
    await sendContactEmail(name, email, phone, message);
    res.json({ success: true, message: "✅ Message sent!" });
  } catch (err) {
    console.error("Contact email error:", err);
    res.status(500).json({ success: false, message: "❌ Failed to send email" });
  }
});

// ── PAYMENT ROUTES ────────────────────────────────────
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount === 0) {
      return res.json({
        success: true,
        order: { id: "FREE-" + Date.now(), amount: 0, currency: "INR" }
      });
    }
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

// ── CUSTOM 404 — Must be last ─────────────────────────
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "❌ Route not found" });
  }
  res.status(404).sendFile(path.join(__dirname, "../404.html"));
});

// ── START SERVER ──────────────────────────────────────
app.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
  console.log("❤️  Health:    http://localhost:" + PORT + "/health");
  console.log("📊 Stats:     http://localhost:" + PORT + "/api/stats");
  console.log("📚 Books:     http://localhost:" + PORT + "/api/books");
  console.log("⭐ Featured:  http://localhost:" + PORT + "/api/books/featured");
  console.log("🆕 Recent:    http://localhost:" + PORT + "/api/books/recent");
  console.log("📦 Orders:    http://localhost:" + PORT + "/api/orders");
  console.log("👤 Users:     http://localhost:" + PORT + "/api/users");
  console.log("📩 Contact:   http://localhost:" + PORT + "/api/contact");
  console.log("💳 Payment:   http://localhost:" + PORT + "/api/payment/create-order");
  console.log("💬 WhatsApp:  Twilio integrated ✅");
});