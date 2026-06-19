/**
 * Future-ready Email service placeholder to demonstrate channel extensibility
 * @param {string} emailAddress - Target email address
 * @param {string} subject - Email subject line
 * @param {string} htmlContent - HTML formatted message body
 */
export const sendEmailNotification = async (emailAddress, subject, htmlContent) => {
  console.log(`[EMAIL SERVICE STUB] Sending Email to: ${emailAddress}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content Preview: ${htmlContent.substring(0, 150)}...`);
  return { success: true, channel: 'email', stub: true };
};
