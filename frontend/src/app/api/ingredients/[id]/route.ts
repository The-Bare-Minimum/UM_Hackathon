import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/** Shared helper: extract user session or return a 401 response. */
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
//  PUT /api/ingredients/[id] → update an ingredient
// ------------------------------------------------------------------ //
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, message: authError },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = await createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const res = await fetch(`${FASTAPI_URL}/api/ingredients/${id}`, {
      method: 'PUT',
      headers: proxyHeaders(accessToken),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[API /ingredients/[id] PUT]', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------ //
//  DELETE /api/ingredients/[id] → delete an ingredient
// ------------------------------------------------------------------ //
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, message: authError },
        { status: 401 }
      );
    }

    const { id } = await params;

    const supabase = await createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const res = await fetch(`${FASTAPI_URL}/api/ingredients/${id}`, {
      method: 'DELETE',
      headers: proxyHeaders(accessToken),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[API /ingredients/[id] DELETE]', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
