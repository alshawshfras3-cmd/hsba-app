import { getSupabaseAdmin } from './supabaseAdmin.ts';

/**
 * Generates a strong raw API key string
 */
export function generateRawKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint32Array(32);
  crypto.getRandomValues(array);
  let randStr = '';
  for (let i = 0; i < array.length; i++) {
    randStr += chars[array[i] % chars.length];
  }
  return `hsba_live_${randStr}`;
}

/**
 * Securely hashes an API key using HMAC-SHA256 and salt/pepper from environment variables
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  const pepper = Deno.env.get('HESBA_API_KEY_PEPPER');
  if (!pepper) {
    throw new Error('HESBA_API_KEY_PEPPER_MISSING');
  }
  const encoder = new TextEncoder();
  const keyData = encoder.encode(pepper);
  const messageData = encoder.encode(rawKey);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData
  );

  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies if a given raw API key is valid, active, and within its daily rate limits
 */
export async function verifyApiKey(rawKey: string) {
  if (!rawKey || !rawKey.startsWith('hsba_live_') || rawKey.length < 25) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  // Prefix holds first 18 characters (e.g., 'hsba_live_abcdefgh')
  const prefix = rawKey.substring(0, 18);
  const hash = await hashApiKey(rawKey);

  const supabase = getSupabaseAdmin();
  const { data: apiKey, error: keyErr } = await supabase
    .from('api_keys')
    .select('id, client_id, daily_limit, status')
    .eq('key_prefix', prefix)
    .eq('key_hash', hash)
    .maybeSingle();

  if (keyErr || !apiKey) {
    return { valid: false, error: 'KEY_NOT_FOUND' };
  }

  if (apiKey.status === 'revoked') {
    return { valid: false, error: 'KEY_REVOKED', apiKeyId: apiKey.id, clientId: apiKey.client_id };
  }

  // Check client status
  const { data: client, error: clientErr } = await supabase
    .from('api_clients')
    .select('status')
    .eq('id', apiKey.client_id)
    .maybeSingle();

  if (clientErr || !client) {
    return { valid: false, error: 'CLIENT_NOT_FOUND', apiKeyId: apiKey.id, clientId: apiKey.client_id };
  }

  if (client.status === 'disabled') {
    return { valid: false, error: 'CLIENT_DISABLED', apiKeyId: apiKey.id, clientId: apiKey.client_id };
  }

  // Count requests today
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { count, error: countErr } = await supabase
    .from('api_calculation_requests')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKey.id)
    .gte('created_at', startOfToday.toISOString());

  if (countErr) {
    return { valid: false, error: 'DB_ERROR', apiKeyId: apiKey.id, clientId: apiKey.client_id };
  }

  const usedToday = count ?? 0;
  const limitExceeded = usedToday >= apiKey.daily_limit;

  return {
    valid: !limitExceeded,
    error: limitExceeded ? 'RATE_LIMIT_EXCEEDED' : null,
    apiKeyId: apiKey.id,
    clientId: apiKey.client_id,
    dailyLimit: apiKey.daily_limit,
    usedToday,
    remainingToday: Math.max(0, apiKey.daily_limit - usedToday)
  };
}
