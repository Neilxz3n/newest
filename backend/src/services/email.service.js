const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');
const db = require('../config/database');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendEmail(to, subject, html) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Campus Lost & Found" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });

      db.prepare(
        'INSERT INTO email_logs (recipient_email, subject, status, sent_at) VALUES (?, ?, ?, datetime(?))'
      ).run(to, subject, 'sent', new Date().toISOString());

      return { success: true, messageId: info.messageId };
    } catch (error) {
      db.prepare(
        'INSERT INTO email_logs (recipient_email, subject, status, error_message) VALUES (?, ?, ?, ?)'
      ).run(to, subject, 'failed', error.message);
      console.error('Email send error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getClaimApprovedTemplate(data) {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Campus Lost & Found</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Claim Approved</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #1e293b;">Good News, ${data.userName}!</h2>
          <p style="color: #475569;">Your claim for <strong>${data.itemName}</strong> has been approved.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <p style="margin: 5px 0; color: #374151;"><strong>Item:</strong> ${data.itemName}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Pickup Location:</strong> ${data.pickupLocation || 'Campus Security Office'}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Status:</strong> Approved</p>
          </div>
          <p style="color: #475569;">Please bring your valid campus ID for verification when picking up your item.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">This is an automated message from Campus Lost & Found System.</p>
        </div>
      </div>
    `;
  }

  getClaimRejectedTemplate(data) {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Campus Lost & Found</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Claim Update</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #1e293b;">Hello ${data.userName},</h2>
          <p style="color: #475569;">Your claim for <strong>${data.itemName}</strong> has been reviewed.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 5px 0; color: #374151;"><strong>Status:</strong> Not Approved</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Reason:</strong> ${data.reason || 'Insufficient proof of ownership'}</p>
          </div>
          <p style="color: #475569;">If you believe this is a mistake, please visit the Lost & Found office with additional proof.</p>
        </div>
      </div>
    `;
  }

  getMatchFoundTemplate(data) {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Campus Lost & Found</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Possible Match Found!</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #1e293b;">Great News, ${data.userName}!</h2>
          <p style="color: #475569;">We found a possible match for your lost item.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 5px 0; color: #374151;"><strong>Your Item:</strong> ${data.lostItemName}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Matched With:</strong> ${data.foundItemName}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Confidence:</strong> ${data.confidence}%</p>
          </div>
          <p style="color: #475569;">Log in to your account to review this match and submit a claim.</p>
        </div>
      </div>
    `;
  }
}

module.exports = new EmailService();
