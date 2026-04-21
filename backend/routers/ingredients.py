import logging
from fastapi import APIRouter, HTTPException
from services.ingredients import IngredientService
from schemas.ingredient import IngredientCreate, IngredientUpdate, IngredientResponse
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingredients", tags=["Ingredients"])


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #
def _ok(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    """Wrap every response in a consistent envelope."""
    return {"success": True, "message": message, "data": data}


def _fail(message: str = "Error", status: int = 400) -> None:
    """Raise an HTTPException with a consistent body."""
    raise HTTPException(
        status_code=status,
        detail={"success": False, "message": message, "data": None},
    )


# --------------------------------------------------------------------------- #
#  1. GET /api/ingredients/{business_id}
# --------------------------------------------------------------------------- #
@router.get("/{business_id}", response_model=Dict[str, Any])
async def get_ingredients(business_id: str):
    """Fetch all ingredients for a business."""
    try:
        service = IngredientService()
        items = await service.get_all(business_id)
        return _ok(data=items, message=f"Found {len(items)} ingredient(s)")
    except Exception as e:
        logger.error(f"GET ingredients failed: {e}")
        _fail("Failed to fetch ingredients", 500)


# --------------------------------------------------------------------------- #
#  2. POST /api/ingredients
# --------------------------------------------------------------------------- #
@router.post("/", response_model=Dict[str, Any], status_code=201)
async def create_ingredient(payload: IngredientCreate, business_id: str):
    """Create a new ingredient for *business_id*."""
    try:
        service = IngredientService()
        data = payload.model_dump(exclude_none=True)
        # Convert date to ISO string for JSON serialisation
        if "expiry_date" in data and data["expiry_date"] is not None:
            data["expiry_date"] = data["expiry_date"].isoformat()
        created = await service.create(business_id, data)
        if not created:
            _fail("Ingredient could not be created", 400)
        return _ok(data=created, message="Ingredient created")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"POST ingredient failed: {e}")
        _fail("Failed to create ingredient", 500)


# --------------------------------------------------------------------------- #
#  3. PUT /api/ingredients/{id}
# --------------------------------------------------------------------------- #
@router.put("/{id}", response_model=Dict[str, Any])
async def update_ingredient(id: str, payload: IngredientUpdate):
    """Update an existing ingredient by *id*."""
    try:
        service = IngredientService()
        data = payload.model_dump(exclude_none=True)
        if not data:
            _fail("No fields provided for update", 400)
        # Convert date to ISO string for JSON serialisation
        if "expiry_date" in data and data["expiry_date"] is not None:
            data["expiry_date"] = data["expiry_date"].isoformat()
        updated = await service.update(id, data)
        if not updated:
            _fail("Ingredient not found", 404)
        return _ok(data=updated, message="Ingredient updated")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PUT ingredient {id} failed: {e}")
        _fail("Failed to update ingredient", 500)


# --------------------------------------------------------------------------- #
#  4. DELETE /api/ingredients/{id}
# --------------------------------------------------------------------------- #
@router.delete("/{id}", response_model=Dict[str, Any])
async def delete_ingredient(id: str):
    """Delete an ingredient by *id*."""
    try:
        service = IngredientService()
        deleted = await service.delete(id)
        if not deleted:
            _fail("Ingredient not found", 404)
        return _ok(message="Ingredient deleted")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DELETE ingredient {id} failed: {e}")
        _fail("Failed to delete ingredient", 500)


# --------------------------------------------------------------------------- #
#  5. GET /api/ingredients/{business_id}/alerts
# --------------------------------------------------------------------------- #
@router.get("/{business_id}/alerts", response_model=Dict[str, Any])
async def get_ingredient_alerts(business_id: str):
    """
    Return ingredients that are:
      • below their min_threshold  (low stock)
      • expiring within the next 7 days
    """
    try:
        service = IngredientService()
        alerts = await service.get_alerts(business_id)
        total = len(alerts["low_stock"]) + len(alerts["expiring_soon"])
        return _ok(data=alerts, message=f"{total} alert(s) found")
    except Exception as e:
        logger.error(f"GET alerts failed: {e}")
        _fail("Failed to fetch alerts", 500)
