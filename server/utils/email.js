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
        subject: "Verify Your Email - LCU Student Marketplace",
        htmlContent: `
          <html>
            <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #090f1d; color: #ffffff; padding: 30px; margin: 0;">
              <div style="max-width: 560px; margin: 0 auto; background: #131e33; padding: 40px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);">
                <h2 style="color: #60a5fa; margin-bottom: 24px; font-weight: 800; letter-spacing: -0.02em;">LCU Student Marketplace</h2>
                <p style="font-size: 1.1rem; color: #f8fafc; line-height: 1.5; margin-bottom: 16px;">Hello <b>${name}</b>,</p>
                <p style="color: #94a3b8; line-height: 1.6; margin-bottom: 28px;">Use the secure verification code below to verify your student email and activate your account:</p>
                <div style="font-size: 2.4rem; font-weight: 800; letter-spacing: 6px; color: #ffffff; background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); padding: 18px 30px; margin: 24px auto; width: fit-content; border-radius: 10px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
                  ${otp}
                </div>
                <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; margin-top: 28px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px;">
                  This code expires in 15 minutes. If you did not sign up for LCU Student Marketplace, you can safely ignore this email.
                </p>
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
    console.log(`[Fallback] Registration OTP for ${name} (${email}) is: ${otp}`);
  }
};

export const sendWelcomeEmail = async (email, name) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@lcumarketplace.com';

  if (!apiKey) {
    console.log('\n======================================================');
    console.log(`[Fallback] Welcome email sent to: ${name} (${email})`);
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
        subject: "Welcome to LCU Student Marketplace! 🎓🚀",
        htmlContent: `
          <html>
            <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #090f1d; color: #ffffff; padding: 30px; margin: 0;">
              <div style="max-width: 560px; margin: 0 auto; background: #131e33; padding: 40px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);">
                <h2 style="color: #60a5fa; margin-bottom: 16px; font-weight: 800;">Account Activated! 🎉</h2>
                <p style="font-size: 1.15rem; color: #f8fafc; line-height: 1.5; margin-bottom: 24px;">Welcome to the family, <b>${name}</b>!</p>
                
                <p style="color: #94a3b8; line-height: 1.6; text-align: left; margin-bottom: 20px;">
                  Your student account is now fully verified. Here is how you can get started:
                </p>
                
                <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 20px; text-align: left; margin-bottom: 28px;">
                  <p style="margin: 0 0 10px 0; color: #f8fafc;">💡 <b>Quick Guide:</b></p>
                  <ul style="margin: 0; padding-left: 20px; color: #94a3b8; line-height: 1.8;">
                    <li>🏠 <b>Sell hostel items</b>: bed frames, fridges, hangers, fans</li>
                    <li>💻 <b>Trade student gadgets</b>: chargers, calculators, laptops</li>
                    <li>📚 <b>Buy textbooks</b>: notes, handouts, exams prep material</li>
                    <li>💬 <b>Internal Chat</b>: message other students instantly inside the app</li>
                  </ul>
                </div>
                
                <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px;">
                  Enjoy trading safely! Always transact in public campus spaces.
                </p>
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
    console.error('Failed to send welcome email via Brevo:', error.message);
  }
};

export const sendResetPasswordEmail = async (email, name, otp) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@lcumarketplace.com';

  if (!apiKey) {
    console.log('\n======================================================');
    console.log(`WARNING: BREVO_API_KEY not configured.`);
    console.log(`Password Reset OTP for ${name} (${email}) is: ${otp}`);
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
        subject: "Reset Your Password - LCU Student Marketplace",
        htmlContent: `
          <html>
            <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #090f1d; color: #ffffff; padding: 30px; margin: 0;">
              <div style="max-width: 560px; margin: 0 auto; background: #131e33; padding: 40px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);">
                <h2 style="color: #60a5fa; margin-bottom: 24px; font-weight: 800; letter-spacing: -0.02em;">Password Reset Request</h2>
                <p style="font-size: 1.1rem; color: #f8fafc; line-height: 1.5; margin-bottom: 16px;">Hello <b>${name}</b>,</p>
                <p style="color: #94a3b8; line-height: 1.6; margin-bottom: 28px;">Use the verification code below to reset your password:</p>
                <div style="font-size: 2.4rem; font-weight: 800; letter-spacing: 6px; color: #ffffff; background: linear-gradient(135deg, #ef4444 0%, #f59e0b 100%); padding: 18px 30px; margin: 24px auto; width: fit-content; border-radius: 10px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
                  ${otp}
                </div>
                <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; margin-top: 28px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px;">
                  This code expires in 15 minutes. If you did not request a password reset, please secure your account.
                </p>
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
    console.error('Failed to send reset password email via Brevo:', error.message);
    console.log(`[Fallback] Password Reset OTP for ${name} (${email}) is: ${otp}`);
  }
};
