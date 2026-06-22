import { useEffect, useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase, type Store } from '../lib/supabase'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { GripVertical, AlertTriangle, Clock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const REGIONS = [
  { value: 'long_island', label: 'Long Island' },
  { value: 'five_boroughs', label: '5 Boroughs' },
  { value: 'rockland_orange', label: 'Rockland / Orange' },
  { value: 'westchester', label: 'Westchester' },
  { value: 'upstate', label: 'Upstate' },
]

function SortableStore({ store }: { store: Store }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: store.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const daysAgo = store.last_order_date
    ? Math.floor((Date.now() - new Date(store.last_order_date).getTime()) / 86400000)
    : null

  return (
    <div ref={setNodeRef} style={style} {...attributes}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] group"
    >
      <div {...listeners} className="text-white/20 hover:text-white/50 cursor-grab transition-colors">
        <GripVertical size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80 truncate">{store.name}</p>
        <p className="text-xs text-white/30 truncate">{store.address}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {store.needs_damage_control && (
          <Badge variant="red"><AlertTriangle size={10} className="mr-0.5" /> DC</Badge>
        )}
        {daysAgo !== null && daysAgo > 30 && (
          <Badge variant="yellow"><Clock size={10} className="mr-0.5" /> {daysAgo}d</Badge>
        )}
        <p className="text-xs text-white/30">{daysAgo !== null ? `${daysAgo}d ago` : 'Never'}</p>
      </div>
    </div>
  )
}

export function Routing() {
  const { user, isAdmin } = useAuth()
  const [region, setRegion] = useState('five_boroughs')
  const [damageOnly, setDamageOnly] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [route, setRoute] = useState<Store[]>([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    setLoading(true)
    let query = supabase.from('stores').select('*').eq('region', region)
    if (damageOnly) query = query.eq('needs_damage_control', true)
    query.order('name').then(({ data }) => {
      setStores(data ?? [])
      setLoading(false)
    })
  }, [region, damageOnly])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setRoute(items => {
        const oldIdx = items.findIndex(i => i.id === active.id)
        const newIdx = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIdx, newIdx)
      })
    }
  }

  const addToRoute = (store: Store) => {
    if (!route.find(s => s.id === store.id)) setRoute(r => [...r, store])
  }

  const removeFromRoute = (id: string) => setRoute(r => r.filter(s => s.id !== id))

  const saveRoute = async () => {
    const { data: repData } = await supabase.from('reps').select('id').eq('user_id', user?.id).single()
    const repId = repData?.id ?? null
    await supabase.from('routes').insert({
      rep_id: repId,
      date: new Date().toISOString().split('T')[0],
      region,
      store_ids: route.map(s => s.id),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Route Builder</h1>
        <p className="text-white/40 text-sm mt-1">Drag to set visit order</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm"
        >
          {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] cursor-pointer">
          <input
            type="checkbox"
            checked={damageOnly}
            onChange={e => setDamageOnly(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-white/70">Damage control only</span>
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Store list */}
        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold text-white/70 mb-4">
            {REGIONS.find(r => r.value === region)?.label} stores ({stores.length})
          </h2>
          {loading ? <p className="text-white/30 text-xs">Loading…</p> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stores.map(store => {
                const inRoute = route.some(s => s.id === store.id)
                const daysAgo = store.last_order_date
                  ? Math.floor((Date.now() - new Date(store.last_order_date).getTime()) / 86400000)
                  : null
                return (
                  <div key={store.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{store.name}</p>
                      <p className="text-xs text-white/30">{daysAgo !== null ? `${daysAgo}d since contact` : 'No contact'}</p>
                    </div>
                    <div className="flex gap-1">
                      {store.needs_damage_control && <Badge variant="red">DC</Badge>}
                      {daysAgo !== null && daysAgo > 30 && <Badge variant="yellow">Overdue</Badge>}
                      {!inRoute && (
                        <Button size="sm" variant="ghost" onClick={() => addToRoute(store)}>Add</Button>
                      )}
                      {inRoute && <Badge variant="green">Added</Badge>}
                    </div>
                  </div>
                )
              })}
              {stores.length === 0 && <p className="text-white/30 text-xs">No stores in this region</p>}
            </div>
          )}
        </GlassCard>

        {/* Route order */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/70">Route ({route.length} stops)</h2>
            <div className="flex gap-2">
              {route.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setRoute([])}>Clear</Button>
              )}
              <Button size="sm" variant="primary" onClick={saveRoute} disabled={route.length === 0}>
                {saved ? 'Saved!' : 'Save route'}
              </Button>
            </div>
          </div>
          {route.length === 0 ? (
            <p className="text-white/30 text-xs">Add stores from the left panel</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={route.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {route.map((store, i) => (
                    <div key={store.id} className="flex items-center gap-2">
                      <span className="text-white/20 text-xs w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <SortableStore store={store} />
                      </div>
                      <button onClick={() => removeFromRoute(store.id)} className="text-white/20 hover:text-red-400 text-xs transition-colors">✕</button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
