import { useState } from 'react'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'

const LIST_PRICE = 32.5
const FLOOR_PRICE = 30
const VELOCITY_BONUS = 75

type Tier = 'list' | 'floor'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function CalcResult({ units, tier, rate, hasBonus, storeCount }: {
  units: number; tier: Tier; rate: number; hasBonus: boolean; storeCount: number
}) {
  const price = tier === 'list' ? LIST_PRICE : FLOOR_PRICE
  const gross = units * price
  const baseComm = gross * (rate / 100)
  const bonusTotal = hasBonus ? storeCount * VELOCITY_BONUS : 0
  const totalComm = baseComm + bonusTotal
  const net = gross - totalComm
  const margin = gross > 0 ? (net / gross) * 100 : 0

  return (
    <GlassCard className="p-5 space-y-3">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Results</h3>
      {[
        ['Units', units.toLocaleString()],
        ['Price / unit', `${fmt(price)} (${tier})`],
        ['Gross revenue', fmt(gross)],
        ['Commission (base)', fmt(baseComm)],
        ...(hasBonus ? [['Velocity bonuses', `${fmt(bonusTotal)} (${storeCount} stores × $${VELOCITY_BONUS})`]] : []),
        ['Total commission', fmt(totalComm)],
        ['Net revenue', fmt(net)],
        ['Net margin', `${margin.toFixed(1)}%`],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between border-b border-white/[0.05] pb-2 last:border-0">
          <span className="text-xs text-white/50">{k}</span>
          <span className="text-xs font-medium text-white/80">{v}</span>
        </div>
      ))}
      <div className="pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Margin health:</span>
          <Badge variant={margin >= 60 ? 'green' : margin >= 45 ? 'yellow' : 'red'}>
            {margin >= 60 ? 'Healthy' : margin >= 45 ? 'Fair' : 'Tight'}
          </Badge>
        </div>
      </div>
    </GlassCard>
  )
}

export function Calculator() {
  const [units, setUnits] = useState(120)
  const [tier, setTier] = useState<Tier>('list')
  const [rate, setRate] = useState(10)
  const [hasBonus, setHasBonus] = useState(false)
  const [storeCount, setStoreCount] = useState(1)
  const [whatIf, setWhatIf] = useState(false)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Cost Calculator</h1>
        <p className="text-white/40 text-sm mt-1">Model gross revenue, commission cost, and net margin</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="p-5 space-y-5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Inputs</h3>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">Units sold</label>
            <input
              type="number"
              min={0}
              value={units}
              onChange={e => setUnits(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">Pricing tier</label>
            <div className="flex gap-2">
              {(['list', 'floor'] as Tier[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${tier === t ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/30' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'}`}
                >
                  {t === 'list' ? 'List $32.50' : 'Floor $30.00'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">Commission rate: {rate}%</label>
            <input
              type="range"
              min={5}
              max={25}
              step={0.5}
              value={rate}
              onChange={e => setRate(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-white/25 mt-1">
              <span>5%</span><span>25%</span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBonus}
                onChange={e => setHasBonus(e.target.checked)}
                className="rounded accent-indigo-500"
              />
              <span className="text-sm text-white/70">Velocity bonus eligible (&lt;45 days sell-through)</span>
            </label>
            {hasBonus && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-white/50 mb-1.5">Qualifying stores</label>
                <input
                  type="number"
                  min={1}
                  value={storeCount}
                  onChange={e => setStoreCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm"
                />
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/[0.06]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={whatIf}
                onChange={e => setWhatIf(e.target.checked)}
                className="rounded accent-indigo-500"
              />
              <span className="text-sm text-white/70">What-if: compare both tiers</span>
            </label>
          </div>
        </GlassCard>

        <div className="space-y-4">
          {whatIf ? (
            <>
              <div>
                <p className="text-xs text-white/40 mb-2">List pricing ($32.50)</p>
                <CalcResult units={units} tier="list" rate={rate} hasBonus={hasBonus} storeCount={storeCount} />
              </div>
              <div>
                <p className="text-xs text-white/40 mb-2">Floor pricing ($30.00)</p>
                <CalcResult units={units} tier="floor" rate={rate} hasBonus={hasBonus} storeCount={storeCount} />
              </div>
            </>
          ) : (
            <CalcResult units={units} tier={tier} rate={rate} hasBonus={hasBonus} storeCount={storeCount} />
          )}
        </div>
      </div>
    </div>
  )
}
