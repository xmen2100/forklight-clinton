import { useEffect, useRef } from 'react'
import { useQuery, useMutations } from 'deepspace'
import { mount } from '../../../forklight/view.mjs'
import { validate } from '../../../forklight/engine.mjs'
import type { Decision, NotebookAdapter, NotebookRow } from '../../../forklight/types'
import '../../../forklight/style.css'

type DecisionRecord = { document: Decision }

// This page lives inside the scaffold's (app)/(protected) boundary.
// Keep its AuthBoot, AuthGate, users schema, JWT handling and worker routes intact.
export default function DecisionsPage() {
  const host = useRef<HTMLDivElement>(null)
  const query = useQuery<DecisionRecord>('decisions', { orderBy: 'updatedAt', orderDir: 'desc' })
  const writes = useMutations<DecisionRecord>('decisions')
  const latest = useRef({ query, writes })
  latest.current = { query, writes }
  const listeners = useRef(new Set<() => void>())
  const cache = useRef<NotebookRow[]>([])

  useEffect(() => {
    cache.current = query.records.map(record => ({ id: record.recordId, document: record.data.document }))
    for (const notify of listeners.current) notify()
  }, [query.records, query.status, query.error, writes.ready])

  useEffect(() => {
    if (!host.current) return
    const adapter: NotebookAdapter = {
      mode: 'Private notebook · DeepSpace',
      get ready() { return latest.current.writes.ready && latest.current.query.status === 'ready' },
      async list() {
        if (latest.current.query.status === 'error') throw new Error(latest.current.query.error || 'Could not load your notebook.')
        return cache.current
      },
      async save(id, document) {
        if (!this.ready) throw new Error('Connection is not ready. Your edits are still here; try again after reconnecting.')
        const errors = validate(document)
        if (errors.length) throw new Error(errors.join(' '))
        if (id) await latest.current.writes.putConfirmed(id, { document })
        else id = await latest.current.writes.createConfirmed({ document })
        // Ack is authoritative. Avoid depending on timing of the React query re-render.
        cache.current = [{ id, document: structuredClone(document) }, ...cache.current.filter(row => row.id !== id)]
        return id
      },
      subscribe(notify) { listeners.current.add(notify); return () => { listeners.current.delete(notify) } },
    }
    const app = mount(host.current, adapter)
    return () => app.destroy()
  }, [])

  return <div ref={host} className="forklight-root" />
}
