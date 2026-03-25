const nodemailer = require("nodemailer");
const { Beneficiary } = require("../models");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.mailtrap.io",
      port: process.env.EMAIL_PORT || 2525,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Send an email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} text - Email body (plain text)
   * @param {string} html - Email body (HTML)
   * @returns {Promise<boolean>} Success status
   */
  async sendEmail(to, subject, text, html) {
    try {
      if (!to) {
        console.warn(
          "No recipient email provided, skipping email notification",
        );
        return false;
      }

      // Check if email is marked as invalid (bounced)
      const beneficiary = await Beneficiary.findOne({
        where: { email: require("../util/cryptoUtils").encryptEmail(to) },
      });

      if (beneficiary && !beneficiary.email_valid) {
        console.warn(
          `Email ${to} is marked as invalid (bounced), skipping email notification`,
        );
        return false;
      }

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("Email credentials not set, skipping email notification");
        return false;
      }

      const info = await this.transporter.sendMail({
        from: `"Vesting Vault" <${process.env.EMAIL_FROM || "no-reply@vestingvault.com"}>`,
        to,
        subject,
        text,
        html,
      });

      console.log("Email sent: %s", info.messageId);
      return true;
    } catch (error) {
      console.error("Error sending email:", error.message);
      return false;
    }
  }

  /**
   * Send cliff passed notification
   * @param {string} to - Recipient email
   * @param {string} amount - Claimable amount
   * @returns {Promise<boolean>} Success status
   */
  async sendCliffPassedEmail(to, amount) {
    const subject = "Your Cliff has passed!";
    const text = `Your Cliff has passed! You can now claim ${parseFloat(amount).toLocaleString()} tokens.`;
    const html = `<p>Your Cliff has passed! You can now claim <strong>${parseFloat(amount).toLocaleString()}</strong> tokens.</p>`;

    return await this.sendEmail(to, subject, text, html);
  }

  /**
   * Send integrity failure notification
   * @param {string} to - Recipient email
   * @param {string} vaultAddress - Vault contract address
   * @returns {Promise<boolean>} Success status
   */
  async sendIntegrityFailureEmail(to, vaultAddress) {
    const subject = "CRITICAL: Vault Integrity Failure Detected";
    const text = `CRITICAL: A security integrity failure has been detected for vault ${vaultAddress}. The vault has been blacklisted for your protection. Please contact support immediately.`;
    const html = `
      <h1>Security Alert</h1>
      <p>CRITICAL: A security integrity failure has been detected for vault <strong>${vaultAddress}</strong>.</p>
      <p>The contract code has been modified without authorization. For your protection, the vault has been <strong>instantly blacklisted</strong> and disabled from the dashboard.</p>
      <p>Please contact our support team immediately for further instructions.</p>
    `;

    return await this.sendEmail(to, subject, text, html);
  }

  async sendLiquidityRiskAlertEmail(to, payload) {
    const {
      vaultName,
      tokenSymbol,
      orderUsd,
      slippagePercent,
      thresholdPercent,
      insufficientDepth,
    } = payload;

    const depthSummary = insufficientDepth
      ? `The order book could not fully absorb a $${orderUsd.toLocaleString()} sell order.`
      : `Estimated slippage for a $${orderUsd.toLocaleString()} sell order is ${slippagePercent.toFixed(2)}%.`;

    const subject = `Liquidity risk alert for ${tokenSymbol}`;
    const text = [
      `Liquidity risk alert for ${vaultName}.`,
      depthSummary,
      `Configured threshold: ${thresholdPercent.toFixed(2)}% slippage.`,
      'Please review market-making or add liquidity before the next unlock window.',
    ].join(' ');
    const html = [
      `<p><strong>Liquidity risk alert</strong> for ${vaultName}.</p>`,
      `<p>${depthSummary}</p>`,
      `<p>Configured threshold: <strong>${thresholdPercent.toFixed(2)}%</strong> slippage.</p>`,
      `<p>Please review market-making or add liquidity before the next unlock window.</p>`,
    ].join('');

    return await this.sendEmail(to, subject, text, html);
  }
}

module.exports = new EmailService();
