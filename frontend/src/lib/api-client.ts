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

function extractData<T = unknown>(payload: unknown): T | null {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
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


// =========================================================================
//  Business Rules API
// =========================================================================

export interface BusinessRule {
  id: string;
  rule_text: string;
  rule_type: 'alert' | 'behavior' | 'constraint';
  trigger_condition?: string;
  action?: string;
  applies_to?: string[];
  severity: 'info' | 'warning' | 'critical';
  is_active: boolean;
  triggered_count: number;
  created_at: string;
}

export async function fetchRules(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/rules/${encodeURIComponent(businessId)}`);
  if (!res.ok) throw new Error('Failed to fetch rules');
  return res.json();
}

export async function parseRule(businessId: string = 'default', rawText: string) {
  const res = await fetch(`${API_BASE_URL}/api/rules/${encodeURIComponent(businessId)}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText }),
  });
  if (!res.ok) throw new Error('Failed to parse rule');
  return res.json();
}

export async function createRule(businessId: string = 'default', rule: Partial<BusinessRule>) {
  const res = await fetch(`${API_BASE_URL}/api/rules/${encodeURIComponent(businessId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw new Error('Failed to create rule');
  return res.json();
}

export async function deleteRule(businessId: string = 'default', ruleId: string) {
  const res = await fetch(`${API_BASE_URL}/api/rules/${encodeURIComponent(businessId)}/${ruleId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete rule');
  return res.json();
}

export async function toggleRule(businessId: string = 'default', ruleId: string, isActive: boolean) {
  const res = await fetch(`${API_BASE_URL}/api/rules/${encodeURIComponent(businessId)}/${ruleId}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw new Error('Failed to toggle rule');
  return res.json();
}


// =========================================================================
//  AI Skills API
// =========================================================================

export interface AISkill {
  id: string;
  skill_name: string;
  description: string;
  category: string;
  is_enabled: boolean;
  last_used: string | null;
}

export async function fetchSkills(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/skills/${encodeURIComponent(businessId)}`);
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
}

export async function toggleSkill(businessId: string = 'default', skillName: string, enabled: boolean) {
  const res = await fetch(`${API_BASE_URL}/api/skills/${encodeURIComponent(businessId)}/${encodeURIComponent(skillName)}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error('Failed to toggle skill');
  return res.json();
}

export async function fetchEnabledSkills(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/skills/${encodeURIComponent(businessId)}/enabled`);
  if (!res.ok) throw new Error('Failed to fetch enabled skills');
  return res.json();
}


// =========================================================================
//  Assets API
// =========================================================================

export interface Asset {
  id: string;
  name: string;
  asset_type: 'machine' | 'subscription' | 'license';
  purchase_date?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  renewal_date?: string;
  cost_per_renewal: number;
  status: string;
  computed_status: string;
  notes?: string;
  created_at: string;
}

export async function fetchAssets(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/assets/${encodeURIComponent(businessId)}`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function createAsset(businessId: string = 'default', asset: Partial<Asset>) {
  const res = await fetch(`${API_BASE_URL}/api/assets/${encodeURIComponent(businessId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset),
  });
  if (!res.ok) throw new Error('Failed to create asset');
  return res.json();
}

export async function deleteAsset(businessId: string = 'default', assetId: string) {
  const res = await fetch(`${API_BASE_URL}/api/assets/${encodeURIComponent(businessId)}/${assetId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete asset');
  return res.json();
}

export async function markAssetServiced(businessId: string = 'default', assetId: string) {
  const res = await fetch(`${API_BASE_URL}/api/assets/${encodeURIComponent(businessId)}/${assetId}/service`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark serviced');
  return res.json();
}

export async function analyzeAssets(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/assets/${encodeURIComponent(businessId)}/analyze`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to analyze assets');
  return res.json();
}

export async function fetchMonthlyCost(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/assets/${encodeURIComponent(businessId)}/monthly-cost`);
  if (!res.ok) throw new Error('Failed to fetch monthly cost');
  return res.json();
}


// =========================================================================
//  Dashboard Health Score & AI Status
// =========================================================================

export async function fetchHealthScore(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/ai/health-score/${encodeURIComponent(businessId)}`);
  if (!res.ok) throw new Error('Failed to fetch health score');
  return res.json();
}

export async function fetchTriggeredRules(businessId: string = 'default') {
  const res = await fetch(`${API_BASE_URL}/api/ai/triggered-rules/${encodeURIComponent(businessId)}`);
  if (!res.ok) throw new Error('Failed to fetch triggered rules');
  return res.json();
}
