import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, TrendingUp, Package, Store, Users, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Stats = {
  activeAccounts: number
  unitsSoldThisMonth: number
  netMarginThisMonth: number
  batchExpiresAt: string
  storesNeedingReorder: number
  storesOverdueVisit: number
}

type ChartPoint = { month: string; revenue: number; margin: number }

const BATCH_EXPIRES = '2027-03-31'
const BATCH_CODE = 'VP20260331'

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  accent?: boolean
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${accent ? 'bg-indigo-500/20' : 'bg-white/[0.06]'}`}>
          <Icon size={16} className={accent ? 'text-indigo-400' : 'text-white/50'} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/50 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </GlassCard>
  )
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    activeAccounts: 0,
    unitsSoldThisMonth: 0,
    netMarginThisMonth: 0,
    batchExpiresAt: BATCH_EXPIRES,
    storesNeedingReorder: 0,
    storesOverdueVisit: 0,
  })
  const [topReps, setTopReps] = useState<{ name: string; bonus: number; units: number }[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()

      const [storesRes, ordersRes, repsRes] = await Promise.all([
        supabase.from('stores').select('id, status, next_reorder_date, last_order_date'),
        supabase.from('orders').select('units, price_per_unit, rep_id, order_date').gte('order_date', twelveMonthsAgo),
        supabase.from('reps').select('id, name'),
      ])

      const stores = storesRes.data ?? []
      const orders = ordersRes.data ?? []
      const reps = repsRes.data ?? []

      const thisMonthOrders = orders.filter(o => o.order_date >= monthStart)
      const activeAccounts = stores.filter(s => s.status === 'active').length
      const unitsSoldThisMonth = thisMonthOrders.reduce((sum, o) => sum + (o.units || 0), 0)
      const grossRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.units * o.price_per_unit), 0)
      const netMarginThisMonth = grossRevenue * 0.62 // approx after commissions

      // Build monthly chart data from all 12 months of orders
      const byMonth: Record<string, { revenue: number; margin: number }> = {}
      orders.forEach(o => {
        const key = o.order_date.slice(0, 7)
        if (!byMonth[key]) byMonth[key] = { revenue: 0, margin: 0 }
        const rev = o.units * o.price_per_unit
        byMonth[key].revenue += rev
        byMonth[key].margin += rev * 0.62
      })
      setChartData(
        Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, v]) => ({
            month: new Date(key + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            revenue: Math.round(v.revenue),
            margin: Math.round(v.margin),
          }))
      )

      const today = new Date()
      const storesNeedingReorder = stores.filter(s => {
        if (!s.next_reorder_date) return false
        return new Date(s.next_reorder_date) <= new Date(today.getTime() + 7 * 86400000)
      }).length

      const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000).toISOString()
      const storesOverdueVisit = stores.filter(s => {
        if (!s.last_order_date) return true
        return s.last_order_date < thirtyDaysAgo
      }).length

      // Aggregate units by rep (this month only)
      const repUnits: Record<string, number> = {}
      thisMonthOrders.forEach(o => {
        repUnits[o.rep_id] = (repUnits[o.rep_id] || 0) + o.units
      })
      const sortedReps = reps
        .map(r => ({ name: r.name, units: repUnits[r.id] || 0, bonus: Math.floor((repUnits[r.id] || 0) / 60) * 75 }))
        .sort((a, b) => b.bonus - a.bonus)
        .slice(0, 5)

      setStats({ activeAccounts, unitsSoldThisMonth, netMarginThisMonth, batchExpiresAt: BATCH_EXPIRES, storesNeedingReorder, storesOverdueVisit })
      setTopReps(sortedReps)
      setLoading(false)
    }
    load()
  }, [])

  const daysLeft = daysUntil(BATCH_EXPIRES)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Sales operations overview</p>
      </div>

      {loading ? (
        <div className="text-white/30 text-sm">Loading…</div>
      ) : (
        <>
          {/* Batch expiration alert */}
          <GlassCard className="p-4 mb-6 border-yellow-500/20 bg-yellow-500/[0.04] flex items-center gap-3">
            <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white/80">Batch {BATCH_CODE} expires in {daysLeft} days</p>
              <p className="text-xs text-white/40">March 2027 — ensure sell-through before expiration</p>
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StatCard icon={Store} label="Active accounts" value={stats.activeAccounts} accent />
            <StatCard icon={Package} label="Units sold this month" value={stats.unitsSoldThisMonth} />
            <StatCard icon={TrendingUp} label="Est. net margin" value={`$${stats.netMarginThisMonth.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} sub="After commissions" />
            <StatCard icon={Clock} label="Stores due reorder" value={stats.storesNeedingReorder} sub="Within 7 days" />
            <StatCard icon={AlertTriangle} label="Overdue visits" value={stats.storesOverdueVisit} sub="30+ days since contact" />
            <StatCard icon={Package} label="Batch expires" value={`${daysLeft}d`} sub={BATCH_CODE} />
          </div>

          <GlassCard className="p-5 mb-4">
            <h2 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
              <TrendingUp size={14} />
              Revenue &amp; Margin — Last 12 Months
            </h2>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-white/25 text-xs">No order data yet — chart will populate once orders are entered</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,15,25,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                  <Bar dataKey="revenue" name="Gross Revenue" fill="rgba(99,102,241,0.7)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="margin" name="Net Margin" fill="rgba(34,197,94,0.6)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          <div className="grid md:grid-cols-2 gap-4">
            <GlassCard className="p-5">
              <h2 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                <Users size={14} />
                Top Reps — Velocity Bonus
              </h2>
              {topReps.length === 0 ? (
                <p className="text-white/30 text-xs">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {topReps.map((r, i) => (
                    <div key={r.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-white/20 text-xs w-4">#{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-white/80">{r.name}</p>
                          <p className="text-xs text-white/30">{r.units} units</p>
                        </div>
                      </div>
                      <Badge variant={r.bonus > 0 ? 'green' : 'gray'}>${r.bonus} bonus</Badge>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <h2 className="text-sm font-semibold text-white/80 mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-xs text-white/50">Pricing: List</span>
                  <span className="text-xs font-medium text-white/70">$32.50 / unit</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-xs text-white/50">Pricing: Floor</span>
                  <span className="text-xs font-medium text-white/70">$30.00 / unit</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-xs text-white/50">Min order (new store)</span>
                  <span className="text-xs font-medium text-white/70">60 units</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-xs text-white/50">Velocity bonus threshold</span>
                  <span className="text-xs font-medium text-white/70">&lt;45 days → +$75</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-white/50">Sell-through benchmark</span>
                  <span className="text-xs font-medium text-white/70">60–90 days</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  )
}
