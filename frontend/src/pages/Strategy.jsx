import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useBrands } from '../contexts/BrandContext'
import { apiFetch } from '../utils/apiFetch'

// ─── Constants ────────────────────────────────────────────────────────────────
const GOALS     = ['leads', 'awareness', 'authority', 'engagement', 'sales', 'retention']
const PLATFORMS = ['linkedin', 'instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'bluesky']
const PILLAR_COLORS = {
  Educational: '#00B6FF', Authority: '#C8A96E',
  Storytelling: '#a78bfa', Promotional: '#34d399',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Tag({ label, color, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: color + '18', border: `1px solid ${color}40`, color,
    }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, lineHeight: 1, fontSize: 13 }}>×</button>
      )}
    </span>
  )
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ color: 'var(--cs-text)', fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>{children}</h2>
      {sub && <p style={{ color: 'var(--cs-text-muted)', fontSize: 12, margin: '4px 0 0' }}>{sub}</p>}
    </div>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--cs-surface)', border: '1px solid var(--cs-border)',
      borderRadius: 12, padding: '20px 22px', ...style,
    }}>{children}</div>
  )
}

// ─── Content Mix Donut ────────────────────────────────────────────────────────
function MixBar({ pillars, warnings }) {
  if (!pillars) return null
  const entries = Object.entries(pillars)
  return (
    <div>
      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 14, gap: 2 }}>
        {entries.map(([name, data]) => (
          <div key={name} title={`${name}: ${data.pct}%`} style={{
            width: `${data.pct}%`, background: PILLAR_COLORS[name] || '#888',
            transition: 'width 0.5s ease', minWidth: data.pct > 0 ? 2 : 0,
          }} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: warnings?.length ? 14 : 0 }}>
        {entries.map(([name, data]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PILLAR_COLORS[name] || '#888', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--cs-text-sub)', flex: 1 }}>{name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cs-text)', fontVariantNumeric: 'tabular-nums' }}>
              {data.pct}%
              {Math.abs(data.pct - data.target) > 15 && (
                <span style={{ marginLeft: 4, color: '#f87171', fontSize: 10 }}>⚠</span>
              )}
            </span>
          </div>
        ))}
      </div>
      {warnings?.map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 7, padding: '7px 10px', background: 'rgba(248,113,113,0.07)', borderRadius: 7, border: '1px solid rgba(248,113,113,0.2)', marginTop: 6 }}>
          <span style={{ fontSize: 12 }}>⚠️</span>
          <span style={{ fontSize: 11, color: '#f87171' }}>{w}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Strategy Generator Form ──────────────────────────────────────────────────
function StrategyForm({ brands, onGenerated }) {
  const [form, setForm] = useState({
    brand: brands[0]?.id || '',
    industry: '',
    audience: '',
    goals: [],
    platforms: [],
    duration_days: 30,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const toggleArr = (key, val) => setForm(f => ({
    ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
  }))

  const generate = async () => {
    if (!form.industry || !form.audience || !form.goals.length || !form.platforms.length)
      return setError('Fill in industry, audience, at least one goal and one platform')
    setLoading(true); setError('')
    try {
      const res = await apiFetch('/api/strategy/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed') }
      onGenerated(await res.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inp = { background: 'var(--cs-input-bg)', border: '1px solid var(--cs-border)', borderRadius: 7, padding: '9px 12px', color: 'var(--cs-text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <Card>
      <SectionTitle sub="Describe your brand's goals and audience — AI builds the full strategy">Strategy Generator</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Brand + duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Brand</label>
            <select value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} style={inp}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Duration</label>
            <select value={form.duration_days} onChange={e => setForm(f => ({...f, duration_days: parseInt(e.target.value)}))} style={inp}>
              {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
        </div>

        {/* Industry */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Industry *</label>
          <input value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))} placeholder="e.g. Commercial Real Estate, SaaS, Finance…" style={inp} />
        </div>

        {/* Audience */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Target audience *</label>
          <input value={form.audience} onChange={e => setForm(f => ({...f, audience: e.target.value}))} placeholder="e.g. HNW investors, startup founders, CFOs…" style={inp} />
        </div>

        {/* Goals */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Goals *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {GOALS.map(g => {
              const active = form.goals.includes(g)
              return (
                <button key={g} onClick={() => toggleArr('goals', g)} style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
                  border: `1px solid ${active ? '#00B6FF60' : 'var(--cs-border)'}`,
                  background: active ? 'rgba(0,182,255,0.1)' : 'transparent',
                  color: active ? '#00B6FF' : 'var(--cs-text-sub)', transition: 'all 0.12s',
                }}>{g}</button>
              )
            })}
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Platforms *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {PLATFORMS.map(p => {
              const active = form.platforms.includes(p)
              return (
                <button key={p} onClick={() => toggleArr('platforms', p)} style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
                  border: `1px solid ${active ? '#C8A96E60' : 'var(--cs-border)'}`,
                  background: active ? 'rgba(200,169,110,0.1)' : 'transparent',
                  color: active ? '#C8A96E' : 'var(--cs-text-sub)', transition: 'all 0.12s',
                }}>{p}</button>
              )
            })}
          </div>
        </div>

        {error && <div style={{ color: '#f87171', fontSize: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 7 }}>{error}</div>}

        <button onClick={generate} disabled={loading} style={{
          padding: '10px 20px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: loading ? 'var(--cs-hover)' : 'linear-gradient(135deg, #0a5cbf, #00B6FF)',
          color: loading ? 'var(--cs-text-muted)' : '#fff',
          fontSize: 13, fontWeight: 600, transition: 'opacity 0.15s', opacity: loading ? 0.7 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading ? '⚡ Generating strategy…' : '✨ Generate Content Strategy'}
        </button>
      </div>
    </Card>
  )
}

// ─── Strategy Result ──────────────────────────────────────────────────────────
function StrategyResult({ strategy, onCalendarFill }) {
  const s = strategy.strategy
  const [filling, setFilling] = useState(false)
  const [filled, setFilled]   = useState(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10))

  const fillCalendar = async () => {
    setFilling(true)
    try {
      const res = await apiFetch('/api/strategy/calendar-fill', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy_id: strategy.id, start_date: startDate }),
      })
      const data = await res.json()
      setFilled(data.created)
      onCalendarFill && onCalendarFill(data)
    } catch { }
    finally { setFilling(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ color: '#00B6FF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Strategy Ready</div>
            <div style={{ color: 'var(--cs-text)', fontSize: 14, fontWeight: 600 }}>{strategy.duration_days}-Day Plan · {strategy.industry}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ background: 'var(--cs-input-bg)', border: '1px solid var(--cs-border)', borderRadius: 6, padding: '6px 10px', color: 'var(--cs-text)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={fillCalendar} disabled={filling || !!filled} style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: (filling || filled) ? 'not-allowed' : 'pointer',
              background: filled ? 'rgba(34,197,94,0.12)' : filling ? 'var(--cs-hover)' : 'linear-gradient(135deg,#08316F,#00B6FF)',
              color: filled ? '#22c55e' : filling ? 'var(--cs-text-muted)' : '#fff',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              {filled ? `✓ ${filled} posts added` : filling ? 'Filling…' : '📅 Fill my calendar'}
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--cs-text-sub)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{s.summary}</p>
      </Card>

      {/* Content pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <SectionTitle sub="Recommended content distribution">Content Mix</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s.content_pillars?.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cs-text)' }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: PILLAR_COLORS[p.name] || '#888' }}>{p.percentage}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--cs-border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.percentage}%`, background: PILLAR_COLORS[p.name] || '#888', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--cs-text-muted)', marginTop: 3 }}>{p.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Platform mix */}
        <Card>
          <SectionTitle sub="Posting frequency & timing">Platform Mix</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s.platform_mix?.map(p => (
              <div key={p.platform} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--cs-surface2)', borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--cs-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#00B6FF', flexShrink: 0, textTransform: 'uppercase' }}>
                  {p.platform.slice(0,2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cs-text)', textTransform: 'capitalize' }}>{p.platform}</div>
                  <div style={{ fontSize: 10, color: 'var(--cs-text-muted)' }}>{p.content_types?.join(', ')}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#00B6FF' }}>{p.posts_per_week}×</div>
                  <div style={{ fontSize: 10, color: 'var(--cs-text-muted)' }}>/ week</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Weekly themes */}
      <Card>
        <SectionTitle sub="Theme and topics for each week">Weekly Themes</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {s.weekly_themes?.map(w => (
            <div key={w.week} style={{ padding: '12px 14px', background: 'var(--cs-surface2)', borderRadius: 8, border: '1px solid var(--cs-border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#00B6FF', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>Week {w.week}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cs-text)', marginBottom: 8 }}>{w.theme}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {w.topics?.map((t, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--cs-text-sub)', display: 'flex', gap: 5 }}>
                    <span style={{ color: '#C8A96E' }}>→</span> {t}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* KPIs */}
      {s.kpis?.length > 0 && (
        <Card>
          <SectionTitle>KPIs to Track</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {s.kpis.map((kpi, i) => (
              <div key={i} style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.3)', color: '#C8A96E', fontSize: 12 }}>
                {kpi}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Content Mix Dashboard ────────────────────────────────────────────────────
function ContentMixPanel({ brands }) {
  const [brandId, setBrandId]   = useState('all')
  const [mix, setMix]           = useState(null)
  const [loading, setLoading]   = useState(false)

  const load = async (id) => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/strategy/content-mix/${id}`)
      if (res.ok) setMix(await res.json())
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { load(brandId) }, [brandId])

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SectionTitle sub="Current library distribution">Content Mix Intelligence</SectionTitle>
        <select value={brandId} onChange={e => { setBrandId(e.target.value); load(e.target.value) }}
          style={{ background: 'var(--cs-input-bg)', border: '1px solid var(--cs-border)', borderRadius: 6, padding: '5px 10px', color: 'var(--cs-text)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="all">All brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      {loading ? (
        <div style={{ height: 80, background: 'var(--cs-hover)', borderRadius: 8, animation: 'pulse 1.5s ease infinite' }} />
      ) : mix ? (
        <div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total content', value: mix.total, color: '#00B6FF' },
              { label: 'Published', value: mix.by_status?.Published || 0, color: '#22c55e' },
              { label: 'In review', value: (mix.by_status?.Ready || 0) + (mix.by_status?.Approved || 0), color: '#C8A96E' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--cs-text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <MixBar pillars={mix.pillars} warnings={mix.warnings} />
        </div>
      ) : (
        <div style={{ color: 'var(--cs-text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No data available</div>
      )}
    </Card>
  )
}

// ─── Saved Strategies List ────────────────────────────────────────────────────
function SavedStrategies({ strategies, onSelect }) {
  if (!strategies.length) return null
  return (
    <Card>
      <SectionTitle sub="Previously generated strategies">History</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {strategies.map(s => (
          <div key={s.id} onClick={() => onSelect(s)} style={{
            padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
            background: 'var(--cs-surface2)', border: '1px solid var(--cs-border)',
            transition: 'border-color 0.12s',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,182,255,0.3)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--cs-border)'}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cs-text)' }}>{s.industry} · {s.duration_days}d</div>
              <div style={{ fontSize: 11, color: 'var(--cs-text-muted)', marginTop: 2 }}>
                {s.goals?.join(', ')} · {new Date(s.createdAt).toLocaleDateString()}
              </div>
            </div>
            <span style={{ color: '#00B6FF', fontSize: 11 }}>View →</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Strategy() {
  useTheme()
  const { brands } = useBrands()
  const [strategies, setStrategies]   = useState([])
  const [activeStrategy, setActive]   = useState(null)
  const [tab, setTab]                 = useState('generate') // 'generate' | 'mix'

  const loadStrategies = useCallback(async () => {
    // Strategies are returned inside the generated record — just keep in local state for now
  }, [])

  useEffect(() => { loadStrategies() }, [loadStrategies])

  const onGenerated = (record) => {
    setStrategies(prev => [record, ...prev])
    setActive(record)
    setTab('generate')
  }

  return (
    <div style={{ maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--cs-text)', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Content Strategy
        </h1>
        <p style={{ color: 'var(--cs-text-muted)', fontSize: 13, margin: 0 }}>
          AI-powered 30-day plans, content mix analysis, and calendar automation
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--cs-surface)', border: '1px solid var(--cs-border)', borderRadius: 9, padding: 3, marginBottom: 22, width: 'fit-content' }}>
        {[['generate','✨ Strategy Generator'],['mix','📊 Content Mix']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === id ? 600 : 400,
            background: tab === id ? 'rgba(0,182,255,0.12)' : 'transparent',
            color: tab === id ? '#00B6FF' : 'var(--cs-text-sub)', transition: 'all 0.12s',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'generate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!activeStrategy ? (
            <>
              <StrategyForm brands={brands.length ? brands : [{id:'default',name:'My Brand'}]} onGenerated={onGenerated} />
              <SavedStrategies strategies={strategies} onSelect={setActive} />
            </>
          ) : (
            <>
              <button onClick={() => setActive(null)} style={{
                background: 'none', border: '1px solid var(--cs-border)', borderRadius: 7,
                padding: '6px 14px', cursor: 'pointer', color: 'var(--cs-text-sub)', fontSize: 12,
                width: 'fit-content', display: 'flex', alignItems: 'center', gap: 5,
              }}>← New strategy</button>
              <StrategyResult strategy={activeStrategy} onCalendarFill={() => {}} />
            </>
          )}
        </div>
      )}

      {tab === 'mix' && <ContentMixPanel brands={brands} />}
    </div>
  )
}
