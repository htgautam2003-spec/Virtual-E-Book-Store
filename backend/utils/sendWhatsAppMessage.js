require("dotenv").config();
const twilio = require("twilio");

// ════════════════════════════════════════════════════════
// PHONE NUMBER NORMALIZER
// Handles ALL Indian number formats correctly:
//   9876543210        → +919876543210  ✅
//   919876543210      → +919876543210  ✅
//   +919876543210     → +919876543210  ✅
//   +91 98765 43210   → +919876543210  ✅
//   091-9876543210    → +919876543210  ✅
// ════════════════════════════════════════════════════════
function normalizeIndianPhone(phone) {
  // Step 1: Remove spaces, dashes, brackets, dots
  let p = phone.toString().replace(/[\s\-().]/g, "").replace(/[^0-9+]/g, "");

  // Step 2: Strip country code (+91 or 91 prefix)
  p = p.replace(/^\+91/, "").replace(/^91/, "");

  // Step 3: Keep only last 10 digits
  p = p.slice(-10);

  // Step 4: Validate — must be exactly 10 digits
  if (p.length !== 10 || !/^\d{10}$/.test(p)) {
    throw new Error(
      `Invalid phone number: "${phone}" → cleaned to "${p}" (expected 10 digits). ` +
      `Please provide a valid 10-digit Indian mobile number.`
    );
  }

  return "+91" + p;
}

// ════════════════════════════════════════════════════════
// SEND WHATSAPP ORDER CONFIRMATION
//
// Usage in server.js:
//   const { sendWhatsAppConfirmation } = require("./sendWhatsAppMessage");
//   const result = await sendWhatsAppConfirmation("9876543210", "Ravi Kumar", order);
//   console.log(result); // { success: true, sid: "SM..." }
//
// SANDBOX NOTE:
//   Twilio WhatsApp sandbox only sends to numbers that have opted in.
//   Customer must send: "join <your-keyword>" to +1 415 523 8886 on WhatsApp.
//   For live production use, upgrade to a Twilio-approved WhatsApp Business number.
// ════════════════════════════════════════════════════════
const sendWhatsAppConfirmation = async (customerPhone, customerName, order) => {

  // ── Step 1: Validate inputs ───────────────────────
  if (!customerPhone) {
    console.error("❌ WhatsApp skipped: No phone number provided");
    return { success: false, error: "No phone number provided" };
  }

  if (!customerName || customerName.trim() === "") {
    console.warn("⚠️  WhatsApp: No customer name provided — using 'Customer'");
    customerName = "Customer";
  }

  if (!order) {
    console.error("❌ WhatsApp skipped: No order data provided");
    return { success: false, error: "No order data provided" };
  }

  // ── Step 2: Check Twilio credentials ─────────────
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_FROM;

  console.log("🔑 Twilio credentials check:");
  console.log("   TWILIO_ACCOUNT_SID:   ", sid   ? "✅ Loaded" : "❌ MISSING — add to .env");
  console.log("   TWILIO_AUTH_TOKEN:    ", token ? "✅ Loaded" : "❌ MISSING — add to .env");
  console.log("   TWILIO_WHATSAPP_FROM: ", from  ? "✅ Loaded" : "❌ MISSING — add to .env");

  if (!sid || !token || !from) {
    console.error("❌ WhatsApp aborted: One or more Twilio env variables are missing.");
    console.error("   Add these to your .env file:");
    console.error("   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    console.error("   TWILIO_AUTH_TOKEN=your_auth_token_here");
    console.error("   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886");
    return { success: false, error: "Missing Twilio credentials in .env" };
  }

  try {
    // ── Step 3: Normalize phone number ───────────
    const toNumber = normalizeIndianPhone(customerPhone);
    console.log("📱 Sending WhatsApp to:", toNumber);

    // ── Step 4: Build order details ──────────────
    const books = order.books || [];
    const bookTitles = books.length > 0
      ? books.map((b, i) => `  ${i + 1}. ${b.title || "Book"}`).join("\n")
      : "  1. Books purchased";

    const totalDisplay = (!order.totalAmount || order.totalAmount === 0)
      ? "FREE 🎁"
      : `₹${order.totalAmount} ✅`;

    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit", month: "long", year: "numeric",
        })
      : new Date().toLocaleDateString("en-IN", {
          day: "2-digit", month: "long", year: "numeric",
        });

    // ── Step 5: Build message ─────────────────────
    const messageBody =
      `🎉 *Order Confirmed!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏪 *Virtual E-Book Store*\n\n` +
      `Hello *${customerName}*! 👋\n\n` +
      `Your order has been placed successfully!\n\n` +
      `📚 *Books Ordered:*\n${bookTitles}\n\n` +
      `🧾 *Order ID:*   ${order.orderId    || "N/A"}\n` +
      `💳 *Payment:*   ${order.paymentMethod || "Online"}\n` +
      `💰 *Total:*     ${totalDisplay}\n` +
      `📅 *Date:*      ${orderDate}\n\n` +
      `📧 Check your email for PDF download links!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for shopping with us! 🙏\n` +
      `📚 *Virtual E-Book Store*`;

    // ── Step 6: Send via Twilio ───────────────────
    const client   = twilio(sid, token);
    const response = await client.messages.create({
      from: from,                      // "whatsapp:+14155238886"
      to:   `whatsapp:${toNumber}`,   // "whatsapp:+919876543210"
      body: messageBody,
    });

    console.log("✅ WhatsApp sent successfully!");
    console.log("   SID:    ", response.sid);
    console.log("   Status: ", response.status);
    console.log("   To:     ", response.to);

    return {
      success: true,
      sid:     response.sid,
      status:  response.status,
    };

  } catch (err) {
    // ── Full error logging with fix hints ─────────
    console.error("❌ WhatsApp message failed!");
    console.error("   Error code:    ", err.code    || "N/A");
    console.error("   Error message: ", err.message || "Unknown error");
    console.error("   HTTP status:   ", err.status  || "N/A");
    if (err.moreInfo) {
      console.error("   More info:     ", err.moreInfo);
    }

    // Friendly hints for the most common Twilio errors
    const hints = {
      21608: "❗ This number has NOT opted into the Twilio sandbox.\n" +
             "   Ask the customer to open WhatsApp and send:\n" +
             "   'join <your-keyword>' to +1 415 523 8886",
      20003: "❗ Twilio authentication failed.\n" +
             "   Double-check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env",
      21211: "❗ Invalid 'To' phone number format.\n" +
             "   Check the customer's phone number: " + customerPhone,
      21614: "❗ 'To' number is not a valid mobile number.\n" +
             "   Landline numbers cannot receive WhatsApp messages.",
      63007: "❗ Twilio WhatsApp channel is not set up.\n" +
             "   Go to Twilio Console → Messaging → Try WhatsApp and activate sandbox.",
      63016: "❗ Message template not approved or free-form message outside 24hr window.\n" +
             "   In sandbox this usually means the customer needs to message you first.",
    };

    if (hints[err.code]) {
      console.error("\n   💡 How to fix:");
      console.error("  ", hints[err.code]);
    }

    return {
      success: false,
      error:   err.message,
      code:    err.code,
    };
  }
};

module.exports = { sendWhatsAppConfirmation };