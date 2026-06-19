import { corsHeaders } from '../_shared/cors.ts';
import { verifyApiKey } from '../_shared/apiKeys.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  // Handle CORS OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only GET requests are allowed for key checking
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only GET requests are permitted.'
        }
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Missing or invalid API key in Authorization header.'
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawKey = authHeader.substring(7);

    // Verify key with shared validator
    const checkResult = await verifyApiKey(rawKey);

    if (!checkResult.valid) {
      if (checkResult.error === 'RATE_LIMIT_EXCEEDED') {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Daily API request limit exceeded.'
            }
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Any other validation error (revoked key, disabled client, key not found)
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid, disabled, or revoked API key.'
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Key is verified successfully! Update its last_used_at in the background
    const supabase = getSupabaseAdmin();
    if (checkResult.apiKeyId) {
      const { error: updateErr } = await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', checkResult.apiKeyId);

      if (updateErr) {
        console.error('[API KEY CHECK] Failed to update last_used_at:', updateErr);
      }
    }

    // Return the authorized details
    return new Response(
      JSON.stringify({
        success: true,
        status: 'valid',
        clientId: checkResult.clientId,
        dailyLimit: checkResult.dailyLimit,
        usedToday: checkResult.usedToday,
        remainingToday: checkResult.remainingToday
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[API KEY CHECK] Unexpected exception:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during API key verification.'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
