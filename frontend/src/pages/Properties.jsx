import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useBrands } from '../contexts/BrandContext'
import { useGeneration } from '../contexts/GenerationContext'
import { useToast } from '../contexts/ToastContext'
import { apiFetch } from '../utils/apiFetch'

// ── Asset type icons ──────────────────────────────────────────────────────────
const ASSET_ICONS = {
  hotel: '🏨', clinic: '🏥', building: '🏢', office: '🏢',
  warehouse: '🏭', logistics: '🏭', resort: '🏖️', pharmacy: '💊',
  gym: '🏋️', fitness: '🏋️', parking: '🅿️', student: '🎓',
  senior: '🏡', retail: '🛍️', residential: '🏠', mixed: '🏢',
  land: '🏗️', industrial: '🏭',
}

const LANGUAGES = [
  { value: 'EN', label: 'English' },
  { value: 'FR', label: 'French' },
  { value: 'NL', label: 'Dutch' },
]

const FIELD_OPTIONS = [
  { key: 'title',       label: 'Property Name',  default: true  },
  { key: 'price',       label: 'Price',           default: true  },
  { key: 'description', label: 'Description',     default: true  },
  { key: 'asset_type',  label: 'Asset Type',      default: true  },
  { key: 'reference',   label: 'Reference Code',  default: false },
  { key: 'agent',       label: 'Responsible Agent',default: false },
  { key: 'sectors',     label: 'Sectors',          default: false },
  { key: 'nda',         label: 'NDA Info',         default: false },
  { key: 'status',      label: 'Status',           default: false },
]

// ── Property card ─────────────────────────────────────────────────────────────
function PropertyCard({ prop, onGenerate, dark }) {
  const icon = ASSET_ICONS[prop.asset_type] || '🏢'
  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = '#C8A96E'}
    onMouseLeave={e => e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#C8A96E' }}>
            {prop.asset_label || prop.asset_type}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: dark ? '#fff' : '#0D1F3C', lineHeight: 1.3, marginTop: 2 }}>
            {prop.title || 'Unnamed Property'}
          </div>
        </div>
        {/* Status badge */}
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
          background: prop.status === 'Sale' ? 'rgba(22,163,74,0.1)' : prop.status === 'Reserved' ? 'rgba(180,83,9,0.1)' : 'rgba(0,0,0,0.06)',
          color: prop.status === 'Sale' ? '#16a34a' : prop.status === 'Reserved' ? '#b45309' : '#666',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>{prop.status || 'Sale'}</span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
        {prop.price && <span style={{ fontWeight: 600, color: '#08316F' }}>{prop.price}</span>}
        {prop.reference && <span>Ref: {prop.reference}</span>}
        {prop.agent && <span>{prop.agent}</span>}
      </div>

      {prop.description && (
        <div style={{
          fontSize: 12, lineHeight: 1.6, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{prop.description}</div>
      )}

      {/* Generate button */}
      <button onClick={() => onGenerate(prop)} style={{
        marginTop: 'auto', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
        border: '1px solid rgba(200,169,110,0.4)', background: 'rgba(200,169,110,0.08)',
        color: '#C8A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.target.style.background = 'rgba(200,169,110,0.18)' }}
      onMouseLeave={e => { e.target.style.background = 'rgba(200,169,110,0.08)' }}
      >Generate Teaser</button>
    </div>
  )
}

// ── Generate modal ────────────────────────────────────────────────────────────
function GenerateModal({ prop, brands, onClose, onGenerate, dark }) {
  const [selectedFields, setSelectedFields] = useState(
    FIELD_OPTIONS.filter(f => f.default).map(f => f.key)
  )
  const [brand, setBrand] = useState(brands[0]?.id || 'rodschinson')
  const [language, setLanguage] = useState('EN')
  const [loading, setLoading] = useState(false)

  const toggle = (key) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleGenerate = async () => {
    setLoading(true)
    await onGenerate({ prop, selectedFields, brand, language })
    setLoading(false)
    onClose()
  }

  const bg = dark ? '#1a1a1a' : '#fff'
  const border = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const text = dark ? '#fff' : '#0D1F3C'
  const muted = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: bg, borderRadius: 16, padding: 28, maxWidth: 520, width: '90%',
        border: `1px solid ${border}`, maxHeight: '85vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 28 }}>{ASSET_ICONS[prop.asset_type] || '🏢'}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: text }}>{prop.title}</div>
            <div style={{ fontSize: 12, color: '#C8A96E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {prop.asset_label || prop.asset_type} — Generate Teaser
            </div>
          </div>
        </div>

        {/* Field selection */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: muted, marginBottom: 10 }}>
            Select fields to include
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {FIELD_OPTIONS.map(f => (
              <label key={f.key} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 6, cursor: 'pointer', fontSize: 13,
                background: selectedFields.includes(f.key) ? 'rgba(200,169,110,0.1)' : 'transparent',
                border: `1px solid ${selectedFields.includes(f.key) ? 'rgba(200,169,110,0.3)' : border}`,
                color: text, transition: 'all 0.15s',
              }}>
                <input
                  type="checkbox"
                  checked={selectedFields.includes(f.key)}
                  onChange={() => toggle(f.key)}
                  style={{ accentColor: '#C8A96E' }}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        {/* Brand + Language */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: muted, marginBottom: 6 }}>Brand</div>
            <select value={brand} onChange={e => setBrand(e.target.value)} style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 13,
              border: `1px solid ${border}`, background: bg, color: text,
            }}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: muted, marginBottom: 6 }}>Language</div>
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 13,
              border: `1px solid ${border}`, background: bg, color: text,
            }}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8, border: `1px solid ${border}`,
            background: 'transparent', color: muted, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleGenerate} disabled={loading || selectedFields.length === 0} style={{
            padding: '9px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: loading ? 'rgba(200,169,110,0.3)' : 'linear-gradient(135deg,#08316F,#0a4a9a)',
            color: '#fff', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
            opacity: selectedFields.length === 0 ? 0.4 : 1,
          }}>
            {loading ? 'Generating...' : 'Generate Teaser'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Properties() {
  const { dark } = useTheme()
  const { brands } = useBrands()
  const { trackJob } = useGeneration()
  const { toast } = useToast()

  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [modalProp, setModalProp] = useState(null)

  // Load cached properties
  const loadProperties = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/properties')
      if (res.ok) {
        setProperties(await res.json())
      } else {
        setProperties([])
      }
    } catch {
      setError('Could not load properties')
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProperties() }, [loadProperties])

  // Sync from Odoo
  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await apiFetch('/api/odoo/sync-properties', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Sync failed (${res.status})`)
      }
      const data = await res.json()
      setProperties(data.properties || [])
      toast(`Synced ${data.synced} properties from Odoo`, 'success')
    } catch (e) {
      setError(e.message)
      toast(e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  // Generate teaser
  const handleGenerate = async ({ prop, selectedFields, brand, language }) => {
    try {
      const payload = {
        subject: prop.title || 'Property Teaser',
        brand,
        language,
        contentType: 'property_teaser',
        template: prop.template || 'teaser_building',
        platforms: ['email', 'linkedin'],
        property_data: prop,
        selected_fields: selectedFields,
      }
      const fd = new FormData()
      fd.append('payload', JSON.stringify(payload))
      const res = await apiFetch('/api/generate', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Generation failed')
      }
      const { job_id } = await res.json()
      trackJob(job_id, { title: prop.title, contentType: 'property_teaser' })
      toast('Teaser generation started', 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // Filtered list
  const assetTypes = [...new Set(properties.map(p => p.asset_type).filter(Boolean))]
  const filtered = properties.filter(p => {
    if (typeFilter !== 'all' && p.asset_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (p.title || '').toLowerCase().includes(q) ||
             (p.reference || '').toLowerCase().includes(q) ||
             (p.description || '').toLowerCase().includes(q) ||
             (p.agent || '').toLowerCase().includes(q)
    }
    return true
  })

  const bg = dark ? '#0e0e0e' : '#fafaf8'
  const cardBg = dark ? 'rgba(255,255,255,0.03)' : '#fff'
  const text = dark ? '#fff' : '#0D1F3C'
  const muted = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: text, margin: 0 }}>Properties</h1>
          <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>
            {properties.length} properties from Odoo — generate PDF teasers
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing} style={{
          padding: '9px 20px', borderRadius: 8, cursor: syncing ? 'wait' : 'pointer',
          border: '1px solid rgba(0,182,255,0.3)', background: 'rgba(0,182,255,0.08)',
          color: '#00B6FF', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {syncing ? (
            <>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(0,182,255,0.3)', borderTopColor: '#00B6FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              Syncing...
            </>
          ) : '🔄 Sync from Odoo'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search properties..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`,
            background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
            color: text, fontSize: 13, width: 240, outline: 'none',
          }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}`,
            background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
            color: text, fontSize: 13,
          }}
        >
          <option value="all">All Types</option>
          {assetTypes.map(t => (
            <option key={t} value={t}>{ASSET_ICONS[t] || '🏢'} {t}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: muted }}>{filtered.length} shown</span>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
          color: '#dc2626', fontSize: 13,
        }}>{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: muted }}>
          <span style={{ width: 28, height: 28, border: '3px solid rgba(0,182,255,0.2)', borderTopColor: '#00B6FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          <div style={{ marginTop: 12, fontSize: 13 }}>Loading properties...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && properties.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          border: `2px dashed ${border}`, borderRadius: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: text, marginBottom: 8 }}>No properties yet</div>
          <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
            Sync properties from your Odoo CRM to get started
          </div>
          <button onClick={handleSync} disabled={syncing} style={{
            padding: '10px 24px', borderRadius: 8, cursor: 'pointer',
            border: 'none', background: 'linear-gradient(135deg,#08316F,#0a4a9a)',
            color: '#fff', fontSize: 14, fontWeight: 600,
          }}>
            🔄 Sync from Odoo
          </button>
        </div>
      )}

      {/* Cards grid */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(prop => (
            <PropertyCard
              key={prop.odoo_id}
              prop={prop}
              dark={dark}
              onGenerate={() => setModalProp(prop)}
            />
          ))}
        </div>
      )}

      {/* Generate modal */}
      {modalProp && (
        <GenerateModal
          prop={modalProp}
          brands={brands}
          dark={dark}
          onClose={() => setModalProp(null)}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  )
}
