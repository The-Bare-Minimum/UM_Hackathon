from fastapi import APIRouter
from services.staff import StaffService
from typing import List, Dict, Any

router = APIRouter(prefix="/staff", tags=["Staff"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_staff(business_id: str = "default"):
    service = StaffService()
    return await service.get_all(business_id)
