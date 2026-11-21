export type PublicPage =
  | 'home'
  | 'how-it-works'
  | 'features'
  | 'business-models'
  | 'pricing'
  | 'about'
  | 'faq'
  | 'contact'
  | 'privacy'
  | 'terms';

export type DashboardTab =
  | 'overview'
  | 'business'
  | 'ai'
  | 'products'
  | 'suppliers'
  | 'store'
  | 'marketing'
  | 'finance'
  | 'experts'
  | 'learning'
  | 'notifications'
  | 'billing'
  | 'settings'
  | 'admin';

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  is_demo: number;
  email_verified: number;
  country: string;
  language: string;
  notification_prefs: Record<string, boolean>;
  created_at: string;
}

export interface BusinessProfile {
  id: number;
  user_id: number;
  name: string;
  model: string;
  niche: string;
  target_countries: string;
  stage: string;
  launch_progress: number;
}

export interface OnboardingData {
  id: number;
  user_id: number;
  experience_level: string;
  budget: string;
  target_countries: string;
  preferred_categories: string;
  weekly_hours: string;
  has_existing_store: string;
  marketing_experience: string;
  goals: string;
  completed: number;
}

export interface SubscriptionInfo {
  id: number;
  user_id: number;
  plan: 'starter' | 'builder' | 'professional';
  billing_cycle: 'monthly' | 'annual';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  ai_credits_limit: number;
  ai_credits_used: number;
  current_period_end: string;
  payment_mode: string;
}

export interface WorkspaceContext {
  user: UserProfile;
  business: BusinessProfile;
  onboarding: OnboardingData;
  subscription: SubscriptionInfo;
  counts: {
    savedProducts: number;
    connectedStores: number;
    supplierConnections: number;
    unreadNotifications: number;
  };
}

export interface PlanConfigItem {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  aiCredits: number;
  trialDays: number;
}

export type PlansConfig = Record<'starter' | 'builder' | 'professional', PlanConfigItem>;

export interface ProductItem {
  id: number;
  name: string;
  category: string;
  business_model: string;
  image_url: string;
  supplier_id: number | null;
  supplier_name: string;
  supplier_cost: number | null;
  suggested_price: number | null;
  shipping_info: string;
  target_country: string;
  competitor_summary: string;
  research_date: string;
  source_url: string;
  data_status: 'verified_catalog' | 'estimate' | 'unavailable_partial';
  opportunity_criteria: Record<string, string>;
  is_saved?: boolean;
  collection_name?: string;
  user_notes?: string;
}

export interface SupplierItem {
  id: number;
  name: string;
  country: string;
  website: string;
  categories: string;
  shipping_regions: string;
  delivery_estimate: string;
  moq: string;
  return_policy: string;
  contact_email: string;
  integration_type: 'api_available' | 'manual_workflow';
  verification_status: 'verified' | 'manually_reviewed' | 'unverified';
  pricing_tier: string;
  connection_status?: string | null;
  connection_notes?: string | null;
  last_synced_at?: string | null;
}

export interface StoreItem {
  id: number;
  platform: string;
  shop_domain: string;
  store_name: string;
  status: 'connected' | 'awaiting_oauth_config' | 'disconnected';
  last_synced_at: string;
}

export interface ImportedProductItem {
  id: number;
  store_id: number;
  product_id: number | null;
  title: string;
  description: string;
  price: number;
  sync_status: 'draft' | 'confirmed_synced' | 'error';
  updated_at: string;
}

export interface MarketingAsset {
  id: number;
  tool_type: string;
  title: string;
  content: string;
  status: 'draft' | 'approved';
  folder: string;
  created_at: string;
}

export interface FinancialRecord {
  id: number;
  record_type: 'actual_revenue' | 'actual_expense' | 'projection';
  category: string;
  description: string;
  amount: number;
  currency: string;
  record_date: string;
}

export interface TaskItem {
  id: number;
  phase: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  completed: number;
  dismissed: number;
  is_ai_suggested: number;
}

export interface ExpertProfile {
  id: number;
  name: string;
  category: string;
  bio: string;
  skills: string;
  hourly_rate: number;
  availability: string;
  approved: number;
  verified_reviews_count: number;
  rating: number;
}

export interface ExpertRequest {
  id: number;
  expert_id: number | null;
  expert_name?: string;
  category: string;
  title: string;
  description: string;
  budget: string;
  status: 'submitted' | 'quoted' | 'scope_approved' | 'in_progress' | 'completed';
  quote_amount: number | null;
  expert_reply: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_review' | 'resolved';
  admin_reply: string;
  created_at: string;
}
