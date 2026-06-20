import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdmin } from '../_shared/adminAuth.ts';
import { generateRawKey, hashApiKey } from '../_shared/apiKeys.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST requests are permitted
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST requests are permitted.'
        }
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Authenticate user and confirm they are admin
    const authResult = await verifyAdmin(req);
    if (authResult instanceof Response) {
      // Return authentication failure response directly (CORS must be appended)
      const headers = new Headers(authResult.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      return new Response(authResult.body, { status: authResult.status, headers });
    }

    const { userId } = authResult;

    // 2. Parse request payload
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid JSON request body.'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { clientId, dailyLimit = 100 } = body;
    if (!clientId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'clientId parameter is required.'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const limitNum = Number(dailyLimit);
    if (isNaN(limitNum) || !Number.isInteger(limitNum) || limitNum < 1 || limitNum > 10000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'حد الطلبات اليومي يجب أن يكون رقماً صحيحاً بين 1 و 10000 استدعاء.'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();

    // 3. Confirm that the client exists
    const { data: client, error: clientErr } = await supabase
      .from('api_clients')
      .select('id, name')
      .eq('id', clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'The requested API client was not found.'
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Generate the secure credentials
    const rawKey = generateRawKey();
    const prefix = rawKey.substring(0, 18); // "hsba_live_" + 8 characters of token
    const hash = await hashApiKey(rawKey);

    // 5. Store key metadata while hashing the raw secret securely
    const { data: apiKeyRecord, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        client_id: clientId,
        key_prefix: prefix,
        key_hash: hash,
        daily_limit: limitNum,
        status: 'active',
        created_by: userId
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API KEY CREATE] Database insert failed:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to securely store the API key.'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Return response containing the raw key ONCE (without key_hash or full record)
    return new Response(
      JSON.stringify({
        success: true,
        apiKey: rawKey,
        keyPrefix: prefix,
        message: 'انسخ هذا المفتاح الآن. لن تتمكن من رؤيته مرة أخرى.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[API KEY CREATE] Unexpected error triggered:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An internal server error occurred.'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
