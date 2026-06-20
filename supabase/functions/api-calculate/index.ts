import { corsHeaders } from '../_shared/cors.ts';
import { verifyApiKey } from '../_shared/apiKeys.ts';
import { validateCalculatePayload } from '../_shared/calculateValidation.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { loadAppSettings } from '../_shared/loadAppSettings.ts';
import { mapPayloadToEngineInput } from '../_shared/calculateAdapter.ts';
import { calculateBanksFinancing } from '../_shared/financeEngine.ts';
import { sanitizeBankResponse } from '../_shared/calculateResponseSanitizer.ts';

function sanitizeRequestPayloadForLog(payload: any) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  
  const sanitized: any = {};
  
  if (payload.requestId !== undefined) sanitized.requestId = payload.requestId;
  
  if (payload.customer && typeof payload.customer === 'object') {
    sanitized.customer = {
      employmentSector: payload.customer.employmentSector,
      employmentDate: payload.customer.employmentDate,
    };
    
    // Detailed birthDate, fine allowances, exact net salary and obligations are sensitive PII / financial data.
    // We only preserve rounded or range-indicative representations in logs.
    const rawSalary = Number(payload.customer.salary);
    if (!isNaN(rawSalary)) {
      sanitized.customer.salaryRounded = Math.round(rawSalary / 1000) * 1000;
    }
    
    const rawBasic = Number(payload.customer.basicSalary);
    if (payload.customer.basicSalary !== undefined && !isNaN(rawBasic)) {
      sanitized.customer.basicSalaryRounded = Math.round(rawBasic / 1000) * 1000;
    }

    const rawObligations = Number(payload.customer.obligations);
    if (payload.customer.obligations !== undefined && !isNaN(rawObligations)) {
      sanitized.customer.obligationsRounded = Math.round(rawObligations / 100) * 100;
    }
  }
  
  if (payload.finance && typeof payload.finance === 'object') {
    sanitized.finance = {
      type: payload.finance.type,
      propertyPrice: payload.finance.propertyPrice,
      downPayment: payload.finance.downPayment,
      supportType: payload.finance.supportType,
      preferredBank: payload.finance.preferredBank,
      termYears: payload.finance.termYears,
    };
  }
  
  return sanitized;
}

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
        request_payload: sanitizeRequestPayloadForLog(body),
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
        request_payload: sanitizeRequestPayloadForLog(validation.normalizedData),
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
      throw new Error('CONFIG_ERROR_MISSING_SETTINGS');
    }

    const requiredKeys = [
      'banks',
      'products',
      'marginRules',
      'dsrRules',
      'salaryRules',
      'pensionRules',
      'personalRules',
      'termRules',
      'supportSettings'
    ];

    const missingKeys = requiredKeys.filter(k => {
      const val = appSettings[k];
      if (val === null || val === undefined) return true;
      if (Array.isArray(val) && val.length === 0) return true;
      if (typeof val === 'object' && Object.keys(val).length === 0) return true;
      return false;
    });

    if (missingKeys.length > 0) {
      throw new Error(`CONFIG_ERROR_INCOMPLETE_${missingKeys.join('_').toUpperCase()}`);
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
          message: 'إعدادات الحسبة غير مكتملة في لوحة التحكم.'
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

    // 7. Sanitize external response results using centralized response sanitizer
    const propertyPrice = validation.normalizedData?.finance?.propertyPrice
      ? Number(validation.normalizedData.finance.propertyPrice)
      : 0;

    const sanitizedObj = sanitizeBankResponse(engineResults, propertyPrice);
    const duration = Date.now() - startTime;
    let resultId = null;

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

      // 2. Insert into api_calculation_results with exactly the sanitized response contract
      try {
        const { data: record, error: resErr } = await supabase
          .from('api_calculation_results')
          .insert({
            request_id: reqId,
            client_id: clientId,
            api_key_id: apiKeyId,
            result_payload: {
              success: true,
              resultId: null, // placeholder to be updated below, or fallback
              requestId: extReqId,
              eligible: sanitizedObj.eligible,
              status: sanitizedObj.status,
              summary: sanitizedObj.summary,
              banks: sanitizedObj.banks,
              notes: sanitizedObj.notes
            },
            status: 'success',
            duration_ms: duration
          })
          .select('id')
          .single();

        if (record) {
          resultId = record.id;
        } else if (resErr) {
          console.error('[API CALCULATE] Failed to log sanitized result payload:', resErr);
        }
      } catch (insertErr) {
        console.error('[API CALCULATE] Unexpected exception logging result row:', insertErr);
      }
    }

    const finalPayload = {
      success: true,
      resultId,
      requestId: extReqId,
      eligible: sanitizedObj.eligible,
      status: sanitizedObj.status,
      summary: sanitizedObj.summary,
      banks: sanitizedObj.banks,
      notes: sanitizedObj.notes
    };

    // Keep result_payload in sync with resultId asynchronously
    if (resultId && reqId) {
      supabase
        .from('api_calculation_results')
        .update({ result_payload: finalPayload })
        .eq('id', resultId)
        .then(({ error }) => {
          if (error) console.error('[API CALCULATE] Failed to update logged payload with resultId:', error);
        });
    }

    return new Response(
      JSON.stringify(finalPayload),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[API CALCULATE] Core engine execution failed:', err);
    const duration = Date.now() - startTime;
    
    const isConfigError = err?.message?.startsWith('CONFIG_ERROR_');
    const errCode = isConfigError ? 'CONFIGURATION_ERROR' : 'ENGINE_CALCULATION_ERROR';
    const errMsg = isConfigError
      ? 'إعدادات الحسبة غير مكتملة في لوحة التحكم.'
      : 'عذراً، حدث خطأ أثناء حساب المعادلة المالية الخاصة بك. يرجى مراجعة المعطيات وتهيئتها.';

    if (reqId) {
      await supabase
        .from('api_calculation_requests')
        .update({
          status: isConfigError ? 'configuration_error' : 'calculation_error',
          error_message: err?.message || 'Calculation core exception',
          duration_ms: duration
        })
        .eq('id', reqId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: errCode,
          message: errMsg
        }
      }),
      { status: isConfigError ? 400 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
