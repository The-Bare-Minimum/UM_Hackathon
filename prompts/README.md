# Z.AI Prompt Templates

This directory stores standardized prompt templates for the Z.AI GLM integration.

## Files
- `daily_briefing.md`: Template for generating the SME morning summary.
- `inventory_prediction.md`: Prompts for analyzing stock trends and waste.
- `menu_advisor.md`: Prompts for seasonal menu suggestions.
- `rules_engine.md`: System prompts for custom business logic validation.

## Usage
Templates should be loaded by the FastAPI backend services and hydrated with dynamic data before being sent to the Z.AI API.
