"""
Asset Tracker Service
─────────────────────
Unified machine + subscription management with:
 1. CRUD operations
 2. Automatic status computation (active / due_soon / overdue)
 3. Monthly cost aggregation
 4. Z.AI asset analysis
"""

import json
import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any
from config.supabase import get_supabase
from services.zai_service import ZAIService

logger = logging.getLogger(__name__)

TABLE = "assets"

DEFAULT_ASSETS = [
    {
        "name": "Espresso Machine",
        "asset_type": "machine",
        "purchase_date": "2025-06-15",
        "last_maintenance": "2026-01-20",
        "next_maintenance": "2026-07-20",
        "cost_per_renewal": 350,
        "status": "active",
        "notes": "Service every 6 months",
    },
    {
        "name": "POS System License",
        "asset_type": "license",
        "renewal_date": "2026-05-15",
        "cost_per_renewal": 89,
        "status": "active",
        "notes": "Monthly renewal",
    },
    {
        "name": "Kitchen Hood",
        "asset_type": "machine",
        "purchase_date": "2024-03-10",
        "last_maintenance": "2025-06-10",
        "next_maintenance": "2026-06-10",
        "cost_per_renewal": 500,
        "status": "active",
        "notes": "Service every 12 months",
    },
    {
        "name": "Accounting Software",
        "asset_type": "subscription",
        "renewal_date": "2026-05-06",
        "cost_per_renewal": 599,
        "status": "due_soon",
        "notes": "Annual renewal RM 599",
    },
    {
        "name": "Delivery App Subscription",
        "asset_type": "subscription",
        "renewal_date": "2026-05-01",
        "cost_per_renewal": 200,
        "status": "active",
        "notes": "Monthly RM 200",
    },
]


class AssetService:
    def __init__(self):
        self.supabase = get_supabase()

    async def ensure_defaults(self, business_id: str) -> None:
        """Seed sample assets if none exist."""
        existing = self.supabase.table(TABLE).select("id").eq("business_id", business_id).limit(1).execute()
        if existing.data:
            return
        rows = [{**a, "business_id": business_id} for a in DEFAULT_ASSETS]
        try:
            self.supabase.table(TABLE).insert(rows).execute()
        except Exception as e:
            logger.error(f"Failed to seed assets: {e}")

    def _compute_status(self, asset: Dict[str, Any]) -> str:
        """Compute status based on dates."""
        today = date.today()
        due_date = None

        if asset.get("next_maintenance"):
            try:
                due_date = date.fromisoformat(str(asset["next_maintenance"]))
            except (ValueError, TypeError):
                pass

        if asset.get("renewal_date"):
            try:
                rd = date.fromisoformat(str(asset["renewal_date"]))
                if due_date is None or rd < due_date:
                    due_date = rd
            except (ValueError, TypeError):
                pass

        if due_date is None:
            return asset.get("status", "active")

        days_until = (due_date - today).days
        if days_until < 0:
            return "overdue"
        elif days_until <= 30:
            return "due_soon"
        return "active"

    async def get_all(self, business_id: str) -> List[Dict[str, Any]]:
        await self.ensure_defaults(business_id)
        res = self.supabase.table(TABLE).select("*").eq("business_id", business_id).order("created_at").execute()
        assets = res.data or []
        # Re-compute status dynamically
        for a in assets:
            a["computed_status"] = self._compute_status(a)
        return assets

    async def create(self, business_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["business_id"] = business_id
        res = self.supabase.table(TABLE).insert(data).execute()
        return res.data[0] if res.data else {}

    async def update(self, asset_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.supabase.table(TABLE).update(data).eq("id", asset_id).execute()
        return res.data[0] if res.data else {}

    async def delete(self, asset_id: str) -> bool:
        self.supabase.table(TABLE).delete().eq("id", asset_id).execute()
        return True

    async def mark_serviced(self, asset_id: str) -> Dict[str, Any]:
        """Mark an asset as serviced/renewed. Sets last_maintenance to today."""
        today = date.today().isoformat()
        # Get current asset to determine next date
        res = self.supabase.table(TABLE).select("*").eq("id", asset_id).execute()
        if not res.data:
            return {}

        asset = res.data[0]
        update_data: Dict[str, Any] = {"last_maintenance": today, "status": "active"}

        # Calculate next maintenance based on notes/pattern
        notes = (asset.get("notes") or "").lower()
        if "every 6 months" in notes:
            next_date = date.today() + timedelta(days=180)
            update_data["next_maintenance"] = next_date.isoformat()
        elif "every 12 months" in notes or "annual" in notes:
            next_date = date.today() + timedelta(days=365)
            update_data["next_maintenance"] = next_date.isoformat()
        elif "monthly" in notes:
            next_date = date.today() + timedelta(days=30)
            update_data["renewal_date"] = next_date.isoformat()

        result = self.supabase.table(TABLE).update(update_data).eq("id", asset_id).execute()
        return result.data[0] if result.data else {}

    async def get_monthly_cost(self, business_id: str) -> float:
        """Calculate total monthly subscription/renewal cost."""
        assets = await self.get_all(business_id)
        total = 0.0
        for a in assets:
            cost = float(a.get("cost_per_renewal", 0) or 0)
            notes = (a.get("notes") or "").lower()
            if "annual" in notes:
                total += cost / 12
            elif "monthly" in notes or a.get("asset_type") in ("subscription", "license"):
                total += cost
            else:
                # Assume service cost is periodic, estimate monthly
                total += cost / 6  # default to bi-annual
        return round(total, 2)

    async def analyze_with_zai(self, business_id: str) -> Dict[str, Any]:
        """Send asset data to Z.AI for analysis."""
        assets = await self.get_all(business_id)
        monthly_cost = await self.get_monthly_cost(business_id)

        asset_summary = json.dumps(
            [
                {
                    "name": a["name"],
                    "type": a["asset_type"],
                    "status": a.get("computed_status", a.get("status")),
                    "next_due": a.get("next_maintenance") or a.get("renewal_date"),
                    "cost": float(a.get("cost_per_renewal", 0) or 0),
                    "last_serviced": a.get("last_maintenance"),
                    "notes": a.get("notes"),
                }
                for a in assets
            ],
            indent=2,
        )

        system_prompt = (
            "You are an operations manager AI. Identify risks and optimization "
            "opportunities in asset maintenance and subscriptions."
        )

        user_prompt = (
            f"Here are our current assets and their status:\n{asset_summary}\n\n"
            f"Current monthly subscription spend: RM {monthly_cost}\n\n"
            "Provide:\n"
            "1. Immediate actions needed (overdue/critical items)\n"
            "2. Upcoming items to schedule in next 30 days\n"
            "3. Cost optimization suggestions\n"
            "4. Predictive maintenance tip for the most critical machine\n\n"
            "Respond as structured JSON with sections: "
            "immediate_actions, upcoming_schedule, cost_tips, maintenance_tip"
        )

        zai = ZAIService()
        result = await zai.call_zai(
            prompt=user_prompt,
            system_prompt=system_prompt,
            business_id=business_id,
            call_type="asset_analysis",
        )

        if result.get("success"):
            # Try to parse JSON from response
            raw = result["response"]
            try:
                clean = raw.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                    if clean.endswith("```"):
                        clean = clean[:-3]
                    clean = clean.strip()
                if clean.startswith("json"):
                    clean = clean[4:].strip()
                parsed = json.loads(clean)
                result["parsed_analysis"] = parsed
            except (json.JSONDecodeError, IndexError):
                result["parsed_analysis"] = None

        result["monthly_cost"] = monthly_cost
        result["asset_count"] = len(assets)
        return result
