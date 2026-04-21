from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from supabase import create_async_client, AsyncClient
from app.core.config import get_settings, Settings
import httpx

async def get_supabase_client(settings: Settings = Depends(get_settings)) -> AsyncGenerator[AsyncClient, None]:
    """
    Dependency to provide an async Supabase client.
    Using create_async_client ensures non-blocking IO.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
         raise HTTPException(
             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
             detail="Supabase credentials not configured."
         )
         
    # Optional: We could pass a custom httpx.AsyncClient here if we want to share connection pools,
    # but create_async_client handles it well enough for basic usage.
    client: AsyncClient = await create_async_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )
    
    try:
        yield client
    finally:
        # In a real-world scenario with persistent connection pools, we would
        # cleanly shutdown or return the connection here if using custom clients.
        pass
