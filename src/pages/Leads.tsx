import { useEffect, useState } from 'react'
import { supabase, type Lead, type Rep } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Plus, X, ArrowRight } from 'lucide-react'

type Stage = Lead['stage']

const STAGES: { value: Stage; label: string }[] = [
  { value: 'cold', label: 'Cold Lead' },
  { value: 'sampled', label: 'Sampled' },
  { value: 'first_order', label: 'First Order' },
  { value: 'repeat', label: 'Repeat' },
]

const STAGE_VARIANTS = {
  cold: 'gray',
  sampled: 'blue',
  first_order: 'yellow',
  repeat: 'green',
} as const

type EmptyForm = {
  store_name: string
  contact_name: string
  contact_phone: string
  address: string
  stage: Stage
  notes: string
  assigned_rep_id: string
}

const emptyForm: EmptyForm = {
  store_name: '',
  contact_name: '',
  contact_phone: '',
  address: '',
  stage: 'cold',
  notes: '',
  assigned_rep_id: '',
}

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<EmptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [l, r] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('reps').select('*').order('name'),
    ])
    setLeads(l.data ?? [])
    setReps(r.data ?? [])
  }

  useEffect(() => { load() }, [])

  const advanceStage = async (lead: Lead) => {
    const idx = STAGES.findIndex(s => s.value === lead.stage)
    if (idx >= STAGES.length - 1) return
    const nextStage = STAGES[idx + 1].value
    await supabase.from('leads').update({ stage: nextStage }).eq('id', lead.id)
    setLeads(leads.map(l => l.id === lead.id ? { ...l, stage: nextStage } : l))
  }

  const saveLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('leads').insert({
      ...form,
      assigned_rep_id: form.assigned_rep_id || null,
    })
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm)
    await load()
  }

  const repName = (id: string | null) => reps.find(r => r.id === id)?.name ?? '—'

  // Group by stage
  const byStage = STAGES.reduce<Record<Stage, Lead[]>>((acc, s) => {
    acc[s.value] = leads.filter(l => l.stage === s.value)
    return acc
  }, {} as Record<Stage, Lead[]>)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Lead Pipeline</h1>
          <p className="text-white/40 text-sm mt-1">{leads.length} leads in pipeline</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add lead
        </Button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAGES.map(stage => (
          <div key={stage.value}>
            <div className="flex items-center justify-between mb-3">
              <Badge variant={STAGE_VARIANTS[stage.value]}>{stage.label}</Badge>
              <span className="text-xs text-white/30">{byStage[stage.value].length}</span>
            </div>
            <div className="space-y-2">
              {byStage[stage.value].map(lead => (
                <GlassCard key={lead.id} className="p-3 hover:bg-white/[0.07] transition-colors cursor-default">
                  <p className="text-sm font-medium text-white/80 leading-tight">{lead.store_name}</p>
                  {lead.contact_name && <p className="text-xs text-white/40 mt-0.5">{lead.contact_name}</p>}
                  {lead.contact_phone && <p className="text-xs text-white/30">{lead.contact_phone}</p>}
                  {lead.assigned_rep_id && (
                    <p className="text-xs text-white/25 mt-1">→ {repName(lead.assigned_rep_id)}</p>
                  )}
                  {lead.notes && <p className="text-xs text-white/30 mt-1 line-clamp-2">{lead.notes}</p>}
                  {stage.value !== 'repeat' && (
                    <button
                      onClick={() => advanceStage(lead)}
                      className="mt-2 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Advance <ArrowRight size={11} />
                    </button>
                  )}
                </GlassCard>
              ))}
              {byStage[stage.value].length === 0 && (
                <div className="p-3 rounded-xl border border-dashed border-white/[0.08] text-center">
                  <p className="text-xs text-white/20">Empty</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <GlassCard className="relative w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">Add Lead</h2>
              <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
            </div>
            <form onSubmit={saveLead} className="space-y-4">
              {[
                { label: 'Store name', key: 'store_name', type: 'text', required: true },
                { label: 'Contact name', key: 'contact_name', type: 'text', required: false },
                { label: 'Contact phone', key: 'contact_phone', type: 'tel', required: false },
                { label: 'Address', key: 'address', type: 'text', required: false },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={String(form[key as keyof EmptyForm])}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Stage</label>
                <select
                  value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value as Stage }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                >
                  {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Assigned rep</label>
                <select
                  value={form.assigned_rep_id}
                  onChange={e => setForm(f => ({ ...f, assigned_rep_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                >
                  <option value="">Unassigned</option>
                  {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
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
                <Button type="submit" variant="primary" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add lead'}</Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
