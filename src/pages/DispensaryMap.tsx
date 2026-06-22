import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase, type Store, type Rep } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge, statusBadgeVariant, creditVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

type ColorMode = 'status' | 'credit'

const STATUS_COLORS: Record<string, string> = {
  prospect: '#6b7280',
  sampled: '#3b82f6',
  active: '#22c55e',
  damage_control: '#ef4444',
}

const CREDIT_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#3b82f6',
  5: '#3b82f6',
}

const REGIONS = ['', 'long_island', 'five_boroughs', 'rockland_orange', 'westchester', 'upstate'] as const

export function DispensaryMap() {
  const [stores, setStores] = useState<Store[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [colorMode, setColorMode] = useState<ColorMode>('status')
  const [filterRegion, setFilterRegion] = useState('')
  const [selected, setSelected] = useState<Store | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editCredit, setEditCredit] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('stores').select('*').then(({ data }) => setStores(data ?? []))
    supabase.from('reps').select('*').then(({ data }) => setReps(data ?? []))
  }, [])

  useEffect(() => {
    if (selected) {
      setEditNotes(selected.credit_notes ?? '')
      setEditCredit(selected.credit_rating)
    }
  }, [selected])

  const filtered = filterRegion ? stores.filter(s => s.region === filterRegion) : stores

  const markerColor = (s: Store) => {
    if (colorMode === 'status') return STATUS_COLORS[s.status] ?? '#6b7280'
    return s.credit_rating ? CREDIT_COLORS[s.credit_rating] ?? '#6b7280' : '#374151'
  }

  const saveStoreEdits = async () => {
    if (!selected) return
    setSaving(true)
    await supabase.from('stores').update({ credit_notes: editNotes, credit_rating: editCredit }).eq('id', selected.id)
    setStores(stores.map(s => s.id === selected.id ? { ...s, credit_notes: editNotes, credit_rating: editCredit as Store['credit_rating'] } : s))
    setSaving(false)
  }

  const repName = (id: string | null) => reps.find(r => r.id === id)?.name ?? '—'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dispensary Map</h1>
          <p className="text-white/40 text-sm mt-1">{filtered.length} stores</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
            {(['status', 'credit'] as ColorMode[]).map(m => (
              <button
                key={m}
                onClick={() => setColorMode(m)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${colorMode === m ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/[0.04] text-white/40 hover:text-white/60'}`}
              >
                {m === 'status' ? 'Status' : 'Credit Rating'}
              </button>
            ))}
          </div>
          <select
            value={filterRegion}
            onChange={e => setFilterRegion(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xs"
          >
            <option value="">All regions</option>
            {REGIONS.filter(Boolean).map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <GlassCard className="p-3 mb-4 flex flex-wrap gap-4">
        {colorMode === 'status' ? (
          Object.entries(STATUS_COLORS).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-white/50">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              {k.replace(/_/g, ' ')}
            </div>
          ))
        ) : (
          ['Not rated', 'Poor (1)', 'Weak (2)', 'Fair (3)', 'Good (4-5)'].map((l, i) => (
            <div key={l} className="flex items-center gap-1.5 text-xs text-white/50">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? '#374151' : Object.values(CREDIT_COLORS)[i - 1] }} />
              {l}
            </div>
          ))
        )}
      </GlassCard>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl overflow-hidden border border-white/[0.08]" style={{ height: 500 }}>
          <MapContainer
            center={[40.85, -73.95]}
            zoom={10}
            style={{ height: '100%', background: '#0d1117' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {filtered.map(store => (
              store.lat && store.lng ? (
                <CircleMarker
                  key={store.id}
                  center={[store.lat, store.lng]}
                  radius={8}
                  pathOptions={{
                    color: markerColor(store),
                    fillColor: markerColor(store),
                    fillOpacity: 0.8,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => setSelected(store) }}
                >
                  <Popup>
                    <div className="text-xs font-medium">{store.name}</div>
                    <div className="text-xs text-gray-500">{store.city}</div>
                  </Popup>
                </CircleMarker>
              ) : null
            ))}
          </MapContainer>
        </div>

        {/* Store detail panel */}
        <div>
          {selected ? (
            <GlassCard className="p-5 h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white text-sm">{selected.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{selected.address}</p>
                </div>
                <Badge variant={statusBadgeVariant(selected.status)}>{selected.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="space-y-2 text-xs mb-4">
                {[
                  ['License', selected.license_number],
                  ['Region', selected.region?.replace(/_/g, ' ')],
                  ['Contact', `${selected.contact_name} · ${selected.contact_phone}`],
                  ['Pricing tier', selected.pricing_tier === 'list' ? '$32.50 (list)' : '$30.00 (floor)'],
                  ['Units on hand', selected.units_on_hand],
                  ['Last order', selected.last_order_date ?? '—'],
                  ['Next reorder', selected.next_reorder_date ?? '—'],
                  ['Assigned rep', repName(selected.assigned_rep_id)],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-white/40">{k}</span>
                    <span className="text-white/70 text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-white/50 mb-1">Credit rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setEditCredit(editCredit === n ? null : n)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${editCredit === n ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/[0.05] text-white/30 hover:text-white/60'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {editCredit && <Badge variant={creditVariant(editCredit)} className="mt-1">{['', 'Poor', 'Weak', 'Fair', 'Good', 'Excellent'][editCredit]}</Badge>}
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-white/50 mb-1">Credit notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-xs resize-none focus:outline-none"
                />
              </div>
              <Button variant="primary" size="sm" onClick={saveStoreEdits} disabled={saving} className="w-full justify-center">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </GlassCard>
          ) : (
            <GlassCard className="p-5 h-32 flex items-center justify-center">
              <p className="text-white/30 text-xs text-center">Click a pin to view store details</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}
