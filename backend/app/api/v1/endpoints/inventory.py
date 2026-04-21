from fastapi import APIRouter, Depends, HTTPException
from supabase import AsyncClient
from app.db.supabase import get_supabase_client
from app.services.inventory_service import InventoryService
from typing import List, Dict, Any

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def get_inventory(db: AsyncClient = Depends(get_supabase_client)):
    """
    Get all inventory items.
    """
    service = InventoryService(db)
    items = await service.get_inventory_items()
    return items

@router.get("/{item_id}/predict-waste")
async def predict_item_waste(
    item_id: str, 
    db: AsyncClient = Depends(get_supabase_client)
    # Ideally, we would also inject the ZAIService here
):
    """
    Get AI-predicted waste for a specific item.
    """
    from app.services.z_ai_service import ZAIService
    from app.core.config import get_settings
    
    # Intialize services
    service = InventoryService(db)
    ai_service = ZAIService(get_settings())
    
    prediction = await service.predict_waste(item_id, ai_service)
    return {"item_id": item_id, "prediction": prediction}
