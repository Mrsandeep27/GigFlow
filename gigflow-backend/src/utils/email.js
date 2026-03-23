const nodemailer = require('nodemailer');

// Gmail SMTP — free 500 emails/day
// Setup: Gmail → 2FA → App Passwords → generate one
// Set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel env vars
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

const APP_NAME = 'GigFlow';
const APP_URL = process.env.CLIENT_URL || 'https://gig-flow-work.vercel.app';

// Send email (fire-and-forget safe)
async function sendEmail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.warn('Email not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing)');
    return false;
  }
  try {
    await t.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

// ── Email Templates ──────────────────────────────────────────

function wrap(body) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:#2563eb;color:#fff;font-weight:700;font-size:14px;padding:8px 14px;border-radius:10px">G</div>
      <span style="font-weight:700;font-size:18px;margin-left:8px;vertical-align:middle">${APP_NAME}</span>
    </div>
    ${body}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af">
      &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
    </div>
  </div>`;
}

exports.sendVerificationEmail = (to, otp) =>
  sendEmail({
    to,
    subject: `${APP_NAME} — Verify your email`,
    html: wrap(`
      <h2 style="font-size:20px;margin:0 0 8px">Verify your email</h2>
      <p style="color:#6b7280;margin:0 0 24px">Enter this code to complete your registration:</p>
      <div style="text-align:center;background:#f3f4f6;border-radius:12px;padding:20px;margin:0 0 24px">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2563eb">${otp}</span>
      </div>
      <p style="color:#9ca3af;font-size:13px">This code expires in 10 minutes. If you didn't sign up, ignore this email.</p>
    `),
  });

exports.sendPasswordResetEmail = (to, resetUrl) =>
  sendEmail({
    to,
    subject: `${APP_NAME} — Reset your password`,
    html: wrap(`
      <h2 style="font-size:20px;margin:0 0 8px">Reset your password</h2>
      <p style="color:#6b7280;margin:0 0 24px">Click the button below to set a new password:</p>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Reset Password</a>
      </div>
      <p style="color:#9ca3af;font-size:13px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      <p style="color:#9ca3af;font-size:11px;word-break:break-all">Link: ${resetUrl}</p>
    `),
  });

exports.sendNotificationEmail = (to, title, body) =>
  sendEmail({
    to,
    subject: `${APP_NAME} — ${title}`,
    html: wrap(`
      <h2 style="font-size:20px;margin:0 0 8px">${title}</h2>
      <p style="color:#6b7280;margin:0 0 24px">${body}</p>
      <div style="text-align:center">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">View on ${APP_NAME}</a>
      </div>
    `),
  });

exports.sendEmail = sendEmail;
