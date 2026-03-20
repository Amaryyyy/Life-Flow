"use client"

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Task } from '@/lib/types'

interface TaskEditModalProps {
  isOpen: boolean
  task: Task | null
  onClose: () => void
  onSave: (data: Partial<Task>) => void
}

export function TaskEditModal({ isOpen, task, onClose, onSave }: TaskEditModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [link, setLink] = useState('')
  const [tags, setTags] = useState('')
  const [desc, setDesc] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title)
      setDate(task.date || '')
      setLink(task.link || '')
      setTags((task.tags || []).join(', '))
      setDesc(task.desc || '')
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [isOpen, task])

  const handleSave = () => {
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    onSave({
      title: title.trim(),
      date,
      link: link.trim(),
      desc: desc.trim(),
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
    })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') handleSave()
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
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-lf-border flex items-center justify-between sticky top-0 bg-lf-surface z-[2]">
          <span className="font-serif text-[1.1rem] font-normal text-lf-text-1">Modifier la tache</span>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-lg border border-lf-border bg-transparent cursor-pointer flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-[3px]">
            <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Titre *</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de la tache"
              className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 lf-transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-[7px]">
            <div className="flex flex-col gap-[3px]">
              <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Date / Deadline</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 lf-transition"
              />
            </div>
            <div className="flex flex-col gap-[3px]">
              <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Lien</label>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://..."
                className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 lf-transition"
              />
            </div>
          </div>
          <div className="flex flex-col gap-[3px]">
            <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Tags (separes par virgule)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="urgent, lecture, travail..."
              className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 lf-transition"
            />
          </div>
          <div className="flex flex-col gap-[3px]">
            <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="Notes, details, sous-taches..."
              className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 resize-none lf-transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-lf-border flex justify-end gap-2">
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
  )
}
