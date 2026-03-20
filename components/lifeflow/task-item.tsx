"use client"

import { Edit3, Trash2, ExternalLink, Calendar } from 'lucide-react'
import type { Task } from '@/lib/types'
import { formatDate, getDateClass } from '@/lib/helpers'

interface TaskItemProps {
  task: Task
  catId: string
  extraClass?: string
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

export function TaskItem({ task, catId, extraClass = '', onToggle, onEdit, onDelete }: TaskItemProps) {
  const dc = getDateClass(task.date)

  return (
    <div
      className={`bg-lf-bg border-[1.5px] border-lf-border rounded-[10px] py-[9px] px-[10px] flex items-start gap-[9px] lf-transition animate-lf-slide-in group hover:border-lf-border2 ${
        task.done ? 'opacity-50' : ''
      } ${extraClass}`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 cursor-pointer flex items-center justify-center mt-0.5 lf-transition ${
          task.done
            ? 'bg-lf-green border-lf-green'
            : 'border-lf-border2 bg-transparent'
        }`}
      >
        {task.done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-[13px] leading-[1.4] text-lf-text-1 ${task.done ? 'line-through !text-lf-text-3' : ''}`}>
          {task.title}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-[7px] py-[1px] rounded-full bg-lf-surface2 border border-lf-border text-lf-text-2 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 mt-1 items-center">
          {task.date && (
            <span
              className={`text-[11px] flex items-center gap-[3px] ${
                dc === 'overdue'
                  ? 'text-lf-red font-medium'
                  : dc === 'soon'
                  ? 'text-lf-orange font-medium'
                  : 'text-lf-text-3'
              }`}
            >
              <Calendar size={10} />
              {formatDate(task.date)}
            </span>
          )}
          {task.link && (
            <a
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#5B8BE8] no-underline flex items-center gap-[3px] hover:opacity-70 lf-transition"
            >
              <ExternalLink size={10} />
              Lien
            </a>
          )}
        </div>

        {/* Description */}
        {task.desc && (
          <div className="text-[11.5px] text-lf-text-2 mt-1 font-light leading-[1.5]">
            {task.desc}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-[3px] flex-shrink-0 opacity-0 group-hover:opacity-100 lf-transition">
        <button
          onClick={onEdit}
          className="w-[26px] h-[26px] rounded-[7px] border border-lf-border bg-lf-surface cursor-pointer flex items-center justify-center text-lf-text-3 hover:text-lf-text-1 hover:bg-lf-surface2 hover:border-lf-border2 lf-transition"
          title="Modifier"
        >
          <Edit3 size={11} />
        </button>
        <button
          onClick={onDelete}
          className="w-[26px] h-[26px] rounded-[7px] border border-lf-border bg-lf-surface cursor-pointer flex items-center justify-center text-lf-text-3 hover:text-lf-red hover:border-lf-red hover:bg-lf-red-bg lf-transition"
          title="Supprimer"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}
