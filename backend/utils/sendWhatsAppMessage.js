require('dotenv').config();
const twilio = require('twilio');

const sendWhatsAppConfirmation = async (customer, order, books) => {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const totalAmount = books.reduce((sum, b) => sum + (b.price || 0), 0);
    const bookTitles = books.map((b, i) => `  ${i + 1}. ${b.title}`).join('\n');
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    let customerPhone = customer.phone?.toString().replace(/\s/g, '');
    if (!customerPhone) {
      console.log('No phone number provided');
      return { success: false, error: 'No phone number' };
    }
    if (!customerPhone.startsWith('+')) {
      customerPhone = `+91${customerPhone}`;
    }

    const message = `
🎉 *Order Confirmed!*
━━━━━━━━━━━━━━━━━━━━
🏪 *Virtual E-Book Store*

Hello *${customer.name}*! 👋

Your order has been successfully placed!

📦 *Order Details*
Order ID : #${order.orderId}
Date     : ${orderDate}
Payment  : ${order.paymentMethod}
Amount   : ${totalAmount === 0 ? 'FREE 🎁' : `₹${totalAmount} ✅`}

📚 *Books Ordered*
${bookTitles}

📧 Check your email for PDF download!

━━━━━━━━━━━━━━━━━━━━
Thank you for shopping! 🙏
    `.trim();

    const response = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${customerPhone}`,
      body: message,
    });

    console.log(`✅ WhatsApp sent! SID: ${response.sid}`);
    return { success: true, sid: response.sid };

  } catch (error) {
    console.error('❌ WhatsApp failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendWhatsAppConfirmation };