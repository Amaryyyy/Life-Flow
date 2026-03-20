"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import type { Category } from '@/lib/types'
import { ACCENT_PRESETS, EMOJI_PRESETS } from '@/lib/types'

interface CategoryModalProps {
  isOpen: boolean
  editingCategory: Category | null
  onClose: () => void
  onSave: (data: Omit<Category, 'id'>) => void
  onDelete: () => void
}

export function CategoryModal({ isOpen, editingCategory, onClose, onSave, onDelete }: CategoryModalProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('\uD83D\uDCCB')
  const [customEmoji, setCustomEmoji] = useState('')
  const [accent, setAccent] = useState('#5B8BE8')
  const [customAccent, setCustomAccent] = useState('#5B8BE8')
  const [useCustomAccent, setUseCustomAccent] = useState(false)
  const [cover, setCover] = useState('')
  const [master, setMaster] = useState(false)
  const [pinned, setPinned] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setName(editingCategory.name)
        setEmoji(editingCategory.emoji)
        setCustomEmoji('')
        setAccent(editingCategory.accent || '#5B8BE8')
        setCustomAccent(editingCategory.accent || '#5B8BE8')
        setUseCustomAccent(!ACCENT_PRESETS.includes(editingCategory.accent))
        setCover(editingCategory.cover || '')
        setMaster(editingCategory.master)
        setPinned(editingCategory.pinned)
      } else {
        setName('')
        setEmoji('\uD83D\uDCCB')
        setCustomEmoji('')
        setAccent('#5B8BE8')
        setCustomAccent('#5B8BE8')
        setUseCustomAccent(false)
        setCover('')
        setMaster(false)
        setPinned(false)
      }
      setTimeout(() => nameRef.current?.focus(), 100)
    }
  }, [isOpen, editingCategory])

  const handleSave = () => {
    if (!name.trim()) {
      nameRef.current?.focus()
      return
    }
    const finalEmoji = customEmoji.trim() || emoji
    const finalAccent = useCustomAccent ? customAccent : accent
    onSave({ name: name.trim(), emoji: finalEmoji, accent: finalAccent, cover, master, pinned })
  }

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
        className="bg-lf-surface rounded-[18px] w-full max-w-[500px] max-h-[90vh] overflow-y-auto border border-lf-border animate-lf-scale-in"
        style={{ boxShadow: 'var(--lf-shadow-lg)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-lf-border flex items-center justify-between sticky top-0 bg-lf-surface z-[2]">
          <span className="font-serif text-[1.1rem] font-normal text-lf-text-1">
            {editingCategory ? 'Modifier la categorie' : 'Nouvelle categorie'}
          </span>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-lg border border-lf-border bg-transparent cursor-pointer flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3.5">
          {/* Name */}
          <div className="flex flex-col gap-[3px]">
            <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Nom de la categorie *</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Sante, Projets, Finances..."
              className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 lf-transition"
            />
          </div>

          {/* Emoji */}
          <div>
            <div className="text-[11px] font-semibold text-lf-text-3 uppercase tracking-wider mb-2">Icone / Emoji</div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_PRESETS.map(e => (
                <button
                  key={e}
                  onClick={() => { setEmoji(e); setCustomEmoji('') }}
                  className={`w-9 h-9 rounded-[9px] border-[1.5px] bg-lf-bg cursor-pointer flex items-center justify-center text-lg lf-transition hover:border-lf-text-1 hover:bg-lf-surface2 hover:scale-110 ${
                    emoji === e && !customEmoji ? 'border-lf-text-1 bg-lf-surface2 scale-110' : 'border-lf-border'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2 items-center">
              <input
                type="text"
                maxLength={2}
                value={customEmoji}
                onChange={e => { setCustomEmoji(e.target.value) }}
                placeholder="\u270F\uFE0F"
                className="w-[50px] text-center py-1.5 border-[1.5px] border-lf-border rounded-lg text-lg bg-lf-bg text-lf-text-1 outline-none font-sans"
              />
              <span className="text-[12px] text-lf-text-3">ou collez votre propre emoji</span>
            </div>
          </div>

          <div className="h-px bg-lf-border" />

          {/* Color accent */}
          <div>
            <div className="text-[11px] font-semibold text-lf-text-3 uppercase tracking-wider mb-2">{"Couleur d'accent"}</div>
            <div className="flex gap-2 flex-wrap items-center">
              {ACCENT_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => { setAccent(c); setUseCustomAccent(false) }}
                  className={`w-7 h-7 rounded-lg cursor-pointer flex-shrink-0 lf-transition ${
                    accent === c && !useCustomAccent ? 'border-2 border-lf-text-1 scale-[1.15]' : 'border-2 border-transparent'
                  }`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
              <div
                className="w-7 h-7 rounded-lg border-2 border-dashed border-lf-border2 cursor-pointer flex items-center justify-center text-lf-text-3 text-base overflow-hidden relative lf-transition"
                title="Couleur personnalisee"
              >
                +
                <input
                  type="color"
                  value={customAccent}
                  onChange={e => {
                    setCustomAccent(e.target.value)
                    setUseCustomAccent(true)
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer border-none p-0 w-full h-full"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-lf-border" />

          {/* Cover */}
          <div>
            <div className="text-[11px] font-semibold text-lf-text-3 uppercase tracking-wider mb-2">Image de couverture</div>
            {cover && (
              <img
                src={cover}
                alt="Couverture"
                className="w-full h-20 object-cover rounded-[10px] border border-lf-border mb-2"
                onError={() => setCover('')}
              />
            )}
            <div className="flex flex-col gap-[3px]">
              <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">{"URL d'image"}</label>
              <input
                type="url"
                value={cover}
                onChange={e => setCover(e.target.value)}
                placeholder="https://..."
                className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 lf-transition"
              />
            </div>
          </div>

          <div className="h-px bg-lf-border" />

          {/* Options */}
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-lf-text-1">
              <input
                type="checkbox"
                checked={master}
                onChange={e => setMaster(e.target.checked)}
                className="w-[15px] h-[15px] accent-lf-text-1"
              />
              Trier les taches par deadline (mode Master)
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-lf-text-1">
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="w-[15px] h-[15px] accent-lf-text-1"
              />
              Epingler cette categorie en haut
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-lf-border flex justify-between items-center gap-2 flex-wrap">
          <div>
            {editingCategory && (
              <button
                onClick={onDelete}
                className="py-[7px] px-3.5 rounded-lg font-sans text-[12.5px] font-medium cursor-pointer bg-lf-red-bg text-lf-red border-[1.5px] border-lf-red hover:bg-lf-red hover:text-white lf-transition"
              >
                Supprimer
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="py-[7px] px-3.5 rounded-lg font-sans text-[12.5px] font-medium cursor-pointer bg-transparent text-lf-text-2 border-[1.5px] border-lf-border hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="py-[7px] px-3.5 rounded-lg font-sans text-[12.5px] font-medium cursor-pointer bg-lf-text-1 text-lf-surface border-none hover:opacity-85 lf-transition"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
