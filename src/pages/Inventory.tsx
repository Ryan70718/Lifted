import { useEffect, useState } from 'react'
import { supabase, type InventoryBatch, type Order, type Store } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { AlertTriangle, Plus, X } from 'lucide-react'

const BATCH_CODE = 'VP20260331'
const BATCH_EXPIRES = '2027-03-31'
const MIN_ORDER = 60

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function SellThroughBar({ delivered, sold, days }: { delivered: number; sold: number; days: number }) {
  const pct = delivered > 0 ? Math.min(100, (sold / delivered) * 100) : 0
  const pace = days > 0 ? (sold / days) * 90 : 0 // projected 90-day units
  const color = pct >= 80 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444'

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/50">{sold}/{delivered} units · {days}d</span>
        <span className="font-medium" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs text-white/25 mt-1">Proj. {pace.toFixed(0)} units / 90d (target 60–90)</p>
    </div>
  )
}

type OrderForm = {
  store_id: string
  sku: string
  units: number
  price_per_unit: number
  order_date: string
}

const emptyOrderForm: OrderForm = {
  store_id: '',
  sku: 'VP20260331',
  units: 60,
  price_per_unit: 32.50,
  order_date: new Date().toISOString().split('T')[0],
}

export function Inventory() {
  const [batches, setBatches] = useState<InventoryBatch[]>([])
  const [orders, setOrders] = useState<(Order & { store?: Store })[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrderForm)
  const [orderError, setOrderError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [b, o, s] = await Promise.all([
      supabase.from('inventory_batches').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*, stores(*)').order('order_date', { ascending: false }).limit(50),
      supabase.from('stores').select('*').order('name'),
    ])
    setBatches(b.data ?? [])
    setOrders((o.data ?? []) as (Order & { store?: Store })[])
    setStores((s.data ?? []) as Store[])
  }

  useEffect(() => { load() }, [])

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setOrderError('')
    if (orderForm.units < MIN_ORDER) {
      setOrderError(`Minimum order is ${MIN_ORDER} units for new store orders.`)
      return
    }
    setSaving(true)
    const { error } = await supabase.from('orders').insert({
      ...orderForm,
      batch_id: BATCH_CODE,
      units_sold: 0,
      sell_through_days: null,
      rep_id: null,
    })
    if (error) setOrderError(error.message)
    else {
      setShowOrderModal(false)
      setOrderForm(emptyOrderForm)
      await load()
    }
    setSaving(false)
  }

  const daysLeft = daysUntil(BATCH_EXPIRES)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Inventory & Sell-Through</h1>
          <p className="text-white/40 text-sm mt-1">Batch tracking and per-store progress</p>
        </div>
        <Button variant="primary" onClick={() => setShowOrderModal(true)}>
          <Plus size={14} /> New order
        </Button>
      </div>

      {/* Batch expiration */}
      <GlassCard className={`p-4 mb-6 flex items-center gap-3 ${daysLeft < 90 ? 'border-red-500/20' : 'border-yellow-500/20'}`}>
        <AlertTriangle size={16} className={daysLeft < 90 ? 'text-red-400' : 'text-yellow-400'} />
        <div>
          <p className="text-sm font-medium text-white/80">Current batch: {BATCH_CODE}</p>
          <p className="text-xs text-white/40">Expires March 2027 · {daysLeft} days remaining</p>
        </div>
        <Badge variant={daysLeft < 90 ? 'red' : 'yellow'} className="ml-auto">{daysLeft}d left</Badge>
      </GlassCard>

      {/* Batch inventory */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {batches.map(batch => {
          const allocated = batch.units_allocated ?? 0
          const remaining = batch.total_units - allocated
          return (
            <GlassCard key={batch.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white text-sm">{batch.batch_code}</p>
                  <p className="text-xs text-white/40">{batch.name}</p>
                </div>
                <Badge variant={daysUntil(batch.expires_at) < 90 ? 'red' : 'yellow'}>
                  Exp {new Date(batch.expires_at).toLocaleDateString()}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Total / Allocated / Remaining</span>
                  <span className="text-white/70">{batch.total_units} / {allocated} / {remaining}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${batch.total_units ? (allocated / batch.total_units) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </GlassCard>
          )
        })}
        {batches.length === 0 && (
          <GlassCard className="p-5 col-span-2">
            <p className="text-white/30 text-sm">No batches recorded yet.</p>
          </GlassCard>
        )}
      </div>

      {/* Per-store sell-through */}
      <h2 className="text-base font-semibold text-white mb-4">Per-Store Sell-Through</h2>
      <div className="space-y-3">
        {orders.map(order => (
          <GlassCard key={order.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-white text-sm">{(order as { store?: { name?: string } }).store?.name ?? 'Unknown store'}</p>
                <p className="text-xs text-white/40">{order.sku} · Ordered {new Date(order.order_date).toLocaleDateString()}</p>
              </div>
              <Badge variant={order.sell_through_days && order.sell_through_days < 45 ? 'green' : 'gray'}>
                {order.sell_through_days ? `${order.sell_through_days}d sell-through` : 'In progress'}
              </Badge>
            </div>
            <SellThroughBar
              delivered={order.units}
              sold={order.units_sold}
              days={order.sell_through_days ?? Math.floor((Date.now() - new Date(order.order_date).getTime()) / 86400000)}
            />
          </GlassCard>
        ))}
        {orders.length === 0 && (
          <GlassCard className="p-6 text-center">
            <p className="text-white/30 text-sm">No orders yet. Create an order to track sell-through.</p>
          </GlassCard>
        )}
      </div>

      {/* New order modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOrderModal(false)} />
          <GlassCard className="relative w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">New Order</h2>
              <button onClick={() => setShowOrderModal(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
            </div>
            <form onSubmit={submitOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Store</label>
                <select
                  value={orderForm.store_id}
                  onChange={e => setOrderForm(f => ({ ...f, store_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                >
                  <option value="">Select store…</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Units (min {MIN_ORDER})</label>
                <input
                  type="number"
                  min={MIN_ORDER}
                  value={orderForm.units}
                  onChange={e => setOrderForm(f => ({ ...f, units: Number(e.target.value) }))}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Price per unit</label>
                <div className="flex gap-2">
                  {[32.50, 30.00].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setOrderForm(f => ({ ...f, price_per_unit: p }))}
                      className={`flex-1 py-2 rounded-xl text-sm transition-colors ${orderForm.price_per_unit === p ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/30' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'}`}
                    >
                      ${p.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Order date</label>
                <input
                  type="date"
                  value={orderForm.order_date}
                  onChange={e => setOrderForm(f => ({ ...f, order_date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                />
              </div>
              {orderError && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{orderError}</p>}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowOrderModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Create order'}</Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
