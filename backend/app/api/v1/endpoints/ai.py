from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.z_ai_service import ZAIService
from app.core.config import get_settings, Settings
from app.db.supabase import get_supabase_client
from supabase import AsyncClient

router = APIRouter()

class BriefingRequest(BaseModel):
    business_context: str

@router.post("/daily-briefing")
async def generate_daily_briefing(
    request: BriefingRequest,
    settings: Settings = Depends(get_settings),
    db: AsyncClient = Depends(get_supabase_client)
):
    """
    Generate an AI daily briefing based on the business context.
    """
    ai_service = ZAIService(settings)
    
    # 1. Gather stats from DB (Mocked for boilerplate)
    # stats = await db.table("inventory")....
    
    system_prompt = "You are a professional business advisor. Summarize the daily operations into a crisp briefing."
    user_message = f"Please generate a briefing based on this context: {request.business_context}"
    
    briefing = await ai_service.generate_response(system_prompt, user_message)
    return {"briefing": briefing}
