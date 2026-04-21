import httpx
import logging
import os
from pathlib import Path
from app.core.config import Settings
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

# Base path for the templates (assumes backend runs from backend/ dir, so prompts/ is one level up)
PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"

class ZAIService:
    """
    Async client service to interact with the Z.AI GLM models.
    """
    def __init__(self, settings: Settings):
        self.api_key = settings.Z_AI_API_KEY
        self.model = settings.Z_AI_MODEL
        # Adjust base URL according to Z.AI specs
        self.base_url = "https://open.bigmodel.cn/api/paas/v4/chat/completions" 
    
    def _load_prompt(self, filename: str) -> str:
        """Utility to load prompt templates from the file system."""
        prompt_path = PROMPTS_DIR / filename
        try:
            return prompt_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            logger.error(f"Prompt template {filename} not found at {prompt_path}")
            return "System prompt missing. Please act as a helpful business assistant."

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        reraise=True
    )
    async def generate_response(self, system_prompt: str, user_message: str) -> str:
        """
        Calls the Z.AI API to generate a response, with robust exponential backoff retry logic.
        """
        if not self.api_key or self.api_key == "your_z_ai_api_key":
            logger.warning("Z.AI API Key is not set. Returning mocked response.")
            return f"Mocked AI Response for prompt starting with: {user_message[:50]}..."
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.base_url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                logger.error(f"Z.AI API returned an error: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Failed to communicate with Z.AI: {str(e)}")
                raise

    # --- Specific Feature Methods ---

    async def get_daily_briefing(self, business_context: str) -> str:
        system_prompt = self._load_prompt("daily_briefing.md")
        system_prompt = system_prompt.replace("{{business_context}}", business_context)
        return await self.generate_response(system_prompt, "Please generate today's briefing.")

    async def predict_ingredient_waste(self, ingredient_data: str) -> str:
        system_prompt = self._load_prompt("waste_prediction.md")
        system_prompt = system_prompt.replace("{{ingredient_data}}", ingredient_data)
        return await self.generate_response(system_prompt, "Predict the waste.")

    async def recommend_seasonal_menu(self, season: str, inventory_surplus: str) -> str:
        system_prompt = self._load_prompt("menu_recommendation.md")
        system_prompt = system_prompt.replace("{{season}}", season)
        system_prompt = system_prompt.replace("{{inventory_surplus}}", inventory_surplus)
        return await self.generate_response(system_prompt, "Give me seasonal menu recommendations.")

    async def analyze_budget_alert(self, budget_data: str) -> str:
        system_prompt = self._load_prompt("budget_analysis.md")
        system_prompt = system_prompt.replace("{{budget_data}}", budget_data)
        return await self.generate_response(system_prompt, "Analyze this budget alert.")

    async def evaluate_custom_rule(self, scenario_data: str, rule_condition: str) -> str:
        system_prompt = self._load_prompt("rules_evaluation.md")
        system_prompt = system_prompt.replace("{{scenario_data}}", scenario_data)
        system_prompt = system_prompt.replace("{{rule_condition}}", rule_condition)
        return await self.generate_response(system_prompt, "Evaluate the business rule.")
