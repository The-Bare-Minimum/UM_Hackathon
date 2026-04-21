from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class IngredientCreate(BaseModel):
    """Schema for creating a new ingredient."""
    name: str = Field(..., min_length=1, max_length=255, description="Ingredient name")
    quantity: float = Field(..., ge=0, description="Current quantity in stock")
    unit: str = Field(..., min_length=1, max_length=50, description="Unit of measurement (kg, litre, pcs, etc.)")
    min_threshold: float = Field(..., ge=0, description="Minimum stock threshold for alerts")
    expiry_date: Optional[date] = Field(None, description="Expiry date of the ingredient")
    cost_per_unit: float = Field(..., ge=0, description="Cost per unit of the ingredient")


class IngredientUpdate(BaseModel):
    """Schema for updating an existing ingredient. All fields optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    min_threshold: Optional[float] = Field(None, ge=0)
    expiry_date: Optional[date] = Field(None)
    cost_per_unit: Optional[float] = Field(None, ge=0)


class IngredientResponse(BaseModel):
    """Schema for ingredient responses from the API."""
    id: UUID
    business_id: UUID
    name: str
    quantity: float
    unit: str
    min_threshold: float
    expiry_date: Optional[date] = None
    cost_per_unit: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
