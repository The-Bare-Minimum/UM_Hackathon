import json
import logging
from config.supabase import get_supabase
from typing import List, Dict, Any, Optional
from datetime import date, timedelta, datetime, timezone

logger = logging.getLogger(__name__)


class IngredientService:
    def __init__(self):
        self.supabase = get_supabase()
        self.table = "ingredients"
        self.audit_table = "audit_logs"

    # ------------------------------------------------------------------ #
    #  AUDIT LOGGING
    # ------------------------------------------------------------------ #
    def _log_audit(
        self,
        action: str,
        record_id: str,
        old_data: Optional[Dict[str, Any]] = None,
        new_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Write an entry to the audit_logs table in Supabase."""
        try:
            payload = {
                "action": action,
                "module": "ingredients",
                "record_id": record_id,
                "old_data": json.dumps(old_data, default=str) if old_data else None,
                "new_data": json.dumps(new_data, default=str) if new_data else None,
            }
            self.supabase.table(self.audit_table).insert(payload).execute()
        except Exception as e:
            # Audit failures must never break the main operation
            logger.error(f"Audit log failed for {action} on {record_id}: {e}")

    # ------------------------------------------------------------------ #
    #  CRUD
    # ------------------------------------------------------------------ #
    async def get_all(self, business_id: str) -> List[Dict[str, Any]]:
        """Return every ingredient belonging to *business_id*."""
        response = (
            self.supabase.table(self.table)
            .select("*")
            .eq("business_id", business_id)
            .order("name")
            .execute()
        )
        return response.data

    async def create(self, business_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new ingredient and audit-log the action."""
        payload = {
            **data,
            "business_id": business_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        response = self.supabase.table(self.table).insert(payload).execute()
        created = response.data[0] if response.data else {}

        if created:
            self._log_audit("CREATE", created["id"], new_data=created)

        return created

    async def update(self, id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an ingredient by *id*. Logs old → new diff."""
        # Fetch current row for audit trail
        old_response = (
            self.supabase.table(self.table)
            .select("*")
            .eq("id", id)
            .execute()
        )
        old_data = old_response.data[0] if old_response.data else None

        if not old_data:
            return {}

        payload = {
            **data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        response = (
            self.supabase.table(self.table)
            .update(payload)
            .eq("id", id)
            .execute()
        )
        updated = response.data[0] if response.data else {}

        if updated:
            self._log_audit("UPDATE", id, old_data=old_data, new_data=updated)

        return updated

    async def delete(self, id: str) -> bool:
        """Delete an ingredient by *id*. Logs the deleted row."""
        # Fetch current row for audit trail
        old_response = (
            self.supabase.table(self.table)
            .select("*")
            .eq("id", id)
            .execute()
        )
        old_data = old_response.data[0] if old_response.data else None

        if not old_data:
            return False

        self.supabase.table(self.table).delete().eq("id", id).execute()
        self._log_audit("DELETE", id, old_data=old_data)
        return True

    # ------------------------------------------------------------------ #
    #  ALERTS
    # ------------------------------------------------------------------ #
    async def get_alerts(self, business_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Return two lists:
          • low_stock  – items where quantity < min_threshold
          • expiring_soon – items expiring within the next 7 days
        """
        all_items = (
            self.supabase.table(self.table)
            .select("*")
            .eq("business_id", business_id)
            .execute()
        ).data

        today = date.today()
        seven_days = today + timedelta(days=7)

        low_stock: List[Dict[str, Any]] = []
        expiring_soon: List[Dict[str, Any]] = []

        for item in all_items:
            # Low-stock check
            if item.get("quantity", 0) < item.get("min_threshold", 0):
                low_stock.append(item)

            # Expiry check
            exp = item.get("expiry_date")
            if exp:
                try:
                    exp_date = (
                        date.fromisoformat(exp) if isinstance(exp, str) else exp
                    )
                    if exp_date <= seven_days:
                        expiring_soon.append(item)
                except (ValueError, TypeError):
                    pass

        return {
            "low_stock": low_stock,
            "expiring_soon": expiring_soon,
        }
