import logging
from config.supabase import get_supabase
from typing import List, Dict, Any, Optional
from datetime import datetime, date

logger = logging.getLogger(__name__)


class ExpenseService:
    def __init__(self):
        self.supabase = get_supabase()
        self.table = "expenses"

    async def get_all(self, business_id: str) -> List[Dict[str, Any]]:
        """Fetch all expenses for a business, ordered by date descending."""
        response = (
            self.supabase.table(self.table)
            .select("*")
            .order("transaction_date", desc=True)
            .execute()
        )
        return response.data

    async def get_by_id(self, expense_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single expense by ID."""
        response = (
            self.supabase.table(self.table)
            .select("*")
            .eq("id", expense_id)
            .execute()
        )
        return response.data[0] if response.data else None

    async def create(self, business_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new expense."""
        data["business_id"] = business_id
        response = self.supabase.table(self.table).insert(data).execute()
        return response.data[0] if response.data else {}

    async def update(self, expense_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing expense."""
        response = (
            self.supabase.table(self.table)
            .update(data)
            .eq("id", expense_id)
            .execute()
        )
        return response.data[0] if response.data else {}

    async def delete(self, expense_id: str) -> bool:
        """Delete an expense by ID."""
        response = (
            self.supabase.table(self.table)
            .delete()
            .eq("id", expense_id)
            .execute()
        )
        return True

    async def get_monthly_summary(self, business_id: str, month: int, year: int) -> Dict[str, Any]:
        """Get spending summary for a specific month."""
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"

        response = (
            self.supabase.table(self.table)
            .select("*")
            .gte("transaction_date", start_date)
            .lt("transaction_date", end_date)
            .execute()
        )

        expenses = response.data or []
        total = sum(float(e.get("amount", 0)) for e in expenses)

        # Group by category
        by_category: Dict[str, float] = {}
        for e in expenses:
            cat = e.get("category", "Uncategorized") or "Uncategorized"
            by_category[cat] = by_category.get(cat, 0) + float(e.get("amount", 0))

        # Biggest category
        biggest_category = max(by_category, key=by_category.get) if by_category else None

        return {
            "total_spent": total,
            "by_category": by_category,
            "biggest_category": biggest_category,
            "expense_count": len(expenses),
        }

    async def get_last_months_comparison(self, business_id: str, months: int = 3) -> List[Dict[str, Any]]:
        """Get spending by category for the last N months."""
        now = datetime.now()
        result = []

        for i in range(months):
            m = now.month - i
            y = now.year
            if m <= 0:
                m += 12
                y -= 1

            summary = await self.get_monthly_summary(business_id, m, y)
            result.append({
                "month": m,
                "year": y,
                "label": f"{datetime(y, m, 1).strftime('%b %Y')}",
                "total_spent": summary["total_spent"],
                "by_category": summary["by_category"],
            })

        return list(reversed(result))


class BudgetService:
    def __init__(self):
        self.supabase = get_supabase()
        self.table = "budgets"

    async def get_all(self, business_id: str, month: Optional[int] = None, year: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch all budgets, optionally filtered by month and year."""
        query = self.supabase.table(self.table).select("*")

        if month is not None:
            query = query.eq("month", month)
        if year is not None:
            query = query.eq("year", year)

        response = query.order("category").execute()
        return response.data

    async def upsert(self, business_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update a budget allocation."""
        data["business_id"] = business_id
        data["updated_at"] = datetime.now().isoformat()

        # Check if budget already exists for this category/month/year
        existing = (
            self.supabase.table(self.table)
            .select("*")
            .eq("category", data["category"])
            .eq("month", data["month"])
            .eq("year", data["year"])
            .execute()
        )

        if existing.data:
            # Update existing
            response = (
                self.supabase.table(self.table)
                .update({"allocated_amount": data["allocated_amount"], "updated_at": data["updated_at"]})
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            # Insert new
            response = self.supabase.table(self.table).insert(data).execute()

        return response.data[0] if response.data else {}

    async def delete(self, budget_id: str) -> bool:
        """Delete a budget by ID."""
        self.supabase.table(self.table).delete().eq("id", budget_id).execute()
        return True
