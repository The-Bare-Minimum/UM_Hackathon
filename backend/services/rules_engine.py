"""
Business Rules Engine
─────────────────────
Provides:
 1. CRUD operations for business rules
 2. getRulesContext(module) — formatted string for AI prompt injection
 3. evaluateRules / logRuleTrigger
 4. Z.AI rule parsing from plain English
"""

import json
import logging
from typing import List, Dict, Any, Optional
from config.supabase import get_supabase
from services.zai_service import ZAIService

logger = logging.getLogger(__name__)

TABLE = "business_rules"


class RulesEngine:
    def __init__(self):
        self.supabase = get_supabase()

    # ------------------------------------------------------------------ #
    #  CRUD
    # ------------------------------------------------------------------ #
    async def get_all(self, business_id: str) -> List[Dict[str, Any]]:
        res = self.supabase.table(TABLE).select("*").eq("business_id", business_id).order("created_at", desc=True).execute()
        return res.data or []

    async def create(self, business_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["business_id"] = business_id
        res = self.supabase.table(TABLE).insert(data).execute()
        return res.data[0] if res.data else {}

    async def update(self, rule_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.supabase.table(TABLE).update(data).eq("id", rule_id).execute()
        return res.data[0] if res.data else {}

    async def delete(self, rule_id: str) -> bool:
        self.supabase.table(TABLE).delete().eq("id", rule_id).execute()
        return True

    async def toggle(self, rule_id: str, is_active: bool) -> Dict[str, Any]:
        res = self.supabase.table(TABLE).update({"is_active": is_active}).eq("id", rule_id).execute()
        return res.data[0] if res.data else {}

    # ------------------------------------------------------------------ #
    #  Rules Context for AI Prompt Injection
    # ------------------------------------------------------------------ #
    async def get_rules_context(self, business_id: str, module: str) -> str:
        """
        Fetch all active rules applicable to a given module and format
        them as a prompt-injection block for Z.AI system messages.
        """
        try:
            res = (
                self.supabase.table(TABLE)
                .select("*")
                .eq("business_id", business_id)
                .eq("is_active", True)
                .execute()
            )
            rules = res.data or []

            # Filter rules that apply to this module (or have no specific module)
            relevant = [
                r for r in rules
                if not r.get("applies_to") or module in r.get("applies_to", [])
            ]

            if not relevant:
                return ""

            lines = ["ACTIVE BUSINESS RULES (always follow these):"]
            for r in relevant:
                severity = r.get("severity", "info")
                rtype = r.get("rule_type", "behavior")
                text = r.get("rule_text", "")
                lines.append(f"- [{rtype}] {text} — severity: {severity}")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Failed to get rules context: {e}")
            return ""

    # ------------------------------------------------------------------ #
    #  Rule Evaluation & Trigger Logging
    # ------------------------------------------------------------------ #
    async def evaluate_rules(
        self, data: Dict[str, Any], business_id: str, module: str
    ) -> List[Dict[str, Any]]:
        """Check if any rules should be triggered based on current data."""
        try:
            res = (
                self.supabase.table(TABLE)
                .select("*")
                .eq("business_id", business_id)
                .eq("is_active", True)
                .execute()
            )
            rules = res.data or []
            relevant = [
                r for r in rules
                if not r.get("applies_to") or module in r.get("applies_to", [])
            ]

            triggered: List[Dict[str, Any]] = []
            for rule in relevant:
                if self._check_trigger(rule, data):
                    triggered.append(rule)
                    await self.log_rule_trigger(rule["id"])

            return triggered
        except Exception as e:
            logger.error(f"Rule evaluation failed: {e}")
            return []

    def _check_trigger(self, rule: Dict[str, Any], data: Dict[str, Any]) -> bool:
        """Simple keyword-based trigger check."""
        trigger = (rule.get("trigger_condition") or "").lower()
        if not trigger:
            return False

        # Check for low stock triggers
        if "below" in trigger and "stock" in trigger:
            low_stock = data.get("low_stock_count", 0)
            if low_stock and low_stock > 0:
                return True

        # Check for expense threshold triggers
        if "above" in trigger and ("expense" in trigger or "rm" in trigger):
            high_expenses = data.get("high_expense_items", [])
            if high_expenses:
                return True

        # Check for overdue triggers
        if "overdue" in trigger:
            overdue = data.get("overdue_count", 0)
            if overdue and overdue > 0:
                return True

        return False

    async def log_rule_trigger(self, rule_id: str) -> None:
        """Increment triggered_count for a rule."""
        try:
            res = self.supabase.table(TABLE).select("triggered_count").eq("id", rule_id).execute()
            current = (res.data[0].get("triggered_count", 0) if res.data else 0) or 0
            self.supabase.table(TABLE).update(
                {"triggered_count": current + 1}
            ).eq("id", rule_id).execute()
        except Exception as e:
            logger.error(f"Failed to log rule trigger: {e}")

    # ------------------------------------------------------------------ #
    #  Z.AI Rule Parsing
    # ------------------------------------------------------------------ #
    async def parse_rule_with_zai(
        self, raw_text: str, business_id: str
    ) -> Dict[str, Any]:
        """Use Z.AI GLM to classify and formalize a plain-English rule."""
        zai = ZAIService()

        system_prompt = (
            "You are a business rules parser. Convert the user's plain English rule "
            "into a structured rule object. Respond as JSON only, no markdown fencing."
        )

        user_prompt = (
            f'Parse this business rule: "{raw_text}"\n\n'
            'Respond as JSON only:\n'
            '{\n'
            '  "rule_text": "original text",\n'
            '  "rule_type": "alert | behavior | constraint",\n'
            '  "trigger_condition": "when X happens",\n'
            '  "action": "do Y",\n'
            '  "applies_to": ["inventory", "finance", "staff", "menu", "equipment"],\n'
            '  "severity": "info | warning | critical"\n'
            '}'
        )

        result = await zai.call_zai(
            prompt=user_prompt,
            system_prompt=system_prompt,
            business_id=business_id,
            call_type="rule_parsing",
        )

        if not result.get("success"):
            return {"success": False, "error": result.get("response", "Parse failed")}

        # Try to extract JSON from the response
        response_text = result.get("response", "")
        try:
            # Strip markdown code fences if present
            clean = response_text.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                if clean.endswith("```"):
                    clean = clean[:-3]
                clean = clean.strip()
            if clean.startswith("json"):
                clean = clean[4:].strip()

            parsed = json.loads(clean)
            parsed["success"] = True
            return parsed
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Failed to parse AI response as JSON",
                "raw_response": response_text,
            }
