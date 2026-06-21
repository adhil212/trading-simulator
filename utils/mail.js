import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(email, otp) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your OTP for Registration",
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#111;color:#eee;border-radius:12px;border:1px solid #333">
      <h2 style="margin:0 0 16px;color:#fff">Email Verification</h2>
      <p style="margin:0 0 20px;color:#aaa">Use this OTP to complete your registration:</p>
      <div style="text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 0;background:#222;border-radius:8px;color:#60a5fa">${otp}</div>
      <p style="margin:20px 0 0;font-size:13px;color:#666">This OTP expires in 10 minutes.</p>
    </div>`,
  });
}
