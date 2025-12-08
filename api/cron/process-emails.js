/**
 * Vercel API Route: Process Account Email Queue
 * 
 * This file should be placed at: api/cron/process-emails.js
 * It will be accessible at: https://your-domain.vercel.app/api/cron/process-emails
 * 
 * Environment Variables (set in Vercel Dashboard):
 * - CRON_SECRET: Secret key for authenticating cron requests
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (for queue access)
 * - EMAIL_SERVICE_API_KEY: Your email service API key (Resend, SendGrid, etc.)
 * - EMAIL_FROM: Sender email address
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;
const emailApiKey = process.env.EMAIL_SERVICE_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'noreply@yourdomain.com';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Send email using Resend
 */
async function sendWelcomeEmail(email, name, userId) {
  if (!emailApiKey) {
    throw new Error('EMAIL_SERVICE_API_KEY not configured');
  }

  const { Resend } = require('resend');
  const resend = new Resend(emailApiKey);

  // HTML email template
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to NaviGO</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        h1 {
          color: #1f2937;
          margin-top: 0;
        }
        .content {
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
        .features {
          margin: 30px 0;
        }
        .feature-item {
          padding: 10px 0;
          border-left: 3px solid #2563eb;
          padding-left: 15px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚌 NaviGO</div>
          <h1>Welcome, ${name || 'User'}!</h1>
        </div>
        
        <div class="content">
          <p>Thank you for creating an account with NaviGO! We're excited to have you on board.</p>
          
          <p>Your account has been successfully created and you can now:</p>
          
          <div class="features">
            <div class="feature-item">
              <strong>Track Buses in Real-Time</strong><br>
              See live bus locations and get accurate arrival times
            </div>
            <div class="feature-item">
              <strong>Plan Your Route</strong><br>
              Find the best routes and stops for your journey
            </div>
            <div class="feature-item">
              <strong>Get Notifications</strong><br>
              Receive alerts about your bus arrivals and route changes
            </div>
          </div>
          
          <p>If you have any questions or need help, please don't hesitate to contact our support team.</p>
        </div>
        
        <div class="footer">
          <p>Best regards,<br><strong>The NaviGO Team</strong></p>
          <p style="margin-top: 20px; font-size: 12px;">
            This email was sent to ${email} because you created an account with NaviGO.<br>
            If you didn't create this account, please contact support.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Plain text version
  const textContent = `
Welcome to NaviGO!

Hi ${name || 'User'},

Thank you for creating an account with NaviGO! We're excited to have you on board.

Your account has been successfully created and you can now:

• Track Buses in Real-Time
  See live bus locations and get accurate arrival times

• Plan Your Route
  Find the best routes and stops for your journey

• Get Notifications
  Receive alerts about your bus arrivals and route changes

If you have any questions or need help, please don't hesitate to contact our support team.

Best regards,
The NaviGO Team

---
This email was sent to ${email} because you created an account with NaviGO.
If you didn't create this account, please contact support.
  `;

  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to: email,
    subject: 'Welcome to NaviGO!',
    html: htmlContent,
    text: textContent,
  });

  if (error) {
    console.error('Resend API error:', error);
    throw new Error(`Email service error: ${error.message}`);
  }

  console.log(`✅ Email sent successfully to ${email} (ID: ${data?.id})`);
  return data;
}

/**
 * Process messages from the queue
 */
async function processEmailQueue() {
  try {
    // Read messages from the queue
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'account_emails',
      vt: 300,
      qty: 10,
    });

    if (readError) {
      console.error('Error reading queue:', readError);
      return { processed: 0, errors: [readError.message] };
    }

    if (!messages || messages.length === 0) {
      return { processed: 0, errors: [] };
    }

    const results = { processed: 0, failed: 0, errors: [] };

    for (const message of messages) {
      try {
        const { msg_id, message: msgData } = message;
        const { type, email, name, user_id } = msgData;

        if (type !== 'welcome_email' || !email) {
          // Archive invalid messages
          await supabase.rpc('pgmq_archive', {
            queue_name: 'account_emails',
            msg_id: msg_id,
          });
          continue;
        }

        // Send the email
        await sendWelcomeEmail(email, name || 'User', user_id);

        // Archive after successful processing
        const { error: archiveError } = await supabase.rpc('pgmq_archive', {
          queue_name: 'account_emails',
          msg_id: msg_id,
        });

        if (archiveError) {
          console.error(`Error archiving message ${msg_id}:`, archiveError);
        } else {
          results.processed++;
          console.log(`✅ Processed welcome email for ${email}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ message_id: message.msg_id, error: error.message });
        console.error(`❌ Error processing message ${message.msg_id}:`, error);
      }
    }

    return results;
  } catch (error) {
    console.error('Fatal error processing queue:', error);
    return { processed: 0, failed: 0, errors: [error.message] };
  }
}

/**
 * Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check
  if (req.method === 'GET') {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'account-email-processor',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate
    const authHeader = req.headers.authorization;
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== cronSecret) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing CRON_SECRET',
      });
    }

    // Process queue
    const results = await processEmailQueue();

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Error in process-emails endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

