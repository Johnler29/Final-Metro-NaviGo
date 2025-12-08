/**
 * API Endpoint to Process Account Email Queue
 * 
 * This endpoint should be called by Supabase cron job to process
 * queued account creation emails.
 * 
 * Setup:
 * 1. Deploy this to your server (Vercel, Railway, etc.)
 * 2. Set environment variables
 * 3. Configure Supabase cron to call this endpoint
 * 
 * Environment Variables Required:
 * - CRON_SECRET: Secret key for authenticating cron requests
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (for queue access)
 * - EMAIL_SERVICE_API_KEY: Your email service API key (Resend, SendGrid, etc.)
 * - EMAIL_FROM: Sender email address
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

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
 * Replace this with your actual email service (Resend, SendGrid, etc.)
 */
async function sendWelcomeEmail(email, name, userId) {
  // Example using Resend (https://resend.com)
  // Install: npm install resend
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

  // Example using SMTP (nodemailer)
  // Install: npm install nodemailer
  /*
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  
  await transporter.sendMail({
    from: emailFrom,
    to: email,
    subject: 'Welcome to NaviGO!',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for creating an account with NaviGO.</p>
    `,
  });
  */

  // For now, just log (replace with actual email service)
  console.log(`[EMAIL] Would send welcome email to ${email} (${name})`);
  return { success: true, messageId: 'mock-' + Date.now() };
}

/**
 * Process messages from the queue
 */
async function processEmailQueue() {
  try {
    // Read messages from the queue (read 10 at a time)
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
        // In production, you might want to implement a dead letter queue
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
 * Main endpoint handler
 */
router.post('/process-emails', async (req, res) => {
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

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Error in process-emails endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'account-email-processor',
  });
});

module.exports = router;

// If running as standalone server (for testing)
if (require.main === module) {
  const app = express();
  app.use(express.json());
  app.use('/api/cron', router);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Email processor API running on port ${PORT}`);
  });
}

