import { useEffect, useState } from 'react'
import { supabase, type TimelineItem } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Plus, X } from 'lucide-react'

const CATEGORIES = [
  { value: 'new_door', label: 'New Door', color: 'green' },
  { value: 'damage_control', label: 'Damage Control', color: 'red' },
  { value: 'rep_onboarding', label: 'Rep Onboarding', color: 'blue' },
  { value: 'batch_launch', label: 'Batch Launch', color: 'purple' },
] as const

const STATUSES = [
  { value: 'todo', label: 'To Do', variant: 'gray' },
  { value: 'in_progress', label: 'In Progress', variant: 'indigo' },
  { value: 'done', label: 'Done', variant: 'green' },
  { value: 'blocked', label: 'Blocked', variant: 'red' },
] as const

type Category = typeof CATEGORIES[number]['value']
type Status = typeof STATUSES[number]['value']
type BadgeVariant = 'gray' | 'indigo' | 'green' | 'red' | 'blue' | 'purple' | 'yellow' | 'orange'

function statusVariant(s: Status): BadgeVariant {
  const map: Record<Status, BadgeVariant> = { todo: 'gray', in_progress: 'indigo', done: 'green', blocked: 'red' }
  return map[s]
}

function categoryColor(c: Category): BadgeVariant {
  const map: Record<Category, BadgeVariant> = {
    new_door: 'green', damage_control: 'red', rep_onboarding: 'blue', batch_launch: 'purple'
  }
  return map[c]
}

type ItemForm = {
  title: string
  category: Category
  status: Status
  target_date: string
  week_number: number
  notes: string
}

const emptyForm: ItemForm = {
  title: '',
  category: 'new_door',
  status: 'todo',
  target_date: new Date().toISOString().split('T')[0],
  week_number: 1,
  notes: '',
}

export function Timeline() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<ItemForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')

  const load = async () => {
    const { data } = await supabase.from('timeline_items').select('*').order('week_number').order('target_date')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory)

  // Group by week
  const byWeek = filtered.reduce<Record<number, TimelineItem[]>>((acc, item) => {
    const w = item.week_number || 1
    acc[w] = [...(acc[w] ?? []), item]
    return acc
  }, {})

  const updateStatus = async (id: string, status: Status) => {
    await supabase.from('timeline_items').update({ status }).eq('id', id)
    setItems(items.map(i => i.id === id ? { ...i, status } : i))
  }

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('timeline_items').insert({ ...form, actual_date: null, assignee_id: null })
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">90-Day Timeline</h1>
          <p className="text-white/40 text-sm mt-1">Track milestones by week</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add item
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${activeCategory === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setActiveCategory(c.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${activeCategory === c.value ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-white/30 text-sm">Loading…</p> : (
        <div className="space-y-6">
          {Object.entries(byWeek).sort(([a], [b]) => Number(a) - Number(b)).map(([week, weekItems]) => (
            <div key={week}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wider">Week {week}</div>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-xs text-white/20">{weekItems.length} items</span>
              </div>
              <div className="space-y-2">
                {weekItems.map(item => (
                  <GlassCard key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-medium ${item.status === 'done' ? 'line-through text-white/30' : 'text-white/80'}`}>
                            {item.title}
                          </p>
                          <Badge variant={categoryColor(item.category as Category)}>
                            {CATEGORIES.find(c => c.value === item.category)?.label}
                          </Badge>
                        </div>
                        {item.notes && <p className="text-xs text-white/40">{item.notes}</p>}
                        <p className="text-xs text-white/25 mt-1">Target: {new Date(item.target_date).toLocaleDateString()}</p>
                      </div>
                      <select
                        value={item.status}
                        onChange={e => updateStatus(item.id, e.target.value as Status)}
                        className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white"
                      >
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <GlassCard className="p-8 text-center">
              <p className="text-white/30 text-sm">No items yet. Add your first 90-day milestone.</p>
            </GlassCard>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <GlassCard className="relative w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">Add Timeline Item</h2>
              <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
            </div>
            <form onSubmit={saveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Week #</label>
                  <input
                    type="number"
                    min={1}
                    max={13}
                    value={form.week_number}
                    onChange={e => setForm(f => ({ ...f, week_number: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Target date</label>
                <input
                  type="date"
                  value={form.target_date}
                  onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add item'}</Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
