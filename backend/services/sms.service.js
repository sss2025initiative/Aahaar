import dotenv from 'dotenv';
dotenv.config();

/**
 * Sends a phone SMS notification (integrated with optional Twilio provider)
 * @param {string} phoneNumber - Target user phone number
 * @param {string} message - Text message content body
 */
export const sendSMSNotification = async (phoneNumber, message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      // Dynamically import Twilio only when credentials are provided to save load overhead
      const { default: twilio } = await import('twilio');
      const client = twilio(accountSid, authToken);
      
      const response = await client.messages.create({
        body: message,
        from: fromNumber,
        to: phoneNumber
      });
      
      console.log(`[SMS SERVICE] Message successfully dispatched via Twilio to ${phoneNumber}. SID: ${response.sid}`);
      return { success: true, messageId: response.sid };
    } catch (err) {
      console.error(`[SMS SERVICE] Twilio dispatch error to ${phoneNumber}:`, err);
      return { success: false, error: err.message || err };
    }
  } else {
    // Development Dry-Run Log
    console.log(`[SMS SERVICE DRY-RUN] Sending SMS to phone: ${phoneNumber}`);
    console.log(`Message Body: "${message}"`);
    return { success: true, dryRun: true };
  }
};
