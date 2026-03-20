"use client"

import { useEffect } from 'react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  categoryName: string
  taskCount: number
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDeleteModal({ isOpen, categoryName, taskCount, onClose, onConfirm }: ConfirmDeleteModalProps) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-5 animate-[fadeIn_0.15s_ease]"
      style={{ background: 'rgba(26,24,20,.45)', backdropFilter: 'blur(6px)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="bg-lf-surface rounded-[18px] w-full max-w-[380px] border border-lf-border animate-lf-scale-in"
        style={{ boxShadow: 'var(--lf-shadow-lg)' }}
      >
        <div className="text-center px-7 pt-7 pb-5">
          <div className="text-[40px] mb-3">{'\uD83D\uDDD1\uFE0F'}</div>
          <div className="font-serif text-[1.2rem] mb-2 text-lf-text-1">Supprimer la categorie ?</div>
          <div className="text-[13px] text-lf-text-2 leading-[1.5]">
            {`La categorie "${categoryName}" et ses ${taskCount} tache${taskCount !== 1 ? 's' : ''} seront supprimees definitivement.`}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-lf-border flex justify-center gap-2">
          <button
            onClick={onClose}
            className="py-[7px] px-3.5 rounded-lg font-sans text-[12.5px] font-medium cursor-pointer bg-transparent text-lf-text-2 border-[1.5px] border-lf-border hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="py-[7px] px-3.5 rounded-lg font-sans text-[12.5px] font-medium cursor-pointer bg-lf-red-bg text-lf-red border-[1.5px] border-lf-red hover:bg-lf-red hover:text-white lf-transition"
          >
            Supprimer definitivement
          </button>
        </div>
      </div>
    </div>
  )
}
