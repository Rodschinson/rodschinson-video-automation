/**
 * GenerationContext — global background job tracking.
 * Polling continues even when the user navigates away from NewContent.
 * Jobs are persisted to sessionStorage so they survive route changes.
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const GenerationContext = createContext()

const MAX_JOBS = 6
const POLL_MS  = 2000

function loadPersistedJobs() {
  try { return JSON.parse(sessionStorage.getItem('cs-active-jobs') || '[]') } catch { return [] }
}

function persistJobs(jobs) {
  sessionStorage.setItem('cs-active-jobs', JSON.stringify(jobs))
}

export function GenerationProvider({ children }) {
  const [jobs, setJobs] = useState(loadPersistedJobs)
  const intervalsRef = useRef({})   // job_id → intervalId

  // ── Poll a single job ────────────────────────────────────────────────────────
  const _poll = useCallback((job_id) => {
    if (intervalsRef.current[job_id]) return  // already polling

    intervalsRef.current[job_id] = setInterval(async () => {
      try {
        const res  = await fetch(`/api/jobs/${job_id}`)
        if (!res.ok) throw new Error()
        const data = await res.json()

        setJobs(prev => {
          const updated = prev.map(j =>
            j.job_id === job_id
              ? { ...j, status: data.status, progress: data.progress ?? 0, step: data.step ?? '' }
              : j
          )
          persistJobs(updated)
          return updated
        })

        if (data.status === 'done' || data.status === 'error') {
          clearInterval(intervalsRef.current[job_id])
          delete intervalsRef.current[job_id]
        }
      } catch {
        // Network error — stop polling
        clearInterval(intervalsRef.current[job_id])
        delete intervalsRef.current[job_id]
      }
    }, POLL_MS)
  }, [])

  // Resume polling for any unfinished jobs on mount (after page reload / navigation)
  useEffect(() => {
    jobs.forEach(j => {
      if (j.status === 'pending' || j.status === 'running') {
        _poll(j.job_id)
      }
    })
    return () => Object.values(intervalsRef.current).forEach(clearInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Call this right after /api/generate returns a job_id */
  const trackJob = useCallback((job_id, { title, contentType }) => {
    const newJob = {
      job_id, title, contentType,
      status: 'pending', progress: 0, step: 'Queued',
      startedAt: Date.now(),
      seen: false,      // user has acknowledged this completion
    }
    setJobs(prev => {
      const deduped = prev.filter(j => j.job_id !== job_id)
      const updated = [newJob, ...deduped].slice(0, MAX_JOBS)
      persistJobs(updated)
      return updated
    })
    _poll(job_id)
  }, [_poll])

  /** Mark a completed job as "seen" so the notification badge clears */
  const markSeen = useCallback((job_id) => {
    setJobs(prev => {
      const updated = prev.map(j => j.job_id === job_id ? { ...j, seen: true } : j)
      persistJobs(updated)
      return updated
    })
  }, [])

  const markAllSeen = useCallback(() => {
    setJobs(prev => {
      const updated = prev.map(j => ({ ...j, seen: true }))
      persistJobs(updated)
      return updated
    })
  }, [])

  const clearJob = useCallback((job_id) => {
    clearInterval(intervalsRef.current[job_id])
    delete intervalsRef.current[job_id]
    setJobs(prev => {
      const updated = prev.filter(j => j.job_id !== job_id)
      persistJobs(updated)
      return updated
    })
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeJobs  = jobs.filter(j => j.status === 'pending' || j.status === 'running')
  const doneJobs    = jobs.filter(j => j.status === 'done')
  const unseenDone  = doneJobs.filter(j => !j.seen)
  const hasActive   = activeJobs.length > 0
  const badgeCount  = activeJobs.length + unseenDone.length

  return (
    <GenerationContext.Provider value={{
      jobs, activeJobs, doneJobs, unseenDone,
      hasActive, badgeCount,
      trackJob, markSeen, markAllSeen, clearJob,
    }}>
      {children}
    </GenerationContext.Provider>
  )
}

export const useGeneration = () => useContext(GenerationContext)
