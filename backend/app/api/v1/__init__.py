from fastapi import APIRouter
from .endpoints import inventory, ai

api_router = APIRouter()

api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])

