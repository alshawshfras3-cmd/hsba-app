import { supabase } from './supabase';

export interface ApiClient {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'disabled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  active_keys_count?: number;
  keys_count?: number;
  last_used_at?: string | null;
}

export interface ApiKey {
  id: string;
  client_id: string;
  key_prefix: string;
  key_hash: string;
  status: 'active' | 'revoked';
  daily_limit: number;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface ApiRequestLog {
  id: string;
  client_id: string | null;
  api_key_id: string | null;
  external_request_id: string | null;
  request_payload: any;
  status: string;
  error_message: string | null;
  created_at: string;
  duration_ms: number | null;
  client_name?: string;
}

// 1. List API Clients with their integrated active keys count and last action date
export async function listApiClients(): Promise<ApiClient[]> {
  try {
    const { data: clients, error: clientsError } = await supabase
      .from('api_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientsError) throw clientsError;
    if (!clients) return [];

    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, client_id, status, last_used_at');

    if (keysError) throw keysError;

    return clients.map((client: any) => {
      const clientKeys = (keys || []).filter(k => k.client_id === client.id);
      const activeKeysCount = clientKeys.filter(k => k.status === 'active').length;
      
      let lastUsedAt: string | null = null;
      for (const k of clientKeys) {
        if (k.last_used_at) {
          if (!lastUsedAt || new Date(k.last_used_at) > new Date(lastUsedAt)) {
            lastUsedAt = k.last_used_at;
          }
        }
      }

      return {
        ...client,
        active_keys_count: activeKeysCount,
        keys_count: clientKeys.length,
        last_used_at: lastUsedAt
      };
    });
  } catch (err) {
    console.error('[API INTEGRATIONS SERVICE] Error in listApiClients:', err);
    throw err;
  }
}

// 2. Create API Client
export async function createApiClient(
  name: string, 
  description: string, 
  status: 'active' | 'disabled' = 'active',
  creatorId?: string
): Promise<ApiClient> {
  const { data, error } = await supabase
    .from('api_clients')
    .insert({
      name,
      description: description || null,
      status,
      created_by: creatorId || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. Update API Client status
export async function updateApiClientStatus(
  clientId: string, 
  status: 'active' | 'disabled'
): Promise<ApiClient> {
  const { data, error } = await supabase
    .from('api_clients')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 4. List all API Keys for a client
export async function listApiKeys(clientId: string): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 5. Create secure API Key (uses secure Supabase Edge Function to generate & hash client-side secrets safely)
export async function createApiKey(
  clientId: string, 
  dailyLimit: number = 100, 
  creatorId?: string
): Promise<ApiKey & { rawKey: string }> {
  const { data, error } = await supabase.functions.invoke('api-key-create', {
    body: { clientId, dailyLimit }
  });

  if (error || !data || !data.success) {
    const errorMsg = error?.message || data?.error?.message || 'فشلت عملية إنشاء المفتاح عبر الوظائف السحابية الأمنية';
    throw new Error(errorMsg);
  }

  return {
    rawKey: data.apiKey,
    client_id: clientId,
    key_prefix: data.keyPrefix,
    daily_limit: dailyLimit,
    status: 'active',
  } as any;
}

// 6. Revoke API Key (secure soft revoke)
export async function revokeApiKey(keyId: string): Promise<ApiKey> {
  const { data, error } = await supabase
    .from('api_keys')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString()
    })
    .eq('id', keyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 7. Get API Integrations Stats Card metrics
export async function getApiIntegrationStats() {
  try {
    const { data: clients, error: clientsErr } = await supabase
      .from('api_clients')
      .select('id, status');
    
    // Ignore error if table is not fully prepared in other contexts, fallback gracefully
    if (clientsErr) throw clientsErr;

    const { data: keys, error: keysErr } = await supabase
      .from('api_keys')
      .select('id, status');

    if (keysErr) throw keysErr;

    const totalClients = clients?.length || 0;
    const activeClients = clients?.filter(c => c.status === 'active').length || 0;
    const activeKeys = keys?.filter(k => k.status === 'active').length || 0;

    // Daily Requests (requests created today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: requests, error: reqsErr } = await supabase
      .from('api_calculation_requests')
      .select('id, status')
      .gte('created_at', startOfToday.toISOString());

    // We fallback logs to 0 if table empty or requests aren't made yet
    const todayRequests = requests?.length || 0;
    const todaySuccess = requests?.filter(r => r.status === 'success' || r.status === 'completed' || r.status === 'received').length || 0;
    const todayFailed = requests?.filter(r => r.status === 'failed' || r.status === 'error').length || 0;

    return {
      totalClients,
      activeClients,
      activeKeys,
      todayRequests,
      todaySuccess,
      todayFailed
    };
  } catch (err) {
    console.warn('[API INTEGRATIONS SERVICE] Error getting stats (tables may be empty/unmigrated)', err);
    return {
      totalClients: 0,
      activeClients: 0,
      activeKeys: 0,
      todayRequests: 0,
      todaySuccess: 0,
      todayFailed: 0
    };
  }
}

// 8. List recent API calculations log
export async function listRecentApiRequests(limit: number = 20): Promise<ApiRequestLog[]> {
  try {
    const { data: requests, error: err } = await supabase
      .from('api_calculation_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (err) throw err;
    if (!requests || requests.length === 0) return [];

    // Map client IDs to their clear readable names
    const clientIds = Array.from(new Set(requests.map(r => r.client_id).filter(Boolean)));
    
    const clientMap: Record<string, string> = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('api_clients')
        .select('id, name')
        .in('id', clientIds);
      if (clients) {
        clients.forEach(c => {
          clientMap[c.id] = c.name;
        });
      }
    }

    return requests.map(r => ({
      ...r,
      client_name: r.client_id ? (clientMap[r.client_id] || 'جهة غير معروفة') : 'عام'
    }));
  } catch (err) {
    console.warn('[API INTEGRATIONS SERVICE] Error fetching recent API requests log:', err);
    return [];
  }
}

// 9. List recent API calculation results log
export interface ApiResultLog {
  id: string;
  request_id: string;
  client_id: string | null;
  api_key_id: string | null;
  result_payload: any;
  status: string;
  error_message: string | null;
  created_at: string;
  duration_ms: number | null;
  client_name?: string;
}

export async function listRecentApiResults(limit: number = 20): Promise<ApiResultLog[]> {
  try {
    const { data: results, error: err } = await supabase
      .from('api_calculation_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (err) throw err;
    if (!results || results.length === 0) return [];

    const clientIds = Array.from(new Set(results.map(r => r.client_id).filter(Boolean)));
    const clientMap: Record<string, string> = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('api_clients')
        .select('id, name')
        .in('id', clientIds);
      if (clients) {
        clients.forEach(c => {
          clientMap[c.id] = c.name;
        });
      }
    }

    return results.map(r => ({
      ...r,
      client_name: r.client_id ? (clientMap[r.client_id] || 'جهة غير معروفة') : 'عام'
    }));
  } catch (err) {
    console.warn('[API INTEGRATIONS SERVICE] Error fetching recent API results log:', err);
    return [];
  }
}

// Sandbox testing utilities calling Supabase Edge Functions with arbitrary credentials
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || '').trim() || 'https://placeholder.supabase.co';

export async function testApiHealth() {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/api-health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const status = response.status;
    const data = await response.json().catch(() => ({}));
    return { status, data };
  } catch (err: any) {
    return { status: 500, error: err.message || err };
  }
}

export async function testApiKeyCheck(apiKey: string) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/api-key-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    const status = response.status;
    const data = await response.json().catch(() => ({}));
    return { status, data };
  } catch (err: any) {
    return { status: 500, error: err.message || err };
  }
}

export async function testApiCalculate(apiKey: string, payload: any) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/api-calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const status = response.status;
    const data = await response.json().catch(() => ({}));
    return { status, data };
  } catch (err: any) {
    return { status: 500, error: err.message || err };
  }
}


