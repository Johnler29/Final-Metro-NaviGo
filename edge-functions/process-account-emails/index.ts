/**
 * Supabase Edge Function to Process Account Email Queue
 * 
 * This function processes queued account creation emails.
 * 
 * Setup:
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Login: supabase login
 * 3. Link project: supabase link --project-ref your-project-ref
 * 4. Deploy: supabase functions deploy process-account-emails
 * 
 * Environment Variables (set in Supabase Dashboard):
 * - EMAIL_SERVICE_API_KEY: Your email service API key
 * - EMAIL_FROM: Sender email address
 * - CRON_SECRET: Secret for authenticating cron requests
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailMessage {
  type: string;
  user_id: string;
  email: string;
  name: string;
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * Send email using your email service
 * Replace this with your actual email service integration
 */
async function sendWelcomeEmail(
  email: string,
  name: string,
  userId: string,
  emailApiKey: string,
  emailFrom: string
): Promise<{ success: boolean; messageId?: string }> {
  // Example using Resend
  // You'll need to install the Resend SDK or use fetch
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${emailApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: email,
        subject: 'Welcome to NaviGO!',
        html: `
          <h1>Welcome ${name}!</h1>
          <p>Thank you for creating an account with NaviGO.</p>
          <p>Your account has been successfully created.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>The NaviGO Team</p>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Email service error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Process messages from the queue
 */
async function processEmailQueue(supabase: any): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  try {
    // Read messages from the queue
    // Note: You may need to adjust this based on your pgmq setup
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'account_emails',
      vt: 300, // Visibility timeout in seconds
      qty: 10, // Number of messages to read
    });

    if (readError) {
      console.error('Error reading queue:', readError);
      return { processed: 0, failed: 0, errors: [readError.message] };
    }

    if (!messages || messages.length === 0) {
      return { processed: 0, failed: 0, errors: [] };
    }

    const emailApiKey = Deno.env.get('EMAIL_SERVICE_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'noreply@yourdomain.com';

    if (!emailApiKey) {
      throw new Error('EMAIL_SERVICE_API_KEY not configured');
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each message
    for (const message of messages) {
      try {
        const { msg_id, message: msgData } = message;
        const emailMsg = msgData as EmailMessage;

        if (emailMsg.type !== 'welcome_email') {
          console.warn(`Unknown message type: ${emailMsg.type}`);
          // Archive unknown message types
          await supabase.rpc('pgmq_archive', {
            queue_name: 'account_emails',
            msg_id: msg_id,
          });
          continue;
        }

        if (!emailMsg.email) {
          console.warn(`No email address in message ${msg_id}`);
          await supabase.rpc('pgmq_archive', {
            queue_name: 'account_emails',
            msg_id: msg_id,
          });
          continue;
        }

        // Send the email
        await sendWelcomeEmail(
          emailMsg.email,
          emailMsg.name || 'User',
          emailMsg.user_id,
          emailApiKey,
          emailFrom
        );

        // Archive the message after successful processing
        const { error: archiveError } = await supabase.rpc('pgmq_archive', {
          queue_name: 'account_emails',
          msg_id: msg_id,
        });

        if (archiveError) {
          console.error(`Error archiving message ${msg_id}:`, archiveError);
        } else {
          results.processed++;
          console.log(`✅ Processed welcome email for ${emailMsg.email}`);
        }
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`Message ${message.msg_id}: ${errorMsg}`);
        console.error(`❌ Error processing message ${message.msg_id}:`, error);

        // Optionally implement retry logic or dead letter queue
      }
    }

    return results;
  } catch (error) {
    console.error('Fatal error processing queue:', error);
    return {
      processed: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!cronSecret || providedSecret !== cronSecret) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or missing CRON_SECRET',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process the queue
    const results = await processEmailQueue(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in process-account-emails function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});



