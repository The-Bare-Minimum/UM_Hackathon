"""
AI Skills Router
────────────────
Toggle AI features on/off, check if enabled.
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from services.skills_gate import SkillsGate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/skills", tags=["AI Skills"])


class ToggleSkillRequest(BaseModel):
    enabled: bool


def _ok(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    return {"success": True, "message": message, "data": data}


@router.get("/{business_id}")
async def list_skills(business_id: str):
    gate = SkillsGate()
    skills = await gate.get_all(business_id)
    return _ok(data=skills)


@router.patch("/{business_id}/{skill_name}/toggle")
async def toggle_skill(business_id: str, skill_name: str, body: ToggleSkillRequest):
    gate = SkillsGate()
    # URL-decode the skill name (spaces become %20)
    decoded_name = skill_name.replace("%20", " ").replace("+", " ")
    result = await gate.toggle_skill(business_id, decoded_name, body.enabled)
    return _ok(data=result, message=f"Skill {'enabled' if body.enabled else 'disabled'}")


@router.get("/{business_id}/check/{skill_name}")
async def check_skill(business_id: str, skill_name: str):
    gate = SkillsGate()
    decoded_name = skill_name.replace("%20", " ").replace("+", " ")
    enabled = await gate.is_skill_enabled(business_id, decoded_name)
    return _ok(data={"skill_name": decoded_name, "enabled": enabled})


@router.get("/{business_id}/enabled")
async def list_enabled_skills(business_id: str):
    gate = SkillsGate()
    enabled = await gate.get_enabled_skills(business_id)
    return _ok(data=enabled)
