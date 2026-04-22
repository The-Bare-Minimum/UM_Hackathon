"""
Business Rules Router
─────────────────────
CRUD + Z.AI parsing + rules context endpoints.
"""

import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.rules_engine import RulesEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rules", tags=["Business Rules"])


class RuleCreateRequest(BaseModel):
    rule_text: str
    rule_type: str = "behavior"
    trigger_condition: Optional[str] = None
    action: Optional[str] = None
    applies_to: Optional[List[str]] = []
    severity: str = "info"


class RuleUpdateRequest(BaseModel):
    rule_text: Optional[str] = None
    rule_type: Optional[str] = None
    trigger_condition: Optional[str] = None
    action: Optional[str] = None
    applies_to: Optional[List[str]] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None


class RuleParseRequest(BaseModel):
    raw_text: str


class ToggleRequest(BaseModel):
    is_active: bool


def _ok(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    return {"success": True, "message": message, "data": data}


@router.get("/{business_id}")
async def list_rules(business_id: str):
    engine = RulesEngine()
    rules = await engine.get_all(business_id)
    return _ok(data=rules)


@router.post("/{business_id}")
async def create_rule(business_id: str, body: RuleCreateRequest):
    engine = RulesEngine()
    rule = await engine.create(business_id, body.model_dump(exclude_none=True))
    return _ok(data=rule, message="Rule created")


@router.put("/{business_id}/{rule_id}")
async def update_rule(business_id: str, rule_id: str, body: RuleUpdateRequest):
    engine = RulesEngine()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    rule = await engine.update(rule_id, updates)
    return _ok(data=rule, message="Rule updated")


@router.delete("/{business_id}/{rule_id}")
async def delete_rule(business_id: str, rule_id: str):
    engine = RulesEngine()
    await engine.delete(rule_id)
    return _ok(message="Rule deleted")


@router.patch("/{business_id}/{rule_id}/toggle")
async def toggle_rule(business_id: str, rule_id: str, body: ToggleRequest):
    engine = RulesEngine()
    rule = await engine.toggle(rule_id, body.is_active)
    return _ok(data=rule, message=f"Rule {'activated' if body.is_active else 'deactivated'}")


@router.get("/{business_id}/context/{module}")
async def get_rules_context(business_id: str, module: str):
    engine = RulesEngine()
    context = await engine.get_rules_context(business_id, module)
    return _ok(data={"context": context})


@router.post("/{business_id}/parse")
async def parse_rule(business_id: str, body: RuleParseRequest):
    """Use Z.AI to parse a plain-English rule into structured format."""
    engine = RulesEngine()
    parsed = await engine.parse_rule_with_zai(body.raw_text, business_id)
    return _ok(data=parsed, message="Rule parsed" if parsed.get("success") else "Parse failed")
