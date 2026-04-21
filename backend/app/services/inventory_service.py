from supabase import AsyncClient
import logging

logger = logging.getLogger(__name__)

class InventoryService:
    """
    Business logic for Inventory and Waste Prediction.
    """
    def __init__(self, db: AsyncClient):
        self.db = db
        
    async def get_inventory_items(self):
        """
        Fetch all inventory items from Supabase.
        """
        try:
            response = await self.db.table("inventory").select("*").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching inventory: {str(e)}")
            raise
            
    async def predict_waste(self, item_id: str, ai_service) -> str:
        """
        Gathers item data and asks AI to predict waste.
        """
        # 1. Fetch item logic here (mocked for boilerplate)
        item_data = {"name": "Tomatoes", "current_quantity": 50, "historical_waste_rate": 0.15}
        
        # 2. Call AI Service
        system_prompt = "You are an AI assistant specialized in F&B inventory management. Predict waste based on the data."
        user_message = f"Predict waste for: {item_data}"
        
        prediction = await ai_service.generate_response(system_prompt, user_message)
        return prediction
