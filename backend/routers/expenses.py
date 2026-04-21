import logging
from fastapi import APIRouter, HTTPException, Query
from services.expenses import ExpenseService, BudgetService
from schemas.expense import ExpenseCreate, ExpenseUpdate, BudgetCreate, BudgetUpdate
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expenses", tags=["Expenses"])


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
#  GET /api/expenses/summary  –  monthly summary  (BEFORE parameterised routes)
# --------------------------------------------------------------------------- #
@router.get("/summary", response_model=Dict[str, Any])
async def get_monthly_summary(
    business_id: str = "default",
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    try:
        now = datetime.now()
        m = month or now.month
        y = year or now.year
        service = ExpenseService()
        summary = await service.get_monthly_summary(business_id, m, y)
        return _ok(data=summary, message="Monthly summary retrieved")
    except Exception as e:
        logger.error(f"GET summary failed: {e}")
        _fail("Failed to fetch summary", 500)


# --------------------------------------------------------------------------- #
#  GET /api/expenses/comparison  –  last N months comparison
# --------------------------------------------------------------------------- #
@router.get("/comparison", response_model=Dict[str, Any])
async def get_comparison(business_id: str = "default", months: int = 3):
    try:
        service = ExpenseService()
        data = await service.get_last_months_comparison(business_id, months)
        return _ok(data=data, message=f"Last {months} months comparison")
    except Exception as e:
        logger.error(f"GET comparison failed: {e}")
        _fail("Failed to fetch comparison", 500)


# --------------------------------------------------------------------------- #
#  GET /api/expenses/budgets  –  list budgets
# --------------------------------------------------------------------------- #
@router.get("/budgets", response_model=Dict[str, Any])
async def get_budgets(
    business_id: str = "default",
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    try:
        service = BudgetService()
        items = await service.get_all(business_id, month, year)
        return _ok(data=items, message=f"Found {len(items)} budget(s)")
    except Exception as e:
        logger.error(f"GET budgets failed: {e}")
        _fail("Failed to fetch budgets", 500)


# --------------------------------------------------------------------------- #
#  POST /api/expenses/budgets  –  create/upsert budget
# --------------------------------------------------------------------------- #
@router.post("/budgets", response_model=Dict[str, Any], status_code=201)
async def upsert_budget(payload: BudgetCreate, business_id: str = "default"):
    try:
        service = BudgetService()
        data = payload.model_dump(exclude_none=True)
        result = await service.upsert(business_id, data)
        if not result:
            _fail("Budget could not be set", 400)
        return _ok(data=result, message="Budget set successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"POST budget failed: {e}")
        _fail("Failed to set budget", 500)


# --------------------------------------------------------------------------- #
#  DELETE /api/expenses/budgets/{id}  –  delete budget
# --------------------------------------------------------------------------- #
@router.delete("/budgets/{budget_id}", response_model=Dict[str, Any])
async def delete_budget(budget_id: str):
    try:
        service = BudgetService()
        await service.delete(budget_id)
        return _ok(message="Budget deleted")
    except Exception as e:
        logger.error(f"DELETE budget {budget_id} failed: {e}")
        _fail("Failed to delete budget", 500)


# --------------------------------------------------------------------------- #
#  GET /api/expenses/  –  list all expenses
# --------------------------------------------------------------------------- #
@router.get("/", response_model=Dict[str, Any])
async def get_expenses(business_id: str = "default"):
    try:
        service = ExpenseService()
        items = await service.get_all(business_id)
        return _ok(data=items, message=f"Found {len(items)} expense(s)")
    except Exception as e:
        logger.error(f"GET expenses failed: {e}")
        _fail("Failed to fetch expenses", 500)


# --------------------------------------------------------------------------- #
#  POST /api/expenses/  –  create expense
# --------------------------------------------------------------------------- #
@router.post("/", response_model=Dict[str, Any], status_code=201)
async def create_expense(payload: ExpenseCreate, business_id: str = "default"):
    try:
        service = ExpenseService()
        data = payload.model_dump(exclude_none=True)
        # Convert date to ISO string
        if "transaction_date" in data and data["transaction_date"] is not None:
            data["transaction_date"] = data["transaction_date"].isoformat()
        created = await service.create(business_id, data)
        if not created:
            _fail("Expense could not be created", 400)
        return _ok(data=created, message="Expense created")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"POST expense failed: {e}")
        _fail("Failed to create expense", 500)


# --------------------------------------------------------------------------- #
#  PUT /api/expenses/{id}  –  update expense
# --------------------------------------------------------------------------- #
@router.put("/{expense_id}", response_model=Dict[str, Any])
async def update_expense(expense_id: str, payload: ExpenseUpdate):
    try:
        service = ExpenseService()
        data = payload.model_dump(exclude_none=True)
        if not data:
            _fail("No fields provided for update", 400)
        if "transaction_date" in data and data["transaction_date"] is not None:
            data["transaction_date"] = data["transaction_date"].isoformat()
        updated = await service.update(expense_id, data)
        if not updated:
            _fail("Expense not found", 404)
        return _ok(data=updated, message="Expense updated")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PUT expense {expense_id} failed: {e}")
        _fail("Failed to update expense", 500)


# --------------------------------------------------------------------------- #
#  DELETE /api/expenses/{id}  –  delete expense
# --------------------------------------------------------------------------- #
@router.delete("/{expense_id}", response_model=Dict[str, Any])
async def delete_expense(expense_id: str):
    try:
        service = ExpenseService()
        await service.delete(expense_id)
        return _ok(message="Expense deleted")
    except Exception as e:
        logger.error(f"DELETE expense {expense_id} failed: {e}")
        _fail("Failed to delete expense", 500)
