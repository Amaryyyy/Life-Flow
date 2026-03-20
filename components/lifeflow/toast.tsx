"use client"

interface ToastProps {
  visible: boolean
  message: string
  icon: string
}

export function Toast({ visible, message, icon }: ToastProps) {
  return (
    <div
      className={`fixed bottom-7 left-1/2 bg-lf-text-1 text-lf-surface px-5 py-2.5 rounded-full text-[13px] font-medium z-[8888] whitespace-nowrap flex items-center gap-2 pointer-events-none lf-transition ${
        visible
          ? 'opacity-100 -translate-x-1/2 translate-y-0'
          : 'opacity-0 -translate-x-1/2 translate-y-5'
      }`}
      style={{ transition: 'all 0.3s cubic-bezier(.4,0,.2,1)' }}
    >
      <span>{icon}</span> {message}
    </div>
  )
}
