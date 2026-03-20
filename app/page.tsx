"use client"

import dynamic from 'next/dynamic'

const LifeFlowApp = dynamic(() => import('@/components/lifeflow/lifeflow-app'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--lf-bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--lf-border2)', borderTopColor: 'transparent' }}
        />
        <p className="text-[13px] font-medium" style={{ color: 'var(--lf-text-2)' }}>Chargement...</p>
      </div>
    </div>
  ),
})

export default function Page() {
  return <LifeFlowApp />
}
