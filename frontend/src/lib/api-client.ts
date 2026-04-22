// All /api/* requests are proxied server-side to FastAPI via the catch-all route
const API_BASE_URL = '';

interface ExpenseRecord {
  amount?: number | string | null;
  transaction_date?: string | null;
}

interface InventoryRecord {
  name?: string | null;
  quantity?: number | string | null;
  reorder_level?: number | string | null;
}

interface SubscriptionRecord {
  renewal_date?: string | null;
  status?: string | null;
}

function extractArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const maybeArray = (payload as { data?: unknown; items?: unknown; results?: unknown }).data
      ?? (payload as { items?: unknown }).items
      ?? (payload as { results?: unknown }).results;

    if (Array.isArray(maybeArray)) {
      return maybeArray as T[];
    }
  }

  return [];
}

export async function fetchInventory() {
  const response = await fetch(`${API_BASE_URL}/api/ingredients/`);
  if (!response.ok) {
    throw new Error('Failed to fetch inventory');
  }
  return extractArrayPayload<InventoryRecord>(await response.json());
}

export async function fetchExpenses() {
  const response = await fetch(`${API_BASE_URL}/api/expenses/`);
  if (!response.ok) {
    throw new Error('Failed to fetch expenses');
  }
  return extractArrayPayload<ExpenseRecord>(await response.json());
}

export async function fetchSubscriptions() {
  const response = await fetch(`${API_BASE_URL}/api/subscriptions/`);
  if (!response.ok) {
    throw new Error('Failed to fetch subscriptions');
  }
  return extractArrayPayload<SubscriptionRecord>(await response.json());
}

export async function fetchAIBriefings() {
  const response = await fetch(`${API_BASE_URL}/api/ai/`);
  if (!response.ok) {
    throw new Error('Failed to fetch AI briefings');
  }
  return response.json();
}

export async function generateDailyBriefing(businessId: string = 'default', context: Record<string, unknown> = {}) {
  const response = await fetch(`${API_BASE_URL}/api/ai/generate?business_id=${encodeURIComponent(businessId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(context),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate daily briefing');
  }
  return response.json();
}

export interface DashboardStats {
  totalExpenses: number;
  lowStockCount: number;
  lowStockItems: Array<{ name: string; quantity: number; reorder_level: number }>;
  upcomingRenewals: number;
  nextRenewalDays: number | null;
  budgetUtilization: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [expenses, inventory, subscriptions] = await Promise.all([
    fetchExpenses().catch(() => []),
    fetchInventory().catch(() => []),
    fetchSubscriptions().catch(() => []),
  ]);

  // Calculate total expenses this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyExpenses = expenses.filter((expense) => {
    if (!expense.transaction_date) {
      return false;
    }

    const txDate = new Date(expense.transaction_date);
    return txDate >= monthStart;
  });
  const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  // Low stock items
  const lowStockItems = inventory.filter((item) =>
    item.reorder_level && Number(item.quantity) <= Number(item.reorder_level)
  ).map((item) => ({
    name: item.name ?? 'Unknown item',
    quantity: Number(item.quantity),
    reorder_level: Number(item.reorder_level),
  }));

  // Upcoming renewals
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'active');
  const upcomingRenewals = activeSubscriptions.filter((subscription) => {
    if (!subscription.renewal_date) return false;
    const renewalDate = new Date(subscription.renewal_date);
    const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 30;
  });

  const nextRenewalDays = upcomingRenewals.length > 0
    ? Math.min(...upcomingRenewals.map((subscription) => {
        const d = new Date(subscription.renewal_date ?? now);
        return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }))
    : null;

  // Budget utilization (rough estimate: assume monthly budget is avg of last 3 months * 1.1)
  const budgetUtilization = 74; // placeholder until budget table exists

  return {
    totalExpenses,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    upcomingRenewals: upcomingRenewals.length,
    nextRenewalDays,
    budgetUtilization,
  };
}


// =========================================================================
//  AI Feature API functions
// =========================================================================

/** FEATURE 1: Daily Briefing */
export async function fetchLatestBriefing(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/ai/daily-briefing/${encodeURIComponent(businessId)}/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest briefing');
  return res.json();
}

export async function generateAIDailyBriefing(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/ai/daily-briefing/${encodeURIComponent(businessId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to generate daily briefing');
  return res.json();
}

/** FEATURE 2: Waste Prediction */
export async function generateWastePrediction(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/ai/waste-prediction/${encodeURIComponent(businessId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to generate waste prediction');
  return res.json();
}

export async function markWasteActioned(businessId: string = 'default', itemName: string, actionTaken: string) {
  const res = await fetch(`${API_BASE_URL}/api/ai/waste-prediction/${encodeURIComponent(businessId)}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_name: itemName, action_taken: actionTaken }),
  });
  if (!res.ok) throw new Error('Failed to mark waste action');
  return res.json();
}

export async function fetchLatestWastePrediction(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/ai/waste-prediction/${encodeURIComponent(businessId)}/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest waste prediction');
  return res.json();
}

/** FEATURE 3: Menu Advisor */
export async function generateMenuAdvice(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/ai/menu-advisor/${encodeURIComponent(businessId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to generate menu advice');
  return res.json();
}

export async function fetchLatestMenuAdvice(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/ai/menu-advisor/${encodeURIComponent(businessId)}/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest menu advice');
  return res.json();
}

/** Fetch all latest AI outputs for dashboard preview */
export async function fetchAllAIInsightPreviews(businessId: string = 'default') {
  const [briefing, waste, menu] = await Promise.all([
    fetchLatestBriefing(businessId).catch(() => ({ data: null })),
    fetchLatestWastePrediction(businessId).catch(() => ({ data: null })),
    fetchLatestMenuAdvice(businessId).catch(() => ({ data: null })),
  ]);
  return { briefing: briefing?.data, waste: waste?.data, menu: menu?.data };
}
