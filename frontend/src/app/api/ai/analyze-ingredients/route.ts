import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/** Extract user session or return 401. */
async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: 'Unauthorized – please log in' };
  }
  return { user, error: null };
}

/** Build common headers for the FastAPI proxy call. */
function proxyHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

// ------------------------------------------------------------------ //
//  POST /api/ai/analyze-ingredients
// ------------------------------------------------------------------ //
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, message: authError },
        { status: 401 }
      );
    }

    const businessId = user.id;
    let body = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine – rules are optional
    }

    const supabase = await createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const res = await fetch(
      `${FASTAPI_URL}/api/ai/analyze-ingredients/${encodeURIComponent(businessId)}`,
      {
        method: 'POST',
        headers: proxyHeaders(accessToken),
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[API /ai/analyze-ingredients POST]', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
