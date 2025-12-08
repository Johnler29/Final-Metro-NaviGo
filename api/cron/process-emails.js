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
 * Send email using your email service
 * TODO: Replace with your actual email service (Resend, SendGrid, etc.)
 */
async function sendWelcomeEmail(email, name, userId) {
  // Example using Resend
  // npm install resend
  /*
  const { Resend } = require('resend');
  const resend = new Resend(emailApiKey);
  
  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to: email,
    subject: 'Welcome to NaviGO!',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for creating an account with NaviGO.</p>
      <p>Your account has been successfully created.</p>
    `,
  });
  
  if (error) throw new Error(`Email error: ${error.message}`);
  return data;
  */

  // For now, log (replace with actual email service)
  console.log(`[EMAIL] Would send welcome email to ${email} (${name})`);
  return { success: true, messageId: 'mock-' + Date.now() };
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
