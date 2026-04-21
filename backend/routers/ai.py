import logging
from fastapi import APIRouter, HTTPException
from services.ai import AIService
from services.zai_service import ZAIService
from services.ingredients import IngredientService
from services.expenses import ExpenseService, BudgetService
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #
def _ok(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    return {"success": True, "message": message, "data": data}


def _fail(message: str = "Error", status: int = 400) -> None:
    raise HTTPException(
        status_code=status,
        detail={"success": False, "message": message, "data": None},
    )


# --------------------------------------------------------------------------- #
#  Request schemas
# --------------------------------------------------------------------------- #
class AIAnalysisRequest(BaseModel):
    rules: Optional[str] = ""


# --------------------------------------------------------------------------- #
#  Existing endpoints
# --------------------------------------------------------------------------- #
@router.get("/", response_model=List[Dict[str, Any]])
async def get_ai_history(business_id: str = "default"):
    service = AIService()
    return await service.get_all(business_id)


@router.post("/generate")
async def generate_briefing(business_id: str, context: Dict[str, Any]):
    service = AIService()
    return await service.generate_briefing(business_id, context)


# --------------------------------------------------------------------------- #
#  POST /api/ai/analyze-ingredients/{business_id}
# --------------------------------------------------------------------------- #
@router.post("/analyze-ingredients/{business_id}", response_model=Dict[str, Any])
async def analyze_ingredients(business_id: str, body: AIAnalysisRequest = AIAnalysisRequest()):
    """
    Fetch all ingredients for the business, then run Z.AI analysis.
    """
    try:
        # 1. Gather ingredient data
        ingredient_service = IngredientService()
        ingredients = await ingredient_service.get_all(business_id)
        alerts = await ingredient_service.get_alerts(business_id)

        if not ingredients:
            return _ok(
                data={
                    "response": "No ingredients found. Add ingredients to your inventory first.",
                    "tokens_used": 0,
                    "latency_ms": 0,
                    "analyzed_at": datetime.utcnow().isoformat(),
                },
                message="No data to analyse",
            )

        # Combine ingredients with alert context
        ingredients_data = {
            "ingredients": ingredients,
            "low_stock_count": len(alerts.get("low_stock", [])),
            "expiring_soon_count": len(alerts.get("expiring_soon", [])),
        }

        # 2. Call Z.AI
        zai = ZAIService()
        result = await zai.analyze_ingredients(
            business_id=business_id,
            ingredients_data=ingredients_data,
            rules=body.rules or "",
        )

        result["analyzed_at"] = datetime.utcnow().isoformat()
        return _ok(data=result, message="Ingredient analysis complete")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ingredient analysis failed: {e}")
        _fail("Failed to analyse ingredients", 500)


# --------------------------------------------------------------------------- #
#  POST /api/ai/analyze-budget/{business_id}
# --------------------------------------------------------------------------- #
@router.post("/analyze-budget/{business_id}", response_model=Dict[str, Any])
async def analyze_budget(business_id: str, body: AIAnalysisRequest = AIAnalysisRequest()):
    """
    Fetch budget + expense data for the current month, then run Z.AI analysis.
    """
    try:
        now = datetime.now()

        # 1. Gather budget data
        budget_service = BudgetService()
        budgets = await budget_service.get_all(business_id, month=now.month, year=now.year)

        # 2. Gather expense data
        expense_service = ExpenseService()
        summary = await expense_service.get_monthly_summary(business_id, now.month, now.year)
        expenses = await expense_service.get_all(business_id)

        # Take only recent expenses (last 30 entries max for token economy)
        recent_expenses = expenses[:30] if expenses else []

        if not budgets and not recent_expenses:
            return _ok(
                data={
                    "response": "No budget or expense data found. Set budgets and add expenses first.",
                    "tokens_used": 0,
                    "latency_ms": 0,
                    "analyzed_at": datetime.utcnow().isoformat(),
                },
                message="No data to analyse",
            )

        budget_data = {
            "budgets": budgets,
            "total_allocated": sum(b.get("allocated_amount", 0) for b in budgets),
            "total_spent": summary.get("total_spent", 0),
            "by_category": summary.get("by_category", {}),
        }

        expenses_data = [
            {
                "name": e.get("name") or e.get("description", ""),
                "amount": e.get("amount", 0),
                "category": e.get("category", ""),
                "date": e.get("transaction_date", ""),
            }
            for e in recent_expenses
        ]

        # 3. Call Z.AI
        zai = ZAIService()
        result = await zai.analyze_budget(
            business_id=business_id,
            budget_data=budget_data,
            expenses_data=expenses_data,
            rules=body.rules or "",
        )

        result["analyzed_at"] = datetime.utcnow().isoformat()
        return _ok(data=result, message="Budget analysis complete")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Budget analysis failed: {e}")
        _fail("Failed to analyse budget", 500)
