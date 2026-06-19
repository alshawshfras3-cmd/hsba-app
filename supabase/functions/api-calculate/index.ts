import { corsHeaders } from '../_shared/cors.ts';
import { verifyApiKey } from '../_shared/apiKeys.ts';
import { validateCalculatePayload } from '../_shared/calculateValidation.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { loadAppSettings } from '../_shared/loadAppSettings.ts';
import { mapPayloadToEngineInput } from '../_shared/calculateAdapter.ts';
import { calculateBanksFinancing } from '../_shared/financeEngine.ts';

Deno.serve(async (req) => {
  const startTime = Date.now();

  // 1. Handle CORS preflight
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

  // 2. Extract API Key and Authenticate
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

    const isAuthFailure = checkResult.error === 'KEY_NOT_FOUND' || checkResult.error === 'INVALID_FORMAT';
    const statusCode = isAuthFailure ? 401 : 403;
    const errMessage = isAuthFailure ? 'Invalid or unknown API key.' : 'API key is revoked or client is disabled.';

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: isAuthFailure ? 'UNAUTHORIZED' : 'ACCESS_DENIED',
          message: errMessage
        }
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { apiKeyId, clientId } = checkResult;
  const supabase = getSupabaseAdmin();

  // Update last_used_at in background asynchronously
  if (apiKeyId) {
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyId)
      .then(({ error }) => {
        if (error) console.error('[API CALCULATE] Failed to update key last_used_at:', error);
      });
  }

  // 3. Parse and Map HTTP request payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid JSON request payload.'
        }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const extReqId = body?.requestId || null;

  // 4. Validate payload
  const validation = validateCalculatePayload(body);

  if (!validation.valid) {
    const duration = Date.now() - startTime;
    const firstErrorMessage = validation.errors[0]?.message || 'Validation failed';

    // Log validation_error
    const { error: logError } = await supabase
      .from('api_calculation_requests')
      .insert({
        client_id: clientId,
        api_key_id: apiKeyId,
        external_request_id: extReqId,
        request_payload: body,
        status: 'validation_error',
        error_message: firstErrorMessage,
        duration_ms: duration
      });

    if (logError) console.error('[API CALCULATE] Failed to log validation_error request:', logError);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload.',
          details: validation.errors
        }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create initial log record in api_calculation_requests table
  let reqId = '';
  try {
    const { data: requestRecord, error: logError } = await supabase
      .from('api_calculation_requests')
      .insert({
        client_id: clientId,
        api_key_id: apiKeyId,
        external_request_id: extReqId,
        request_payload: validation.normalizedData,
        status: 'received',
        duration_ms: 0
      })
      .select('id')
      .single();

    if (logError) {
      console.error('[API CALCULATE] Saving initial request log failed:', logError);
    }
    reqId = requestRecord?.id || '';
  } catch (err) {
    console.error('[API CALCULATE] Failed to log initial request:', err);
  }

  // 5. Load App Settings
  let appSettings: any = null;
  try {
    appSettings = await loadAppSettings();
    if (!appSettings) {
      throw new Error('No configuration resolved in system_settings.');
    }
  } catch (err: any) {
    console.error('[API CALCULATE] Failed to load configurations:', err);
    const duration = Date.now() - startTime;
    if (reqId) {
      await supabase
        .from('api_calculation_requests')
        .update({
          status: 'configuration_error',
          error_message: err?.message || 'Configuration load failure',
          duration_ms: duration
        })
        .eq('id', reqId);
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'فشل تحميل إعدادات وقواعد النظام من السيرفر.'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 6. Convert incoming normalized payload using mapping adapter and invoke Finance Engine
  try {
    const engineInput = mapPayloadToEngineInput(validation.normalizedData, appSettings);
    
    // Call our compiled, fully single-file edge-compatible calculation engine
    const engineResults = calculateBanksFinancing(engineInput);

    if (!Array.isArray(engineResults)) {
      throw new Error('Calculation engine returned an invalid result format (not an array).');
    }

    // 7. Sanitize external response results
    const sanitizedResults = engineResults.map((r: any) => ({
      bankId: r.bankId,
      bankName: r.bankName,
      isEligible: !!r.isEligible,
      rejectionReason: r.isEligible ? null : (r.rejectionReason || 'غير متوافق مع معايير البنك للأهلية'),
      summary: {
        totalPurchasingPower: Number(r.totalPurchasingPower ?? 0),
        maxRealEstateLoan: Number(r.realEstateAmount ?? 0),
        maxPersonalLoan: Number(r.personalAmount ?? 0),
        monthlyInstallment: Number(r.monthlyInstallmentBeforeRetirement ?? 0),
        monthlyInstallmentAfterRetirement: Number(r.monthlyInstallmentAfterRetirement ?? r.monthlyInstallmentBeforeRetirement ?? 0),
        termMonths: Number(r.termMonths ?? 0),
        annualMarginRate: Number(r.annualMargin ?? 0),
        dsrUsedPercentage: Number(r.dsrUsed ?? 0)
      },
      support: {
        type: r.supportType || 'none',
        monthlySupportAmount: Number(r.housingSupportAmount ?? 0),
        isSupported: (r.supportType && r.supportType !== 'none' && (r.housingSupportAmount ?? 0) > 0) ? true : false
      }
    }));

    // Choose best eligible option
    const eligibleResults = sanitizedResults.filter((r: any) => r.isEligible);
    let bestOption = null;
    if (eligibleResults.length > 0) {
      eligibleResults.sort((a: any, b: any) => {
        if (b.summary.totalPurchasingPower !== a.summary.totalPurchasingPower) {
          return b.summary.totalPurchasingPower - a.summary.totalPurchasingPower;
        }
        return b.summary.maxRealEstateLoan - a.summary.maxRealEstateLoan;
      });
      bestOption = eligibleResults[0];
    }

    const payloadResponse = {
      success: true,
      requestId: extReqId,
      internalRequestId: reqId || null,
      bestOption,
      results: sanitizedResults
    };

    const duration = Date.now() - startTime;

    // Save final status and results to tables in database
    if (reqId) {
      // 1. Update calculation requests to success
      await supabase
        .from('api_calculation_requests')
        .update({
          status: 'success',
          duration_ms: duration
        })
        .eq('id', reqId);

      // 2. Insert into api_calculation_results
      await supabase
        .from('api_calculation_results')
        .insert({
          request_id: reqId,
          client_id: clientId,
          api_key_id: apiKeyId,
          result_payload: payloadResponse,
          status: 'success',
          duration_ms: duration
        });
    }

    return new Response(
      JSON.stringify(payloadResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[API CALCULATE] Core engine execution failed:', err);
    const duration = Date.now() - startTime;
    if (reqId) {
      await supabase
        .from('api_calculation_requests')
        .update({
          status: 'calculation_error',
          error_message: err?.message || 'Calculation core exception',
          duration_ms: duration
        })
        .eq('id', reqId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'ENGINE_CALCULATION_ERROR',
          message: 'عذراً، حدث خطأ أثناء حساب المعادلة المالية الخاصة بك. يرجى مراجعة المعطيات وتهيئتها.'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
