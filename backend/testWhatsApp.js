require('dotenv').config();
const { sendWhatsAppConfirmation } = require('./utils/sendWhatsAppMessage');

// Test data
const customer = {
  name: 'Gautam Kumar',
  phone: '9835473590',
};

const order = {
  orderId: 'TEST-001',
  createdAt: new Date(),
  paymentMethod: 'Razorpay',
  paymentStatus: 'paid',
};

const books = [
  {
    title: 'JavaScript The Good Parts',
    author: 'Douglas Crockford',
    category: 'Programming',
    price: 299,
  }
];

console.log('📱 Sending WhatsApp message...');
sendWhatsAppConfirmation(customer, order, books)
  .then(result => {
    if (result.success) {
      console.log('✅ WhatsApp sent successfully!');
      console.log('Message SID:', result.sid);
    } else {
      console.log('❌ Failed:', result.error);
    }
  });