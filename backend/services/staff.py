from config.supabase import get_supabase
from typing import List, Dict, Any

class StaffService:
    def __init__(self):
        self.supabase = get_supabase()
        self.table = "staff"

    async def get_all(self, business_id: str) -> List[Dict[str, Any]]:
        response = self.supabase.table(self.table).select("*").execute()
        return response.data

    async def create(self, business_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        response = self.supabase.table(self.table).insert(data).execute()
        return response.data[0] if response.data else {}

    async def update(self, id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        response = self.supabase.table(self.table).update(data).eq("id", id).execute()
        return response.data[0] if response.data else {}

    async def delete(self, id: str) -> bool:
        response = self.supabase.table(self.table).delete().eq("id", id).execute()
        return True
