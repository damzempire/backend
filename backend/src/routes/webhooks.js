const express = require("express");
const router = express.Router();
const Beneficiary = require("../models/beneficiary");

/**
 * POST /webhooks/ses-bounces
 * Handle AWS SES bounce notifications via SNS
 */
router.post("/ses-bounces", async (req, res) => {
  try {
    // Log the incoming request for debugging
    console.log("SES webhook received:", JSON.stringify(req.body, null, 2));

    // Handle SNS subscription confirmation
    if (req.body.Type === "SubscriptionConfirmation" && req.body.SubscribeURL) {
      console.log("Confirming SNS subscription");
      const axios = require("axios");
      await axios.get(req.body.SubscribeURL);
      return res.status(200).json({ message: "Subscription confirmed" });
    }

    // Handle SNS notification (contains SES bounce message)
    if (req.body.Type === "Notification" && req.body.Message) {
      const message = JSON.parse(req.body.Message);

      // Process bounce notifications
      if (message.notificationType === "bounce") {
        const bounce = message.bounce;
        console.log("Processing bounce notification:", bounce);

        // Handle bounced recipients
        for (const recipient of bounce.bouncedRecipients) {
          const emailAddress = recipient.emailAddress;
          console.log(`Marking email as invalid: ${emailAddress}`);

          // Update all beneficiaries with this email address
          await Beneficiary.update(
            { email_valid: false },
            {
              where: {
                email: require("../util/cryptoUtils").encryptEmail(
                  emailAddress,
                ),
                email_valid: true, // Only update if currently marked as valid
              },
            },
          );

          console.log(
            `Updated beneficiaries with email ${emailAddress} as invalid`,
          );
        }
      }

      // Process complaint notifications
      if (message.notificationType === "complaint") {
        const complaint = message.complaint;
        console.log("Processing complaint notification:", complaint);

        // Handle complained recipients
        for (const recipient of complaint.complainedRecipients) {
          const emailAddress = recipient.emailAddress;
          console.log(
            `Marking email as invalid due to complaint: ${emailAddress}`,
          );

          // Update all beneficiaries with this email address
          await Beneficiary.update(
            { email_valid: false },
            {
              where: {
                email: require("../util/cryptoUtils").encryptEmail(
                  emailAddress,
                ),
                email_valid: true, // Only update if currently marked as valid
              },
            },
          );

          console.log(
            `Updated beneficiaries with email ${emailAddress} as invalid due to complaint`,
          );
        }
      }
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing SES webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
