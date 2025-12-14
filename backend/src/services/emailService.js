const nodemailer = require('nodemailer');


// Config transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465, // true nếu port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});




// Check connection
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email transporter ready');
  }
});

// Templates
const templates = {
  FORGOT_PASSWORD: (data) => ({
    subject: 'Reset your password',
    html: `
    <h1>Hello, ${data.fullName}</h1>
    <p>You requested to reset your password.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${process.env.CLIENT_URL}/reset-password?token=${data.token}">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>— TechStore Team</p>
  `,
    text: `
    Hello, ${data.fullName}!
    You requested to reset your password.
    Open the link to reset: ${process.env.CLIENT_URL}/reset-password?token=${data.token}
    This link will expire in 1 hour.
    — TechStore Team
  `
  }),

  REGISTER_SUCCESS: (data) => ({
    subject: 'Welcome to TechStore!',
    html: `
      <h1>Welcome, ${data.fullName}!</h1>
      <p>Your account has been successfully created.</p>
      <p>We’re excited to have you on board.</p>
      <p>— TechStore Team</p>
    `,
    text: `
      Welcome, ${data.fullName}!
      Your account has been successfully created.
      We're excited to have you on board.
      — TechStore Team
    `,
  }),

  ORDER_SUCCESS: (data) => ({
    subject: `Order #${data.orderNumber} Confirmation`,
    html: `
      <h1>Thank you for your order, ${data.fullName}!</h1>
      <p>Your order <b>#${data.orderNumber}</b> has been successfully placed.</p>
      <p>Total Amount: <b>${data.totalAmount} USD</b></p>
      <p>We will notify you once your order is shipped.</p>
      <p>— TechStore Team</p>
    `,
    text: `
      Thank you for your order, ${data.fullName}!
      Your order #${data.orderNumber} has been successfully placed.
      Total Amount: ${data.totalAmount} USD
      We will notify you once your order is shipped.
      — TechStore Team
    `,
  }),

  VN_PAY_SUCCESS: (data) => ({
    subject: `Payment Successful for Order #${data.orderNumber}`,
    html: `
      <h1>Payment Confirmed, ${data.fullName}!</h1>
      <p>Your payment for order <b>#${data.orderNumber}</b> has been successfully processed via VNPay.</p>
      <p><b>Order Total:</b> ${data.totalAmount} USD</p>
      <p><b>Transaction No:</b> ${data.transactionNo}</p>
      <p><b>Bank Code:</b> ${data.bankCode}</p>
      <p><b>Payment Date:</b> ${new Date(data.payDate).toLocaleString()}</p>
      <p>Thank you for shopping with TechStore!</p>
      <p>— TechStore Team</p>
    `,
    text: `
      Payment Confirmed, ${data.fullName}!
      Your payment for order #${data.orderNumber} has been successfully processed via VNPay.
      
      Order Total: ${data.totalAmount} USD
      Transaction No: ${data.transactionNo}
      Bank Code: ${data.bankCode}
      Payment Date: ${new Date(data.payDate).toLocaleString()}

      Thank you for shopping with TechStore!
      — TechStore Team
    `,
  }),
};

// Send email
const sendEmail = async ({ to, template, data }) => {
  if (!templates[template]) {
    throw new Error(`Email template "${template}" not found`);
  }

  const { subject, html, text } = templates[template](data);

  try {
    const info = await transporter.sendMail({
      from: `"TechStore" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return info;
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
};

module.exports = { sendEmail };
