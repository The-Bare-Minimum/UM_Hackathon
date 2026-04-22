import logging
from fastapi import APIRouter, HTTPException
from services.ai import AIService
from services.zai_service import ZAIService
from services.ingredients import IngredientService
from services.expenses import ExpenseService, BudgetService
from services.rules_engine import RulesEngine
from services.skills_gate import SkillsGate
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

rules_engine = None
skills_gate = None


def _get_rules_engine():
    global rules_engine
    if rules_engine is None:
        rules_engine = RulesEngine()
    return rules_engine


def _get_skills_gate():
    global skills_gate
    if skills_gate is None:
        skills_gate = SkillsGate()
    return skills_gate


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


def _disabled(skill_name: str) -> Dict[str, Any]:
    return {
        "success": True,
        "message": f"Skill '{skill_name}' is disabled. Enable it in AI Skills settings.",
        "data": {"disabled": True, "skill_name": skill_name},
    }


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

        # Get rules context for prompt injection
        re = _get_rules_engine()
        rules_ctx = await re.get_rules_context(business_id, "inventory")
        combined_rules = (body.rules or "") + ("\n" + rules_ctx if rules_ctx else "")

        # 2. Call Z.AI
        zai = ZAIService()
        result = await zai.analyze_ingredients(
            business_id=business_id,
            ingredients_data=ingredients_data,
            rules=combined_rules,
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

        # Get rules context for prompt injection
        re = _get_rules_engine()
        rules_ctx = await re.get_rules_context(business_id, "finance")
        combined_rules = (body.rules or "") + ("\n" + rules_ctx if rules_ctx else "")

        # 3. Call Z.AI
        zai = ZAIService()
        result = await zai.analyze_budget(
            business_id=business_id,
            budget_data=budget_data,
            expenses_data=expenses_data,
            rules=combined_rules,
        )

        result["analyzed_at"] = datetime.utcnow().isoformat()
        return _ok(data=result, message="Budget analysis complete")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Budget analysis failed: {e}")
        _fail("Failed to analyse budget", 500)


# --------------------------------------------------------------------------- #
#  Daily Briefing with skill gate + rules
# --------------------------------------------------------------------------- #
@router.post("/daily-briefing/{business_id}")
async def generate_daily_briefing(business_id: str):
    # Skill gate check
    sg = _get_skills_gate()
    if not await sg.is_skill_enabled(business_id, "Daily Briefing"):
        return _disabled("Daily Briefing")

    # Get rules context
    re = _get_rules_engine()
    rules_ctx = await re.get_rules_context(business_id, "inventory")
    finance_ctx = await re.get_rules_context(business_id, "finance")
    all_rules = "\n".join(filter(None, [rules_ctx, finance_ctx]))

    # Gather data
    try:
        ingredient_svc = IngredientService()
        ingredients = await ingredient_svc.get_all(business_id)
        alerts = await ingredient_svc.get_alerts(business_id)
    except Exception:
        ingredients, alerts = [], {}

    try:
        expense_svc = ExpenseService()
        expenses = await expense_svc.get_all(business_id)
        expenses = expenses[:20] if expenses else []
    except Exception:
        expenses = []

    import json
    context_block = (
        f"Ingredients: {len(ingredients)} items, "
        f"{len(alerts.get('low_stock', []))} low stock, "
        f"{len(alerts.get('expiring_soon', []))} expiring soon.\n"
        f"Recent expenses: {len(expenses)} entries.\n"
    )

    system_prompt = (
        "You are an AI Business Manager for an F&B SME in Malaysia. "
        "Generate a concise daily briefing with exactly these sections:\n"
        "## Summary\n## Key Risks\n## Today's Recommendations\n\n"
        "Be specific with numbers and actionable items. Keep under 300 words."
    )
    if all_rules:
        system_prompt = all_rules + "\n\n" + system_prompt

    user_prompt = (
        f"Today's date: {datetime.now().strftime('%A, %d %B %Y')}\n\n"
        f"Business data:\n{context_block}\n"
        f"Low stock items: {json.dumps(alerts.get('low_stock', []), default=str)}\n"
        f"Expiring items: {json.dumps(alerts.get('expiring_soon', []), default=str)}\n\n"
        "Generate the daily briefing."
    )

    zai = ZAIService()
    result = await zai.call_zai(
        prompt=user_prompt,
        system_prompt=system_prompt,
        business_id=business_id,
        call_type="daily_briefing",
    )

    # Update last_used
    await sg.update_last_used(business_id, "Daily Briefing")

    # Cache to ai_outputs table
    try:
        from config.supabase import get_supabase
        sb = get_supabase()
        sb.table("ai_outputs").insert({
            "business_id": business_id,
            "output_type": "daily_briefing",
            "output_json": json.dumps(result),
            "generated_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to cache briefing: {e}")

    result["generated_at"] = datetime.utcnow().isoformat()
    return _ok(data=result, message="Daily briefing generated")


@router.get("/daily-briefing/{business_id}/latest")
async def get_latest_briefing(business_id: str):
    try:
        from config.supabase import get_supabase
        sb = get_supabase()
        res = (
            sb.table("ai_outputs")
            .select("*")
            .eq("business_id", business_id)
            .eq("output_type", "daily_briefing")
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
        )
        return _ok(data=res.data[0] if res.data else None)
    except Exception:
        return _ok(data=None)


# --------------------------------------------------------------------------- #
#  Waste Prediction with skill gate + rules
# --------------------------------------------------------------------------- #
@router.post("/waste-prediction/{business_id}")
async def generate_waste_prediction(business_id: str):
    sg = _get_skills_gate()
    if not await sg.is_skill_enabled(business_id, "Waste Prediction"):
        return _disabled("Waste Prediction")

    re = _get_rules_engine()
    rules_ctx = await re.get_rules_context(business_id, "inventory")

    ingredient_svc = IngredientService()
    ingredients = await ingredient_svc.get_all(business_id)

    if not ingredients:
        return _ok(data={"all_items": [], "parsed_suggestions": []}, message="No ingredients")

    import json
    from datetime import date as d

    today = d.today()
    items_with_expiry = []
    for ing in ingredients:
        expiry = ing.get("expiry_date")
        days_left = None
        urgency = "no_expiry"
        if expiry:
            try:
                exp_date = d.fromisoformat(str(expiry)[:10])
                days_left = (exp_date - today).days
                if days_left <= 2:
                    urgency = "critical"
                elif days_left <= 5:
                    urgency = "warning"
                else:
                    urgency = "safe"
            except ValueError:
                pass
        items_with_expiry.append({
            "name": ing.get("name", "Unknown"),
            "quantity": ing.get("quantity", 0),
            "unit": ing.get("unit", "pcs"),
            "expiry_date": expiry,
            "days_until_expiry": days_left,
            "urgency": urgency,
        })

    at_risk = [i for i in items_with_expiry if i["urgency"] in ("critical", "warning")]

    system_prompt = (
        "You are a waste prevention AI for an F&B restaurant. "
        "For each at-risk ingredient, suggest a specific action. "
        "Respond as JSON array only, no markdown. Each item: "
        '{"item_name": "X", "urgency": "critical|warning", '
        '"suggestion": "specific action", "action_type": "use_now|promote|prep|dispose"}'
    )
    if rules_ctx:
        system_prompt = rules_ctx + "\n\n" + system_prompt

    user_prompt = f"At-risk ingredients:\n{json.dumps(at_risk, indent=2)}"

    zai = ZAIService()
    result = await zai.call_zai(
        prompt=user_prompt,
        system_prompt=system_prompt,
        business_id=business_id,
        call_type="waste_prediction",
    )

    await sg.update_last_used(business_id, "Waste Prediction")

    suggestions = []
    if result.get("success"):
        try:
            raw = result["response"].strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()
            suggestions = json.loads(raw)
        except (json.JSONDecodeError, IndexError):
            pass

    output = {
        **result,
        "all_items": items_with_expiry,
        "parsed_suggestions": suggestions,
        "critical_count": len([i for i in items_with_expiry if i["urgency"] == "critical"]),
        "warning_count": len([i for i in items_with_expiry if i["urgency"] == "warning"]),
        "generated_at": datetime.utcnow().isoformat(),
    }

    # Cache
    try:
        from config.supabase import get_supabase
        sb = get_supabase()
        sb.table("ai_outputs").insert({
            "business_id": business_id,
            "output_type": "waste_prediction",
            "output_json": json.dumps(output, default=str),
            "generated_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to cache waste prediction: {e}")

    return _ok(data=output, message="Waste prediction generated")


@router.get("/waste-prediction/{business_id}/latest")
async def get_latest_waste(business_id: str):
    try:
        from config.supabase import get_supabase
        sb = get_supabase()
        res = (
            sb.table("ai_outputs")
            .select("*")
            .eq("business_id", business_id)
            .eq("output_type", "waste_prediction")
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
        )
        return _ok(data=res.data[0] if res.data else None)
    except Exception:
        return _ok(data=None)


@router.post("/waste-prediction/{business_id}/action")
async def waste_action(business_id: str, body: Dict[str, Any]):
    return _ok(message=f"Action recorded for {body.get('item_name', 'item')}")


# --------------------------------------------------------------------------- #
#  Menu Advisor with skill gate + rules
# --------------------------------------------------------------------------- #
@router.post("/menu-advisor/{business_id}")
async def generate_menu_advice(business_id: str):
    sg = _get_skills_gate()
    if not await sg.is_skill_enabled(business_id, "Menu Advisor"):
        return _disabled("Menu Advisor")

    re = _get_rules_engine()
    rules_ctx = await re.get_rules_context(business_id, "menu")

    import json
    from datetime import date as d

    ingredient_svc = IngredientService()
    ingredients = await ingredient_svc.get_all(business_id)

    today = d.today()
    month_name = today.strftime("%B %Y")
    season = "monsoon season" if today.month in (10, 11, 12, 1, 2) else "dry/hot season"

    system_prompt = (
        "You are a menu optimization AI for a Malaysian F&B restaurant. "
        "Based on ingredient availability, seasonal context, and business rules, "
        "recommend menu changes. Respond as JSON only:\n"
        '{"push": [{"item": "X", "reason": "Y"}], '
        '"retire": [{"item": "X", "reason": "Y"}], '
        '"new_dish": {"name": "X", "ingredients": ["a","b"], "reason": "Y"}}'
    )
    if rules_ctx:
        system_prompt = rules_ctx + "\n\n" + system_prompt

    user_prompt = (
        f"Month: {month_name} ({season})\n"
        f"Available ingredients: {json.dumps([i.get('name') for i in ingredients])}\n"
        "Recommend menu changes."
    )

    zai = ZAIService()
    result = await zai.call_zai(
        prompt=user_prompt,
        system_prompt=system_prompt,
        business_id=business_id,
        call_type="menu_advisor",
    )

    await sg.update_last_used(business_id, "Menu Advisor")

    parsed_advice = None
    if result.get("success"):
        try:
            raw = result["response"].strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()
            parsed_advice = json.loads(raw)
        except (json.JSONDecodeError, IndexError):
            pass

    output = {
        **result,
        "parsed_advice": parsed_advice,
        "month": month_name,
        "season_context": f"Malaysia — {season}",
        "generated_at": datetime.utcnow().isoformat(),
    }

    # Cache
    try:
        from config.supabase import get_supabase
        sb = get_supabase()
        sb.table("ai_outputs").insert({
            "business_id": business_id,
            "output_type": "menu_advisor",
            "output_json": json.dumps(output, default=str),
            "generated_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to cache menu advice: {e}")

    return _ok(data=output, message="Menu advice generated")


@router.get("/menu-advisor/{business_id}/latest")
async def get_latest_menu_advice(business_id: str):
    try:
        from config.supabase import get_supabase
        sb = get_supabase()
        res = (
            sb.table("ai_outputs")
            .select("*")
            .eq("business_id", business_id)
            .eq("output_type", "menu_advisor")
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
        )
        return _ok(data=res.data[0] if res.data else None)
    except Exception:
        return _ok(data=None)


# --------------------------------------------------------------------------- #
#  Dashboard health score
# --------------------------------------------------------------------------- #
@router.get("/health-score/{business_id}")
async def get_health_score(business_id: str):
    """Compute business health score 0-100."""
    score = 0
    breakdown: Dict[str, Any] = {}

    # Inventory health (25 pts)
    try:
        ing_svc = IngredientService()
        alerts = await ing_svc.get_alerts(business_id)
        critical = len(alerts.get("low_stock", []))
        expiring = len(alerts.get("expiring_soon", []))
        if critical == 0 and expiring == 0:
            inv_score = 25
        elif critical == 0:
            inv_score = 18
        elif critical <= 2:
            inv_score = 10
        else:
            inv_score = 5
        score += inv_score
        breakdown["inventory"] = {"score": inv_score, "issues": critical + expiring}
    except Exception:
        score += 15
        breakdown["inventory"] = {"score": 15, "issues": -1}

    # Financial health (25 pts)
    try:
        budget_score = 20  # Default moderate
        score += budget_score
        breakdown["finance"] = {"score": budget_score, "issues": 0}
    except Exception:
        score += 15
        breakdown["finance"] = {"score": 15, "issues": -1}

    # Staff coverage (25 pts)
    staff_score = 20  # Default moderate
    score += staff_score
    breakdown["staff"] = {"score": staff_score, "issues": 0}

    # Asset status (25 pts)
    try:
        from services.assets import AssetService
        asset_svc = AssetService()
        assets = await asset_svc.get_all(business_id)
        overdue = len([a for a in assets if a.get("computed_status") == "overdue"])
        due_soon = len([a for a in assets if a.get("computed_status") == "due_soon"])
        if overdue == 0 and due_soon == 0:
            asset_score = 25
        elif overdue == 0:
            asset_score = 18
        else:
            asset_score = 8
        score += asset_score
        breakdown["assets"] = {"score": asset_score, "overdue": overdue, "due_soon": due_soon}
    except Exception:
        score += 15
        breakdown["assets"] = {"score": 15, "issues": -1}

    # Generate AI tip
    tip = ""
    lowest = min(breakdown.items(), key=lambda x: x[1]["score"])
    area = lowest[0]
    if area == "inventory":
        tip = "Inventory has items needing attention — check low stock and expiring items."
    elif area == "finance":
        tip = "Review your budget categories to optimize spending."
    elif area == "staff":
        tip = "Ensure all shifts are covered for the week."
    elif area == "assets":
        tip = "You have overdue maintenance or renewals — address them to avoid disruptions."

    return _ok(data={
        "score": min(score, 100),
        "breakdown": breakdown,
        "tip": tip,
    })


# --------------------------------------------------------------------------- #
#  Triggered rules count
# --------------------------------------------------------------------------- #
@router.get("/triggered-rules/{business_id}")
async def get_triggered_rules_today(business_id: str):
    re = _get_rules_engine()
    rules = await re.get_all(business_id)
    triggered = [r for r in rules if (r.get("triggered_count") or 0) > 0]
    return _ok(data={
        "total_triggered": len(triggered),
        "rules": triggered[:5],
    })
