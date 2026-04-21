"""
Z.AI GLM Integration Service
─────────────────────────────
Provides:
 1. Base ZAI client with retry logic, timeout, and call logging
 2. Ingredient analysis function
 3. Budget analysis function
"""

import os
import json
import time
import logging
from datetime import date
from typing import Dict, Any, Optional

import httpx

from config.supabase import get_supabase

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
#  Configuration
# ────────────────────────────────────────────────────────────────────
ZAI_API_URL = os.getenv("ZAI_API_URL", "")
ZAI_API_KEY = os.getenv("ZAI_API_KEY", "")
ZAI_MODEL = "glm-4-flash"
ZAI_TIMEOUT = 30  # seconds
ZAI_MAX_RETRIES = 3


class ZAIService:
    """Core Z.AI client with retry, timeout, and Supabase call logging."""

    def __init__(self):
        self.supabase = get_supabase()
        self.log_table = "ai_call_logs"

    # ------------------------------------------------------------------ #
    #  1. Base call_zai
    # ------------------------------------------------------------------ #
    async def call_zai(
        self,
        prompt: str,
        system_prompt: str,
        business_id: Optional[str] = None,
        call_type: str = "general",
    ) -> Dict[str, Any]:
        """
        Send a prompt to Z.AI GLM and return the response.
        Retries up to ZAI_MAX_RETRIES on transient failures.
        Every call is logged to the ai_call_logs table.
        """
        if not ZAI_API_URL or not ZAI_API_KEY:
            return {
                "success": False,
                "response": "Z.AI API is not configured. Set ZAI_API_URL and ZAI_API_KEY.",
                "tokens_used": 0,
                "latency_ms": 0,
            }

        payload = {
            "model": ZAI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "temperature": 0.7,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ZAI_API_KEY}",
        }

        last_error: Optional[str] = None
        start_ms = _now_ms()

        for attempt in range(1, ZAI_MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=ZAI_TIMEOUT) as client:
                    response = await client.post(
                        ZAI_API_URL,
                        json=payload,
                        headers=headers,
                    )

                latency_ms = _now_ms() - start_ms

                if response.status_code == 200:
                    data = response.json()
                    content = (
                        data.get("choices", [{}])[0]
                        .get("message", {})
                        .get("content", "No response content")
                    )
                    tokens = data.get("usage", {}).get("total_tokens", 0)

                    # Log success
                    self._log_call(
                        business_id=business_id,
                        call_type=call_type,
                        prompt_sent=prompt,
                        response_text=content,
                        tokens_used=tokens,
                        latency_ms=latency_ms,
                        status="success",
                    )

                    return {
                        "success": True,
                        "response": content,
                        "tokens_used": tokens,
                        "latency_ms": latency_ms,
                    }
                else:
                    last_error = f"HTTP {response.status_code}: {response.text[:300]}"
                    logger.warning(
                        f"ZAI attempt {attempt}/{ZAI_MAX_RETRIES} failed: {last_error}"
                    )

            except httpx.TimeoutException:
                latency_ms = _now_ms() - start_ms
                last_error = f"Request timed out after {ZAI_TIMEOUT}s"
                logger.warning(
                    f"ZAI attempt {attempt}/{ZAI_MAX_RETRIES}: {last_error}"
                )

            except Exception as exc:
                latency_ms = _now_ms() - start_ms
                last_error = str(exc)
                logger.warning(
                    f"ZAI attempt {attempt}/{ZAI_MAX_RETRIES} error: {last_error}"
                )

        # All retries exhausted
        latency_ms = _now_ms() - start_ms
        self._log_call(
            business_id=business_id,
            call_type=call_type,
            prompt_sent=prompt,
            response_text=None,
            tokens_used=0,
            latency_ms=latency_ms,
            status="error",
            error_message=last_error,
        )

        return {
            "success": False,
            "response": f"Z.AI request failed after {ZAI_MAX_RETRIES} retries: {last_error}",
            "tokens_used": 0,
            "latency_ms": latency_ms,
        }

    # ------------------------------------------------------------------ #
    #  2. Ingredient Analysis
    # ------------------------------------------------------------------ #
    async def analyze_ingredients(
        self,
        business_id: str,
        ingredients_data: Any,
        rules: str = "",
    ) -> Dict[str, Any]:
        """Analyze ingredient inventory with Z.AI and return recommendations."""
        today = date.today().isoformat()

        system_prompt = (
            "You are an AI Business Manager for an F&B SME. "
            "Analyze ingredient data and provide clear, "
            "actionable recommendations. Be concise and specific. "
            "Always refer to quantities and dates in your response. "
            f"Follow these business rules: {rules}" if rules
            else "You are an AI Business Manager for an F&B SME. "
            "Analyze ingredient data and provide clear, "
            "actionable recommendations. Be concise and specific. "
            "Always refer to quantities and dates in your response."
        )

        user_prompt = (
            f"Here is the current ingredient inventory:\n"
            f"{json.dumps(ingredients_data, default=str, indent=2)}\n\n"
            f"Today's date: {today}\n\n"
            "Please provide:\n"
            "1. Which ingredients need immediate attention "
            "(expiring or critically low)\n"
            "2. What to use up first this week\n"
            "3. What to reorder and how much\n"
            "4. Any waste risk in the next 7 days\n\n"
            "Keep response under 200 words. Use bullet points."
        )

        return await self.call_zai(
            prompt=user_prompt,
            system_prompt=system_prompt,
            business_id=business_id,
            call_type="ingredient_analysis",
        )

    # ------------------------------------------------------------------ #
    #  3. Budget Analysis
    # ------------------------------------------------------------------ #
    async def analyze_budget(
        self,
        business_id: str,
        budget_data: Any,
        expenses_data: Any,
        rules: str = "",
    ) -> Dict[str, Any]:
        """Analyze budget & expenses with Z.AI and return recommendations."""
        system_prompt = (
            "You are an AI Financial Advisor for an F&B SME. "
            "Analyze spending data and give practical money-saving "
            "recommendations. Be direct and specific with numbers. "
            f"Follow these business rules: {rules}" if rules
            else "You are an AI Financial Advisor for an F&B SME. "
            "Analyze spending data and give practical money-saving "
            "recommendations. Be direct and specific with numbers."
        )

        user_prompt = (
            f"Here is this month's financial data:\n"
            f"Budget status: {json.dumps(budget_data, default=str, indent=2)}\n"
            f"Recent expenses: {json.dumps(expenses_data, default=str, indent=2)}\n\n"
            "Please provide:\n"
            "1. Overall budget health (good/warning/critical)\n"
            "2. Top 2 areas to cut costs immediately\n"
            "3. Any unusual or high spending patterns\n"
            "4. Forecast: will we overspend this month?\n\n"
            "Keep response under 200 words. Use bullet points."
        )

        return await self.call_zai(
            prompt=user_prompt,
            system_prompt=system_prompt,
            business_id=business_id,
            call_type="budget_analysis",
        )

    # ------------------------------------------------------------------ #
    #  Call Logging
    # ------------------------------------------------------------------ #
    def _log_call(
        self,
        business_id: Optional[str],
        call_type: str,
        prompt_sent: str,
        response_text: Optional[str],
        tokens_used: int,
        latency_ms: int,
        status: str,
        error_message: Optional[str] = None,
    ) -> None:
        """Write an entry to the ai_call_logs table in Supabase."""
        try:
            row = {
                "call_type": call_type,
                "prompt_sent": prompt_sent[:4000],  # truncate very long prompts
                "response": (response_text or "")[:8000],
                "tokens_used": tokens_used,
                "latency_ms": latency_ms,
                "status": status,
            }
            if business_id:
                row["business_id"] = business_id
            if error_message:
                row["error_message"] = error_message[:2000]

            self.supabase.table(self.log_table).insert(row).execute()
        except Exception as e:
            # Logging failures must never break the main operation
            logger.error(f"Failed to log AI call: {e}")


# ────────────────────────────────────────────────────────────────────
#  Helpers
# ────────────────────────────────────────────────────────────────────
def _now_ms() -> int:
    """Current epoch time in milliseconds."""
    return int(time.time() * 1000)
