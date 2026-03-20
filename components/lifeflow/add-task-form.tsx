"use client"

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { Task } from '@/lib/types'

interface AddTaskFormProps {
  catId: string
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onAdd: (data: Omit<Task, 'id' | 'done' | 'createdAt'>) => void
}

export function AddTaskForm({ catId, isOpen, onOpen, onClose, onAdd }: AddTaskFormProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [link, setLink] = useState('')
  const [tags, setTags] = useState('')
  const [desc, setDesc] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    onAdd({
      title: title.trim(),
      date,
      link: link.trim(),
      desc: desc.trim(),
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
    })
    setTitle('')
    setDate('')
    setLink('')
    setTags('')
    setDesc('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="px-3 py-2.5 pb-3.5 border-t border-lf-border">
      {!isOpen ? (
        <button
          onClick={onOpen}
          className="w-full py-2 px-3 bg-transparent border-[1.5px] border-dashed border-lf-border rounded-[10px] cursor-pointer font-sans text-[12.5px] text-lf-text-3 flex items-center gap-1.5 hover:border-lf-text-2 hover:text-lf-text-2 hover:bg-lf-surface2 lf-transition"
        >
          <Plus size={11} strokeWidth={2.5} />
          Ajouter une tache
        </button>
      ) : (
        <div className="flex flex-col gap-[7px] animate-lf-fade-up">
          <div className="flex flex-col gap-[3px]">
            <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Titre *</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Titre de la tache"
              className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 lf-transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-[7px]">
            <div className="flex flex-col gap-[3px]">
              <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Date</label>
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
            <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Tags (virgule)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="urgent, idee..."
              className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 lf-transition"
            />
          </div>
          <div className="flex flex-col gap-[3px]">
            <label className="text-[10.5px] font-semibold text-lf-text-3 uppercase tracking-wide">Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              placeholder="Notes..."
              className="py-[7px] px-[9px] bg-lf-bg border-[1.5px] border-lf-border rounded-lg font-sans text-[13px] text-lf-text-1 outline-none focus:border-lf-text-2 placeholder:text-lf-text-3 resize-none lf-transition"
            />
          </div>
          <div className="flex gap-[7px] justify-end">
            <button
              onClick={onClose}
              className="py-[7px] px-3.5 rounded-lg font-sans text-[12.5px] font-medium cursor-pointer bg-transparent text-lf-text-2 border-[1.5px] border-lf-border hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="py-[7px] px-3.5 rounded-lg font-sans text-[12.5px] font-medium cursor-pointer bg-lf-text-1 text-lf-surface border-none hover:opacity-85 lf-transition"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
