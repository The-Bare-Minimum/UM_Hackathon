from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    ingredients, 
    expenses, 
    staff, 
    machines, 
    subscriptions, 
    menu_items, 
    ai
)

app = FastAPI(
    title="SME Business Manager API",
    description="Backend API for AI-powered SME management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

# Include routers
app.include_router(ingredients.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(staff.router, prefix="/api")
app.include_router(machines.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(menu_items.router, prefix="/api")
app.include_router(ai.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
