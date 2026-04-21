# SME Business Manager (AI-Powered)

An intelligent business management platform for small and medium enterprises, featuring automated inventory prediction, seasonal menu advising, and daily AI briefings.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python), httpx
- **Database**: Supabase (Postgres, Auth, Storage)
- **AI**: Z.AI GLM (via API)

## Project Structure

```text
.
├── frontend/           # Next.js 14 Application
├── backend/            # FastAPI Python Application
├── prompts/            # Z.AI GLM Prompt Templates
├── templates/          # Industry Templates (F&B, Retail, etc.)
├── migrations/         # Supabase Database Migrations
├── docs/               # Technical Documentation
└── docker-compose.yml  # Orchestration for local development
```

## Features
- **Ingredient & Inventory Tracker**: Waste prediction using historical trends.
- **Budget & Expense Monitor**: Automated tracking and alerts.
- **Staff & Salary Manager**: Rostering and payroll management.
- **Machine & Subscription Tracker**: Maintenance schedules and renewals.
- **Seasonal Menu Advisor**: AI-driven suggestions based on inventory and trends.
- **AI Daily Briefing**: Morning summary of business health.
- **Industry Templates**: Pre-configured setups for specific business types.

## Getting Started

1. **Clone the repo**
2. **Setup Environment Variables**: `cp .env.example .env` and fill in your keys.
3. **Run with Docker**: `docker compose up --build`

---

## Documentation
See [docs/architecture.md](docs/architecture.md) for deeper technical insights.