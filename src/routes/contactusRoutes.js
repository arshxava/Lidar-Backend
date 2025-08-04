const express = require('express');
const sgMail = require('@sendgrid/mail');

const router = express.Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // ✅ Admin email template
    const msgToAdmin = {
      to: 'rohangoyal8897@gmail.com', // Replace with your admin email
      from: process.env.SENDGRID_USER,
      subject: `📩 New Contact Form Submission - LiDAR Explorer`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color:#2563eb;">📬 New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <div style="background:#f8f9fa; padding:10px; border-radius:8px; border:1px solid #ddd;">
            ${message}
          </div>
          <br/>
          <hr style="border:none; border-top:1px solid #eee; margin:20px 0;"/>
          <p style="font-size:12px; color:#888;">LiDAR Explorer Contact Form</p>
        </div>
      `
    };

    // ✅ User confirmation email template
    const msgToUser = {
      to: email,
      from: process.env.SENDGRID_USER,
      subject: `✅ We Received Your Message - LiDAR Explorer`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#333;">
          <h2 style="color:#2563eb;">Thank you for contacting LiDAR Explorer!</h2>
          <p>Hi ${name},</p>
          <p>We have received your message and our team will get back to you shortly.</p>
          <p><strong>Your Message:</strong></p>
          <div style="background:#f8f9fa; padding:10px; border-radius:8px; border:1px solid #ddd;">
            ${message}
          </div>
          <br/>
          <p>If you need immediate assistance, please reply to this email.</p>
          <br/>
          <p style="color:#2563eb; font-weight:bold;">— Team LiDAR Explorer</p>
          <hr style="border:none; border-top:1px solid #eee; margin:20px 0;"/>
          <p style="font-size:12px; color:#888;">You are receiving this email because you contacted LiDAR Explorer.</p>
        </div>
      `
    };

    await sgMail.send(msgToAdmin);
    await sgMail.send(msgToUser);

    return res.status(200).json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    console.error('SendGrid Error:', error.response?.body || error.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
