import { useEffect, useState } from 'react'
import { supabase, type Rep, type ActivityLog } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Plus, Phone, Trophy, X, ChevronDown, ChevronUp, Search } from 'lucide-react'

type RepForm = Omit<Rep, 'id' | 'created_at' | 'user_id'>

const emptyForm: RepForm = {
  name: '',
  territory: '',
  phone: '',
  payment_type: 'commission',
  commission_rate: 10,
  start_date: new Date().toISOString().split('T')[0],
}

function RepModal({ rep, onClose, onSave }: { rep?: Rep; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState<RepForm>(rep ? { ...rep } : emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    if (rep) {
      await supabase.from('reps').update(form).eq('id', rep.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('reps').insert({ ...form, user_id: user?.id ?? null })
      if (error) {
        setSaveError(error.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className="relative w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">{rep ? 'Edit Rep' : 'Add Rep'}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Name', key: 'name', type: 'text' },
            { label: 'Territory', key: 'territory', type: 'text' },
            { label: 'Phone', key: 'phone', type: 'tel' },
            { label: 'Start date', key: 'start_date', type: 'date' },
            { label: 'Commission rate (%)', key: 'commission_rate', type: 'number' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
              <input
                type={type}
                value={String((form as Record<string, unknown>)[key] ?? '')}
                onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Payment type</label>
            <select
              value={form.payment_type}
              onChange={e => setForm(f => ({ ...f, payment_type: e.target.value as Rep['payment_type'] }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm focus:outline-none"
            >
              <option value="commission">Commission only</option>
              <option value="salary">Salary</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          {saveError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}

function ActivityPanel({ repId, repName }: { repId: string; repName: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [form, setForm] = useState({ type: 'visit' as ActivityLog['type'], notes: '', store_id: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('activity_logs').select('*').eq('rep_id', repId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { setLogs(data ?? []); setLoading(false) })
  }, [repId])

  const addLog = async () => {
    if (!form.notes) return
    const { data } = await supabase.from('activity_logs').insert({ rep_id: repId, ...form }).select().single()
    if (data) setLogs(l => [data, ...l])
    setForm(f => ({ ...f, notes: '' }))
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      <h3 className="text-xs font-semibold text-white/50 mb-3">{repName} — Activity Log</h3>
      <div className="flex gap-2 mb-4">
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value as ActivityLog['type'] }))}
          className="px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs"
        >
          {['visit', 'sample', 'call', 'email', 'event'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Notes…"
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs placeholder-white/25 focus:outline-none"
        />
        <Button size="sm" variant="primary" onClick={addLog}>Log</Button>
      </div>
      {loading ? <p className="text-xs text-white/30">Loading…</p> : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {logs.length === 0 ? <p className="text-xs text-white/30">No activity yet</p> : logs.map(l => (
            <div key={l.id} className="flex items-start gap-2 text-xs">
              <Badge variant="gray">{l.type}</Badge>
              <span className="text-white/60 flex-1">{l.notes}</span>
              <span className="text-white/25 shrink-0">{new Date(l.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Reps() {
  const [reps, setReps] = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRep, setEditRep] = useState<Rep | undefined>()
  const [expandedRep, setExpandedRep] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    const { data } = await supabase.from('reps').select('*').order('name')
    setReps(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const q = search.toLowerCase()
  const visible = reps.filter(r =>
    !q || r.name.toLowerCase().includes(q) || r.territory.toLowerCase().includes(q)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sales Reps</h1>
          <p className="text-white/40 text-sm mt-1">{visible.length} reps</p>
        </div>
        <Button variant="primary" onClick={() => { setEditRep(undefined); setShowModal(true) }}>
          <Plus size={14} /> Add rep
        </Button>
      </div>

      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or territory…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-colors"
        />
      </div>

      {loading ? <div className="text-white/30 text-sm">Loading…</div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {visible.map(rep => (
            <GlassCard key={rep.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white">{rep.name}</h3>
                    <Badge variant="indigo">{rep.payment_type}</Badge>
                  </div>
                  <p className="text-xs text-white/40">{rep.territory}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-white/30">
                    <Phone size={11} /> {rep.phone}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-yellow-400 text-xs">
                    <Trophy size={12} />
                    <span>{rep.commission_rate}%</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setEditRep(rep); setShowModal(true) }}>Edit</Button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <p className="text-xs text-white/30">
                  Since {new Date(rep.start_date).toLocaleDateString()}
                </p>
                <button
                  onClick={() => setExpandedRep(expandedRep === rep.id ? null : rep.id)}
                  className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
                >
                  Activity {expandedRep === rep.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {expandedRep === rep.id && <ActivityPanel repId={rep.id} repName={rep.name} />}
            </GlassCard>
          ))}
          {visible.length === 0 && (
            <GlassCard className="p-8 text-center col-span-2">
              <p className="text-white/30 text-sm">
                {reps.length === 0 ? 'No reps yet. Add your first rep to get started.' : 'No reps match your search.'}
              </p>
            </GlassCard>
          )}
        </div>
      )}

      {showModal && (
        <RepModal
          rep={editRep}
          onClose={() => setShowModal(false)}
          onSave={load}
        />
      )}
    </div>
  )
}
