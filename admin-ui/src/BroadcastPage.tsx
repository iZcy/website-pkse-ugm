import { useEffect, useRef, useState } from 'react'
import { usePeriod } from '../components/AdminLayout'

export default function BroadcastPage() {
  const { period } = usePeriod()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!period) return;
    (window as any).PERIOD = period;
    (window as any).ROLE = 'superadmin';

    async function init() {
      try {
        const r = await fetch('/static/broadcast-body.html')
        const html = await r.text()
        if (containerRef.current) {
          containerRef.current.innerHTML = html
          
          // Load admin-common.js if needed
          if (!document.querySelector('script[src*="admin-common.js"]')) {
            await new Promise<void>(resolve => {
              const s = document.createElement('script')
              s.src = '/static/admin-common.js'
              s.onload = () => resolve()
              document.head.appendChild(s)
            })
          }
          
          const initFn = (window as any).initBroadcast
          if (typeof initFn === 'function') initFn()
        }
      } catch(e) { console.error('Broadcast init failed:', e) }
      setLoading(false)
    }
    init()
  }, [period])

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">WhatsApp Broadcast</h2>
      {loading && <div className="text-slate-400 py-4">Memuat broadcast...</div>}
      <div ref={containerRef} className={loading ? 'hidden' : ''} />
    </div>
  )
}
