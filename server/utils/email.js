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

export const sendBroadcastEmail = async (email, name, subject, message) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@lcumarketplace.com';

  if (!apiKey) {
    console.log('\n======================================================');
    console.log(`[Fallback Email Broadcast to ${name} (${email})]`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
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
        subject: subject,
        htmlContent: `
          <html>
            <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #090f1d; color: #ffffff; padding: 30px; margin: 0;">
              <div style="max-width: 560px; margin: 0 auto; background: #131e33; padding: 40px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);">
                <h2 style="color: #60a5fa; margin-bottom: 24px; font-weight: 800; letter-spacing: -0.02em;">Important Announcement</h2>
                <p style="font-size: 1.1rem; color: #f8fafc; line-height: 1.5; margin-bottom: 16px;">Hello <b>${name}</b>,</p>
                <div style="color: #e2e8f0; line-height: 1.6; text-align: left; background: rgba(255, 255, 255, 0.02); padding: 20px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 28px;">
                  ${message.replace(/\n/g, '<br/>')}
                </div>
                <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px;">
                  This is a system broadcast to all LCU Student Marketplace users.
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
    console.error(`Failed to send broadcast email to ${email}:`, error.message);
  }
};

export const sendOrderReceiptEmail = async ({ email, name, order, product, seller }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@lcumarketplace.com';

  const amountFormatted = `₦${order.amount.toLocaleString()}`;

  if (!apiKey) {
    console.log('\n======================================================');
    console.log(`[Fallback Order Receipt sent to ${name} (${email})]`);
    console.log(`Order ID: ${order._id}`);
    console.log(`Product: ${product.name} (${amountFormatted})`);
    console.log(`Pickup Date/Time: ${order.pickupDate} at ${order.pickupTime}`);
    console.log(`Meeting Point: ${order.meetingPoint}`);
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
        subject: `Your LCU Market Order Receipt — ${product.name}`,
        htmlContent: `
          <html>
            <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #060c1a; color: #ffffff; padding: 30px; margin: 0;">
              <div style="max-width: 560px; margin: 0 auto; background: #0e1628; padding: 40px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.55);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h2 style="color: #60a5fa; font-weight: 800; margin: 0;">LCU Student Marketplace</h2>
                  <p style="color: #94a3b8; font-size: 0.9rem; margin: 4px 0 0 0;">Official Purchase & Escrow Receipt</p>
                </div>
                
                <p style="font-size: 1.05rem; color: #f8fafc; line-height: 1.5; margin-bottom: 16px;">Hello <b>${name}</b>,</p>
                <p style="color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">Your payment of <b>${amountFormatted}</b> has been received and is now held safely in LCU Escrow protection. Below is your pickup schedule and receipt details:</p>
                
                <!-- 🤝 Pickup Schedule Card -->
                <div style="background: rgba(96, 165, 250, 0.06); border: 1px solid rgba(96, 165, 250, 0.2); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                  <p style="margin: 0 0 12px 0; color: #60a5fa; font-weight: 700; font-size: 1rem;">🤝 Scheduled Campus Pickup</p>
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; color: #e2e8f0; line-height: 1.6;">
                    <tr>
                      <td style="padding: 4px 0; color: #94a3b8; width: 40%;">📍 Meeting Point:</td>
                      <td style="padding: 4px 0; font-weight: 600;">${order.meetingPoint}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #94a3b8;">📅 Expected Date:</td>
                      <td style="padding: 4px 0; font-weight: 600;">${order.pickupDate || 'Not specified'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #94a3b8;">⏰ Expected Time:</td>
                      <td style="padding: 4px 0; font-weight: 600;">${order.pickupTime || 'Not specified'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #94a3b8;">🏪 Seller:</td>
                      <td style="padding: 4px 0; font-weight: 600;">${seller.name}</td>
                    </tr>
                  </table>
                </div>

                <!-- 🛒 Order Details / Receipt -->
                <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 20px; margin-bottom: 28px;">
                  <p style="margin: 0 0 12px 0; color: #f8fafc; font-weight: 700; font-size: 1rem;">💳 Payment Invoice</p>
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; color: #e2e8f0;">
                    <thead>
                      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                        <th style="text-align: left; padding-bottom: 8px; color: #94a3b8;">Item</th>
                        <th style="text-align: right; padding-bottom: 8px; color: #94a3b8;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.04);">
                        <td style="padding: 12px 0; font-weight: 600;">
                          ${product.name}<br/>
                          <span style="font-size: 0.78rem; font-weight: 400; color: #94a3b8;">Category: ${product.category}</span>
                        </td>
                        <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #60a5fa;">${amountFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 0 0; font-weight: 700; font-size: 1rem; color: #f8fafc;">Total Paid:</td>
                        <td style="padding: 16px 0 0 0; text-align: right; font-weight: 900; font-size: 1.1rem; color: #3b82f6;">${amountFormatted}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px; text-align: center;">
                  Protecting your funds via Escrow. When you meet, inspect the item. Only release payment in your Dashboard once you are satisfied with your item.
                </p>
              </div>
            </body>
          </html>
        `
      })
    });

  } catch (error) {
    console.error('Failed to send order receipt email via Brevo:', error.message);
  }
};

export const sendSellerNotificationEmail = async ({ email, name, buyerName, order, product }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@lcumarketplace.com';
  const amountFormatted = `₦${Number(order.amount).toLocaleString()}`;

  if (!apiKey) {
    console.log('\n======================================================');
    console.log(`[Fallback] Seller email notification sent to: ${name} (${email})`);
    console.log(`Buyer: ${buyerName}`);
    console.log(`Item: ${product.name}`);
    console.log(`Amount: ${amountFormatted}`);
    console.log(`Meeting Point: ${order.meetingPoint}`);
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
        subject: `🎉 Your item has been purchased! — ${product.name}`,
        htmlContent: `
          <html>
            <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #060c1a; color: #ffffff; padding: 30px; margin: 0;">
              <div style="max-width: 560px; margin: 0 auto; background: #0e1628; padding: 40px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.55);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h2 style="color: #10b981; font-weight: 800; margin: 0;">Item Purchased! 🎉</h2>
                  <p style="color: #94a3b8; font-size: 0.9rem; margin: 4px 0 0 0;">LCU Student Marketplace</p>
                </div>
                
                <p style="font-size: 1.05rem; color: #f8fafc; line-height: 1.5; margin-bottom: 16px;">Hello <b>${name}</b>,</p>
                <p style="color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">Congratulations! <b>${buyerName}</b> has purchased your item "<b>${product.name}</b>" for <b>${amountFormatted}</b>.</p>
                
                <!-- 🤝 Escrow Status Notification -->
                <div style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                  <p style="margin: 0 0 12px 0; color: #10b981; font-weight: 700; font-size: 1rem;">💰 Escrow Protection Active</p>
                  <p style="margin: 0; font-size: 0.88rem; color: #e2e8f0; line-height: 1.5;">
                    The buyer's funds are now held securely in escrow. Please arrange a meeting with the buyer to deliver the item. Once the buyer confirms delivery on their dashboard, the funds will immediately land in your wallet balance!
                  </p>
                </div>

                <!-- 🤝 Pickup Schedule Card -->
                <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                  <p style="margin: 0 0 12px 0; color: #f8fafc; font-weight: 700; font-size: 1rem;">📍 Agreed Delivery Details</p>
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; color: #e2e8f0; line-height: 1.6;">
                    <tr>
                      <td style="padding: 4px 0; color: #94a3b8; width: 40%;">📍 Meeting Point:</td>
                      <td style="padding: 4px 0; font-weight: 600;">${order.meetingPoint || 'To be arranged'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #94a3b8;">📅 Expected Date:</td>
                      <td style="padding: 4px 0; font-weight: 600;">${order.pickupDate || 'Flexible'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #94a3b8;">⏰ Expected Time:</td>
                      <td style="padding: 4px 0; font-weight: 600;">${order.pickupTime || 'Flexible'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #94a3b8;">👤 Buyer Name:</td>
                      <td style="padding: 4px 0; font-weight: 600;">${buyerName}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px; text-align: center;">
                  Thank you for selling on LCU Student Marketplace! Need help? Open internal chats to converse directly with your buyer.
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
    console.error('Failed to send seller notification email via Brevo:', error.message);
  }
};
