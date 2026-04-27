require('dotenv').config();
const nodemailer = require('nodemailer');

// Using YOUR variable names from .env
console.log('Gmail User:', process.env.EMAIL_USER);
console.log('Gmail Pass:', process.env.EMAIL_PASS ? '✅ Loaded' : '❌ Not loaded');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const mailOptions = {
  from: `"Virtual E-Book Store" <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER,
  subject: '✅ Test Email — Virtual E-Book Store',
  html: `
    <h1 style="color: #00b4d8;">Email is Working! 🎉</h1>
    <p>Hello Gautam! Your email setup is working!</p>
  `,
};

console.log('📧 Sending test email...');

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('❌ Email failed:', error.message);
  } else {
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  }
});