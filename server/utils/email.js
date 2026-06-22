import dotenv from 'dotenv';
dotenv.config();

export const sendOTPEmail = async (email, name, otp) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@lcumarketplace.com';

  if (!apiKey) {
    console.log('\n======================================================');
    console.log(`WARNING: BREVO_API_KEY not configured.`);
    console.log(`Registration OTP for ${name} (${email}) is: ${otp}`);
    console.log('======================================================\n');
    return;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "LCU Student Marketplace", email: senderEmail },
        to: [{ email, name }],
        subject: "Your OTP Verification Code - LCU Marketplace",
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; background-color: #0d1117; color: #ffffff; padding: 20px; border-radius: 8px;">
              <div style="max-width: 600px; margin: 0 auto; background: #161b22; padding: 30px; border-radius: 12px; border: 1px solid #30363d; text-align: center;">
                <h2 style="color: #d4af37;">LCU Student Marketplace</h2>
                <p style="font-size: 1.1rem; color: #c9d1d9;">Hello <b>${name}</b>,</p>
                <p style="color: #8b949e;">Thank you for registering on our marketplace! Use the verification code below to activate your account:</p>
                <div style="font-size: 2.2rem; font-weight: bold; letter-spacing: 4px; color: #d4af37; background: rgba(212, 175, 55, 0.1); padding: 15px; margin: 24px auto; width: fit-content; border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.3);">
                  ${otp}
                </div>
                <p style="font-size: 0.85rem; color: #8b949e;">This code will expire in 15 minutes. If you did not request this code, please ignore this email.</p>
              </div>
            </body>
          </html>
        `
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Brevo Response Error: ${err.message || JSON.stringify(err)}`);
    }
  } catch (error) {
    console.error('Failed to send OTP email via Brevo:', error.message);
    // Keep running fallback in console in case of API failure
    console.log(`[Fallback] Registration OTP for ${name} (${email}) is: ${otp}`);
  }
};
