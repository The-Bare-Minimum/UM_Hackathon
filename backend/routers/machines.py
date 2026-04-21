from fastapi import APIRouter
from services.machines import MachineService
from typing import List, Dict, Any

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_machines(business_id: str = "default"):
    service = MachineService()
    return await service.get_all(business_id)
