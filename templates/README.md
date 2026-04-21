# Industry Templates

This directory contains pre-configured industry templates for the SME Business Manager.

## Structure
- `f_and_b.json`: (Default) Food & Beverage template including inventory categories and common expenses.
- `retail.json`: Retail template with stock turnover logic.
- `services.json`: Service-based business template (e.g., consultants, repair shops).

## Format
Templates should define:
- `categories`: Default inventory/expense buckets.
- `rules`: Default business rules (e.g., "Alert when waste > 5%").
- `ai_skills`: Recommended AI sub-modules to enable.
