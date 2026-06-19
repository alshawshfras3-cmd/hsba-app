import { getSupabaseAdmin } from './supabaseAdmin.ts';

/**
 * Verifies that the request has a valid Supabase authorization token 
 * and that the corresponding user is an administrator.
 */
export async function verifyAdmin(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authentication token.'
        }
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseAdmin();

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired user session.'
        }
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check if user is admin using public.is_admin via rpc or table select
  const { data: isAdmin, error: adminErr } = await supabase.rpc('is_admin', { user_uuid: user.id });
  
  if (adminErr || !isAdmin) {
    // Alternate check directly on public.admins table in case rpc fails or handles permissions differently
    const { data: adminRow, error: tableErr } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tableErr || !adminRow) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. Administrator privileges required.'
          }
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return { userId: user.id };
}
