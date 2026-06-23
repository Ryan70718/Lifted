import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase, type Store, type Rep } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge, statusBadgeVariant, creditVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Search, Plus, X } from 'lucide-react'

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

type StoreFormData = {
  name: string; license_number: string; address: string; city: string
  region: Store['region'] | ''; status: Store['status']
  contact_name: string; contact_phone: string; contact_email: string
  pricing_tier: Store['pricing_tier']; credit_rating: string; credit_notes: string
}

const emptyStoreForm: StoreFormData = {
  name: '', license_number: '', address: '', city: '', region: '', status: 'prospect',
  contact_name: '', contact_phone: '', contact_email: '',
  pricing_tier: 'list', credit_rating: '', credit_notes: '',
}

async function nominatimGeocode(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, ${city}`)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`)
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

function StoreModal({ onClose, onSave }: { onClose: () => void; onSave: (s: Store) => void }) {
  const [form, setForm] = useState<StoreFormData>(emptyStoreForm)
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeFailed, setGeocodeFailed] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const set = (k: keyof StoreFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const inp = 'w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-indigo-500/60 transition-colors'
  const sel = 'w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm focus:outline-none'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)

    let lat: number | null = null
    let lng: number | null = null

    if (geocodeFailed) {
      lat = manualLat.trim() ? parseFloat(manualLat) : null
      lng = manualLng.trim() ? parseFloat(manualLng) : null
    } else {
      setGeocoding(true)
      const coords = await nominatimGeocode(form.address, form.city)
      setGeocoding(false)
      if (!coords) { setGeocodeFailed(true); return }
      lat = coords.lat
      lng = coords.lng
    }

    setSaving(true)
    const { data, error } = await supabase.from('stores').insert({
      name: form.name,
      license_number: form.license_number || null,
      address: form.address,
      city: form.city,
      region: form.region as Store['region'],
      status: form.status,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email,
      pricing_tier: form.pricing_tier,
      credit_rating: form.credit_rating ? Number(form.credit_rating) : null,
      credit_notes: form.credit_notes,
      lat, lng,
      units_on_hand: 0,
      needs_damage_control: false,
      assigned_rep_id: null,
    }).select().single()
    setSaving(false)

    if (error) { setSaveError(error.message); return }
    onSave(data as Store)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className="relative w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-base font-semibold text-white">Add Store</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={16} /></button>
        </div>
        <form id="store-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Name *</label>
            <input type="text" value={form.name} onChange={set('name')} required className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">License #</label>
              <input type="text" value={form.license_number} onChange={set('license_number')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Status</label>
              <select value={form.status} onChange={set('status')} className={sel}>
                <option value="prospect">Prospect</option>
                <option value="sampled">Sampled</option>
                <option value="active">Active</option>
                <option value="damage_control">Damage Control</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Address *</label>
            <input type="text" value={form.address} onChange={set('address')} required className={inp} placeholder="123 Main St" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">City *</label>
            <input type="text" value={form.city} onChange={set('city')} required className={inp} placeholder="Brooklyn, NY 11201" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Region *</label>
              <select value={form.region} onChange={set('region')} required className={sel}>
                <option value="">Select region…</option>
                <option value="long_island">Long Island</option>
                <option value="five_boroughs">Five Boroughs</option>
                <option value="rockland_orange">Rockland / Orange</option>
                <option value="westchester">Westchester</option>
                <option value="upstate">Upstate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Pricing tier</label>
              <select value={form.pricing_tier} onChange={set('pricing_tier')} className={sel}>
                <option value="list">List — $32.50</option>
                <option value="floor">Floor — $30.00</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Contact name</label>
            <input type="text" value={form.contact_name} onChange={set('contact_name')} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Contact phone</label>
              <input type="tel" value={form.contact_phone} onChange={set('contact_phone')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Contact email</label>
              <input type="email" value={form.contact_email} onChange={set('contact_email')} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Credit rating</label>
            <select value={form.credit_rating} onChange={set('credit_rating')} className={sel}>
              <option value="">Not rated</option>
              <option value="1">1 — Poor</option>
              <option value="2">2 — Weak</option>
              <option value="3">3 — Fair</option>
              <option value="4">4 — Good</option>
              <option value="5">5 — Excellent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Credit notes</label>
            <textarea value={form.credit_notes} onChange={set('credit_notes')} rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-indigo-500/60 transition-colors resize-none" />
          </div>
          {geocodeFailed && (
            <div className="rounded-xl bg-yellow-500/[0.08] border border-yellow-500/20 p-3 space-y-3">
              <p className="text-xs text-yellow-400">Could not geocode this address. Enter coordinates manually, or leave blank to save without a map pin.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Latitude</label>
                  <input type="number" step="any" value={manualLat} onChange={e => setManualLat(e.target.value)} className={inp} placeholder="40.7128" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Longitude</label>
                  <input type="number" step="any" value={manualLng} onChange={e => setManualLng(e.target.value)} className={inp} placeholder="-74.0060" />
                </div>
              </div>
            </div>
          )}
          {saveError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="h-2" />
        </form>
        <div className="flex gap-2 p-6 pt-4 shrink-0 border-t border-white/[0.06]">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" form="store-form" variant="primary" disabled={saving || geocoding} className="flex-1">
            {geocoding ? 'Geocoding…' : saving ? 'Saving…' : geocodeFailed ? 'Save without pin' : 'Save'}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}

export function DispensaryMap() {
  const [stores, setStores] = useState<Store[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [colorMode, setColorMode] = useState<ColorMode>('status')
  const [filterRegion, setFilterRegion] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Store | null>(null)
  const [showAddStore, setShowAddStore] = useState(false)
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

  const q = search.toLowerCase()
  const filtered = stores
    .filter(s => !filterRegion || s.region === filterRegion)
    .filter(s => !q || s.name.toLowerCase().includes(q))

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
          <Button variant="primary" onClick={() => setShowAddStore(true)}>
            <Plus size={14} /> Add store
          </Button>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stores…"
              className="pl-7 pr-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xs placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-colors w-44"
            />
          </div>
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

      {showAddStore && (
        <StoreModal
          onClose={() => setShowAddStore(false)}
          onSave={s => setStores(prev => [...prev, s])}
        />
      )}
    </div>
  )
}
