from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class ExpenseCreate(BaseModel):
    """Schema for creating a new expense."""
    name: str = Field(..., min_length=1, max_length=255, description="Expense name")
    category: str = Field(..., min_length=1, max_length=100, description="Expense category")
    amount: float = Field(..., gt=0, description="Expense amount in RM")
    frequency: str = Field("one-time", description="Frequency: one-time, daily, weekly, monthly, yearly")
    transaction_date: Optional[date] = Field(None, description="Date of the expense")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")
    description: Optional[str] = Field(None, max_length=500, description="Description")


class ExpenseUpdate(BaseModel):
    """Schema for updating an existing expense. All fields optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    frequency: Optional[str] = Field(None)
    transaction_date: Optional[date] = Field(None)
    notes: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=500)


class ExpenseResponse(BaseModel):
    """Schema for expense responses from the API."""
    id: UUID
    business_id: Optional[UUID] = None
    name: Optional[str] = None
    category: Optional[str] = None
    amount: float
    frequency: Optional[str] = "one-time"
    transaction_date: Optional[date] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetCreate(BaseModel):
    """Schema for creating/updating a budget allocation."""
    category: str = Field(..., min_length=1, max_length=100, description="Budget category")
    allocated_amount: float = Field(..., ge=0, description="Allocated budget in RM")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    year: int = Field(..., ge=2020, description="Year")


class BudgetUpdate(BaseModel):
    """Schema for updating a budget allocation."""
    allocated_amount: Optional[float] = Field(None, ge=0)
    month: Optional[int] = Field(None, ge=1, le=12)
    year: Optional[int] = Field(None, ge=2020)


class BudgetResponse(BaseModel):
    """Schema for budget responses from the API."""
    id: UUID
    business_id: Optional[UUID] = None
    category: str
    allocated_amount: float
    month: int
    year: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
