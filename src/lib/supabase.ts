import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Rep = {
  id: string
  name: string
  territory: string
  phone: string
  payment_type: 'commission' | 'salary' | 'hybrid'
  commission_rate: number
  start_date: string
  user_id: string | null
  created_at: string
}

export type Store = {
  id: string
  name: string
  license_number: string
  address: string
  city: string
  region: 'long_island' | 'five_boroughs' | 'rockland_orange' | 'westchester' | 'upstate'
  lat: number
  lng: number
  contact_name: string
  contact_phone: string
  contact_email: string
  status: 'prospect' | 'sampled' | 'active' | 'damage_control'
  credit_rating: 1 | 2 | 3 | 4 | 5 | null
  credit_notes: string
  pricing_tier: 'list' | 'floor'
  assigned_rep_id: string | null
  last_order_date: string | null
  next_reorder_date: string | null
  units_on_hand: number
  needs_damage_control: boolean
  created_at: string
}

export type Order = {
  id: string
  store_id: string
  rep_id: string
  sku: string
  batch_id: string
  units: number
  price_per_unit: number
  order_date: string
  delivered_date: string | null
  units_sold: number
  sell_through_days: number | null
  created_at: string
}

export type InventoryBatch = {
  id: string
  batch_code: string
  sku: string
  name: string
  total_units: number
  units_allocated: number
  expires_at: string
  created_at: string
}

export type Commission = {
  id: string
  rep_id: string
  order_id: string
  base_amount: number
  velocity_bonus: number
  total: number
  paid: boolean
  period: string
  created_at: string
}

export type TimelineItem = {
  id: string
  title: string
  category: 'new_door' | 'damage_control' | 'rep_onboarding' | 'batch_launch'
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  target_date: string
  actual_date: string | null
  week_number: number
  assignee_id: string | null
  notes: string
  created_at: string
}

export type QRIncident = {
  id: string
  store_id: string
  reported_date: string
  description: string
  remediation_status: 'pending' | 'revisit_scheduled' | 'resolved'
  resolved_date: string | null
  notes: string
  created_at: string
}

export type Lead = {
  id: string
  store_name: string
  contact_name: string
  contact_phone: string
  address: string
  stage: 'cold' | 'sampled' | 'first_order' | 'repeat'
  assigned_rep_id: string | null
  notes: string
  created_at: string
}

export type ActivityLog = {
  id: string
  rep_id: string
  store_id: string | null
  type: 'visit' | 'sample' | 'call' | 'email' | 'event'
  notes: string
  created_at: string
}

export type Route = {
  id: string
  rep_id: string
  date: string
  region: string
  store_ids: string[]
  created_at: string
}
