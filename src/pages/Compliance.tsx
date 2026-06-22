import { useEffect, useState } from 'react'
import { supabase, type QRIncident, type Store } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Plus, X, AlertOctagon, FileText } from 'lucide-react'

type IncidentStatus = 'pending' | 'revisit_scheduled' | 'resolved'

const STATUS_LABELS: Record<IncidentStatus, string> = {
  pending: 'Pending',
  revisit_scheduled: 'Revisit Scheduled',
  resolved: 'Resolved',
}

const STATUS_VARIANTS = {
  pending: 'red',
  revisit_scheduled: 'yellow',
  resolved: 'green',
} as const

export function Compliance() {
  const [incidents, setIncidents] = useState<(QRIncident & { store?: Store })[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    store_id: '',
    description: '',
    notes: '',
    reported_date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [inc, s] = await Promise.all([
      supabase.from('qr_incidents').select('*, stores(*)').order('reported_date', { ascending: false }),
      supabase.from('stores').select('*').order('name'),
    ])
    setIncidents((inc.data ?? []) as (QRIncident & { store?: Store })[])
    setStores((s.data ?? []) as Store[])
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: IncidentStatus) => {
    const update: Partial<QRIncident> = { remediation_status: status }
    if (status === 'resolved') update.resolved_date = new Date().toISOString()
    await supabase.from('qr_incidents').update(update).eq('id', id)
    setIncidents(incidents.map(i => i.id === id ? { ...i, ...update } : i))
  }

  const saveIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('qr_incidents').insert({ ...form, remediation_status: 'pending', resolved_date: null })
    setSaving(false)
    setShowModal(false)
    setForm({ store_id: '', description: '', notes: '', reported_date: new Date().toISOString().split('T')[0] })
    await load()
  }

  const pending = incidents.filter(i => i.remediation_status !== 'resolved').length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Compliance</h1>
          <p className="text-white/40 text-sm mt-1">QR incidents & compliance documents</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Log incident
        </Button>
      </div>

      {pending > 0 && (
        <GlassCard className="p-4 mb-6 flex items-center gap-3 border-red-500/20 bg-red-500/[0.04]">
          <AlertOctagon size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-white/70">{pending} open QR code incident{pending > 1 ? 's' : ''} require attention</p>
        </GlassCard>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white/70">Compliance Documents</h2>
          </div>
          <div className="space-y-2 text-xs text-white/50">
            {[
              'OCM Cannabis License',
              'Trademark Registration — LIFTED EXTRACTS®',
              'COA (Certificate of Analysis) — VP20260331',
              'METRC Transfer Manifests',
              'Per-store compliance notes',
            ].map(doc => (
              <div key={doc} className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <span>{doc}</span>
                <Badge variant="gray">Stored</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/25 mt-4">Document upload coming soon — attach PDFs to each store record.</p>
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold text-white/70 mb-4">QR Incident Summary</h2>
          <div className="space-y-3">
            {Object.entries(STATUS_LABELS).map(([k, label]) => {
              const count = incidents.filter(i => i.remediation_status === k).length
              return (
                <div key={k} className="flex justify-between items-center">
                  <Badge variant={STATUS_VARIANTS[k as IncidentStatus]}>{label}</Badge>
                  <span className="text-sm font-semibold text-white">{count}</span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>

      <h2 className="text-base font-semibold text-white mb-4">QR Code Incidents</h2>
      <div className="space-y-3">
        {incidents.map(inc => (
          <GlassCard key={inc.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white/80">
                    {(inc as { store?: { name?: string } }).store?.name ?? 'Unknown store'}
                  </p>
                  <Badge variant={STATUS_VARIANTS[inc.remediation_status as IncidentStatus]}>
                    {STATUS_LABELS[inc.remediation_status as IncidentStatus]}
                  </Badge>
                </div>
                <p className="text-xs text-white/50">{inc.description}</p>
                {inc.notes && <p className="text-xs text-white/30 mt-1">{inc.notes}</p>}
                <p className="text-xs text-white/25 mt-1">
                  Reported {new Date(inc.reported_date).toLocaleDateString()}
                  {inc.resolved_date && ` · Resolved ${new Date(inc.resolved_date).toLocaleDateString()}`}
                </p>
              </div>
              {inc.remediation_status !== 'resolved' && (
                <select
                  value={inc.remediation_status}
                  onChange={e => updateStatus(inc.id, e.target.value as IncidentStatus)}
                  className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white shrink-0"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              )}
            </div>
          </GlassCard>
        ))}
        {incidents.length === 0 && (
          <GlassCard className="p-8 text-center">
            <p className="text-white/30 text-sm">No incidents logged yet.</p>
          </GlassCard>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <GlassCard className="relative w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">Log QR Incident</h2>
              <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
            </div>
            <form onSubmit={saveIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Store</label>
                <select
                  value={form.store_id}
                  onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                >
                  <option value="">Select store…</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                  placeholder="e.g. QR code on packaging links to wrong URL"
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
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Date reported</label>
                <input
                  type="date"
                  value={form.reported_date}
                  onChange={e => setForm(f => ({ ...f, reported_date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Log incident'}</Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
