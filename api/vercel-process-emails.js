/**
 * Vercel Serverless Function: Process Account Email Queue
 * 
 * Deploy this as: /api/cron/process-emails
 * 
 * This endpoint is called by Supabase cron job to process
 * queued account creation emails.
 * 
 * Environment Variables (set in Vercel Dashboard):
 * - CRON_SECRET: Secret key for authenticating cron requests
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (for queue access)
 * - EMAIL_SERVICE_API_KEY: Your email service API key (Resend, SendGrid, etc.)
 * - EMAIL_FROM: Sender email address
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
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
 * Replace this with your actual email service integration
 */
async function sendWelcomeEmail(email, name, userId) {
  // Example using Resend (https://resend.com)
  // Install: npm install resend
  // Uncomment and configure:
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
      <p>If you have any questions, please don't hesitate to contact us.</p>
    `,
  });
  
  if (error) {
    throw new Error(`Email service error: ${error.message}`);
  }
  
  return data;
  */

  // Example using SendGrid
  // Install: npm install @sendgrid/mail
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(emailApiKey);
  
  const msg = {
    to: email,
    from: emailFrom,
    subject: 'Welcome to NaviGO!',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for creating an account with NaviGO.</p>
      <p>Your account has been successfully created.</p>
    `,
  };
  
  await sgMail.send(msg);
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
    // Read messages from the queue (read 10 at a time)
    // Note: Adjust the RPC function name based on your pgmq setup
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'account_emails',
      vt: 300, // Visibility timeout in seconds
      qty: 10, // Number of messages to read
    });

    if (readError) {
      console.error('Error reading queue:', readError);
      return { processed: 0, errors: [readError.message] };
    }

    if (!messages || messages.length === 0) {
      return { processed: 0, errors: [] };
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [],
    };

    // Process each message
    for (const message of messages) {
      try {
        const { msg_id, message: msgData } = message;
        const { type, email, name, user_id } = msgData;

        if (type !== 'welcome_email') {
          console.warn(`Unknown message type: ${type}`);
          // Archive unknown message types
          await supabase.rpc('pgmq_archive', {
            queue_name: 'account_emails',
            msg_id: msg_id,
          });
          continue;
        }

        if (!email) {
          console.warn(`No email address in message ${msg_id}`);
          await supabase.rpc('pgmq_archive', {
            queue_name: 'account_emails',
            msg_id: msg_id,
          });
          continue;
        }

        // Send the email
        await sendWelcomeEmail(email, name || 'User', user_id);

        // Archive the message after successful processing
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
        results.errors.push({
          message_id: message.msg_id,
          error: error.message,
        });
        console.error(`❌ Error processing message ${message.msg_id}:`, error);

        // Optionally, you can implement retry logic here
        // For now, we'll archive failed messages to prevent infinite loops
      }
    }

    return results;
  } catch (error) {
    console.error('Fatal error processing queue:', error);
    return {
      processed: 0,
      failed: 0,
      errors: [error.message],
    };
  }
}

/**
 * Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'account-email-processor',
    });
  }

  // Only allow POST for processing
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.authorization;
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== cronSecret) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing CRON_SECRET',
      });
    }

    // Process the queue
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



