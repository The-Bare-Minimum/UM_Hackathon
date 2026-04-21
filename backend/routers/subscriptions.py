from fastapi import APIRouter
from services.subscriptions import SubscriptionService
from typing import List, Dict, Any

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_subscriptions(business_id: str = "default"):
    service = SubscriptionService()
    return await service.get_all(business_id)
