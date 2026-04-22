"""
AI Skills Gate
──────────────
Provides:
 1. isSkillEnabled(skill_name) — gate check before any Z.AI call
 2. getEnabledSkills() — list of active skills
 3. toggleSkill / updateLastUsed
 4. Seed default skills
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from config.supabase import get_supabase

logger = logging.getLogger(__name__)

TABLE = "ai_skills"

DEFAULT_SKILLS = [
    {"skill_name": "Daily Briefing",       "description": "Morning AI business summary",              "category": "insights",  "is_enabled": True},
    {"skill_name": "Waste Prediction",     "description": "Expiry-based ingredient alerts",            "category": "inventory", "is_enabled": True},
    {"skill_name": "Menu Advisor",         "description": "Seasonal menu recommendations",             "category": "menu",      "is_enabled": True},
    {"skill_name": "Anomaly Detection",    "description": "Flags unusual spending patterns",           "category": "finance",   "is_enabled": True},
    {"skill_name": "Staff Optimizer",      "description": "Shift efficiency recommendations",          "category": "staff",     "is_enabled": False},
    {"skill_name": "Demand Forecasting",   "description": "Predicts busy periods",                     "category": "advanced",  "is_enabled": False},
    {"skill_name": "Competitor Awareness", "description": "Suggests market positioning tips",           "category": "advanced",  "is_enabled": False},
]


class SkillsGate:
    def __init__(self):
        self.supabase = get_supabase()

    async def ensure_defaults(self, business_id: str) -> None:
        """Seed default skills if none exist for this business."""
        existing = self.supabase.table(TABLE).select("id").eq("business_id", business_id).execute()
        if existing.data:
            return
        rows = [{**s, "business_id": business_id} for s in DEFAULT_SKILLS]
        try:
            self.supabase.table(TABLE).insert(rows).execute()
        except Exception as e:
            logger.error(f"Failed to seed skills: {e}")

    async def get_all(self, business_id: str) -> List[Dict[str, Any]]:
        await self.ensure_defaults(business_id)
        res = self.supabase.table(TABLE).select("*").eq("business_id", business_id).order("created_at").execute()
        return res.data or []

    async def is_skill_enabled(self, business_id: str, skill_name: str) -> bool:
        await self.ensure_defaults(business_id)
        res = (
            self.supabase.table(TABLE)
            .select("is_enabled")
            .eq("business_id", business_id)
            .eq("skill_name", skill_name)
            .execute()
        )
        if res.data:
            return bool(res.data[0].get("is_enabled", False))
        return True  # Default to enabled if not found

    async def get_enabled_skills(self, business_id: str) -> List[str]:
        await self.ensure_defaults(business_id)
        res = (
            self.supabase.table(TABLE)
            .select("skill_name")
            .eq("business_id", business_id)
            .eq("is_enabled", True)
            .execute()
        )
        return [r["skill_name"] for r in (res.data or [])]

    async def toggle_skill(
        self, business_id: str, skill_name: str, enabled: bool
    ) -> Dict[str, Any]:
        res = (
            self.supabase.table(TABLE)
            .update({"is_enabled": enabled})
            .eq("business_id", business_id)
            .eq("skill_name", skill_name)
            .execute()
        )
        return res.data[0] if res.data else {}

    async def update_last_used(self, business_id: str, skill_name: str) -> None:
        try:
            self.supabase.table(TABLE).update(
                {"last_used": datetime.now(timezone.utc).isoformat()}
            ).eq("business_id", business_id).eq("skill_name", skill_name).execute()
        except Exception as e:
            logger.error(f"Failed to update last_used: {e}")
