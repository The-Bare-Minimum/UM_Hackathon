"""
Assets Router
─────────────
CRUD + mark serviced + AI analysis for machines & subscriptions.
"""

import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.assets import AssetService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assets", tags=["Assets"])


class AssetCreateRequest(BaseModel):
    name: str
    asset_type: str = "machine"
    purchase_date: Optional[str] = None
    last_maintenance: Optional[str] = None
    next_maintenance: Optional[str] = None
    renewal_date: Optional[str] = None
    cost_per_renewal: float = 0
    status: str = "active"
    notes: Optional[str] = None


class AssetUpdateRequest(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    purchase_date: Optional[str] = None
    last_maintenance: Optional[str] = None
    next_maintenance: Optional[str] = None
    renewal_date: Optional[str] = None
    cost_per_renewal: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _ok(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    return {"success": True, "message": message, "data": data}


@router.get("/{business_id}")
async def list_assets(business_id: str):
    svc = AssetService()
    assets = await svc.get_all(business_id)
    return _ok(data=assets)


@router.post("/{business_id}")
async def create_asset(business_id: str, body: AssetCreateRequest):
    svc = AssetService()
    asset = await svc.create(business_id, body.model_dump(exclude_none=True))
    return _ok(data=asset, message="Asset created")


@router.put("/{business_id}/{asset_id}")
async def update_asset(business_id: str, asset_id: str, body: AssetUpdateRequest):
    svc = AssetService()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    asset = await svc.update(asset_id, updates)
    return _ok(data=asset, message="Asset updated")


@router.delete("/{business_id}/{asset_id}")
async def delete_asset(business_id: str, asset_id: str):
    svc = AssetService()
    await svc.delete(asset_id)
    return _ok(message="Asset deleted")


@router.post("/{business_id}/{asset_id}/service")
async def mark_serviced(business_id: str, asset_id: str):
    svc = AssetService()
    asset = await svc.mark_serviced(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return _ok(data=asset, message="Asset marked as serviced/renewed")


@router.post("/{business_id}/analyze")
async def analyze_assets(business_id: str):
    svc = AssetService()
    result = await svc.analyze_with_zai(business_id)
    return _ok(data=result, message="Asset analysis complete")


@router.get("/{business_id}/monthly-cost")
async def get_monthly_cost(business_id: str):
    svc = AssetService()
    cost = await svc.get_monthly_cost(business_id)
    return _ok(data={"monthly_cost": cost})
