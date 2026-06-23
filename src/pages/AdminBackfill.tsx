import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { CheckCircle, XCircle } from 'lucide-react'

type ResultRow = {
  id: string
  name: string
  address: string
  city: string
  state: 'pending' | 'running' | 'done' | 'failed'
  lat?: number
  lng?: number
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

export function AdminBackfill() {
  const [rows, setRows] = useState<ResultRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('stores').select('id, name, address, city').is('lat', null)
    setRows((data ?? []).map(s => ({ ...s, state: 'pending' as const })))
    setLoaded(true)
  }

  const run = async () => {
    setRunning(true)
    const list = rows
    for (let i = 0; i < list.length; i++) {
      const r = list[i]
      setRows(prev => prev.map(s => s.id === r.id ? { ...s, state: 'running' } : s))
      if (i > 0) await new Promise(res => setTimeout(res, 1100))
      const coords = await nominatimGeocode(r.address, r.city)
      if (coords) {
        await supabase.from('stores').update({ lat: coords.lat, lng: coords.lng }).eq('id', r.id)
        setRows(prev => prev.map(s => s.id === r.id ? { ...s, state: 'done', ...coords } : s))
      } else {
        setRows(prev => prev.map(s => s.id === r.id ? { ...s, state: 'failed' } : s))
      }
    }
    setRunning(false)
    setFinished(true)
  }

  const doneCount = rows.filter(r => r.state === 'done').length
  const failedCount = rows.filter(r => r.state === 'failed').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Backfill Store Coordinates</h1>
        <p className="text-white/40 text-sm mt-1">One-time geocode of stores missing lat/lng via OpenStreetMap Nominatim</p>
      </div>

      {!loaded ? (
        <GlassCard className="p-6 max-w-lg">
          <p className="text-sm text-white/60 mb-4">
            Finds all stores with null lat/lng and geocodes them one-by-one at max 1 req/sec (Nominatim usage policy).
            Each successful match is written back to the database immediately.
          </p>
          <Button variant="primary" onClick={load}>Load stores without coordinates</Button>
        </GlassCard>
      ) : rows.length === 0 ? (
        <GlassCard className="p-6 max-w-lg">
          <p className="text-sm text-green-400">All stores already have coordinates — nothing to backfill.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4 max-w-2xl">
          <GlassCard className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 font-medium">{rows.length} stores without coordinates</p>
              {finished && (
                <p className="text-xs text-white/40 mt-0.5">{doneCount} geocoded · {failedCount} failed</p>
              )}
              {running && (
                <p className="text-xs text-white/40 mt-0.5">
                  ~{Math.ceil(rows.length * 1.1)}s total — processing…
                </p>
              )}
            </div>
            {!finished && (
              <Button variant="primary" onClick={run} disabled={running}>
                {running ? 'Running…' : 'Start Backfill'}
              </Button>
            )}
            {finished && <span className="text-sm text-green-400 font-medium">Done</span>}
          </GlassCard>

          <div className="space-y-1.5">
            {rows.map(r => (
              <GlassCard key={r.id} className="p-3 flex items-center gap-3">
                <div className="shrink-0 w-4 flex items-center justify-center">
                  {r.state === 'pending' && <div className="w-2 h-2 rounded-full bg-white/20" />}
                  {r.state === 'running' && (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
                  )}
                  {r.state === 'done' && <CheckCircle size={14} className="text-green-400" />}
                  {r.state === 'failed' && <XCircle size={14} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium truncate">{r.name}</p>
                  <p className="text-xs text-white/35 truncate">{r.address}, {r.city}</p>
                </div>
                <div className="text-xs shrink-0 text-right">
                  {r.state === 'done' && r.lat !== undefined && (
                    <span className="text-green-400">{r.lat.toFixed(4)}, {r.lng?.toFixed(4)}</span>
                  )}
                  {r.state === 'failed' && <span className="text-red-400/70">no match</span>}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
