from fastapi import APIRouter
from services.menu_items import MenuItemService
from typing import List, Dict, Any

router = APIRouter(prefix="/menu_items", tags=["Menu Items"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_menu_items(business_id: str = "default"):
    service = MenuItemService()
    return await service.get_all(business_id)
