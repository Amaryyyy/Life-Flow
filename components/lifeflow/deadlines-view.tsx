"use client"

import { useMemo } from 'react'
import type { Category, Task, TasksMap } from '@/lib/types'

interface DeadlineItem {
  task: Task
  cat: Category
  diffDays: number
  date: Date
}

interface DeadlinesViewProps {
  categories: Category[]
  tasks: TasksMap
  onJumpToTask: (catId: string, taskId: string) => void
}

function getDeadlineItems(categories: Category[], tasks: TasksMap): DeadlineItem[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const items: DeadlineItem[] = []

  categories.forEach(cat => {
    ;(tasks[cat.id] || []).forEach(t => {
      if (!t.date || t.done) return
      const d = new Date(t.date)
      d.setHours(0, 0, 0, 0)
      const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000)
      items.push({ task: t, cat, diffDays, date: d })
    })
  })

  return items.sort((a, b) => a.diffDays - b.diffDays)
}

export function getDeadlineBadgeCount(categories: Category[], tasks: TasksMap): number {
  const items = getDeadlineItems(categories, tasks)
  return items.filter(i => i.diffDays < 3).length
}

export function DeadlinesView({ categories, tasks, onJumpToTask }: DeadlinesViewProps) {
  const items = useMemo(() => getDeadlineItems(categories, tasks), [categories, tasks])
  const overdue = items.filter(i => i.diffDays < 0)
  const soon = items.filter(i => i.diffDays >= 0 && i.diffDays < 3)
  const upcoming = items.filter(i => i.diffDays >= 3 && i.diffDays <= 7)
  const isEmpty = overdue.length === 0 && soon.length === 0 && upcoming.length === 0

  return (
    <div className="mb-7">
      <div className="flex items-center gap-2.5 mb-3.5">
        <h2 className="font-serif text-[1.25rem] font-normal text-lf-text-1">
          {'\u23F0 Rappels & Deadlines'}
        </h2>
      </div>

      {isEmpty && (
        <div className="text-center py-10 px-5 text-lf-text-3 text-[13px] bg-lf-surface border-[1.5px] border-dashed border-lf-border rounded-[18px]">
          <span className="text-[32px] block mb-2">{'\uD83C\uDF89'}</span>
          {'Aucune deadline urgente !'}<br />{'Tout est sous controle.'}
        </div>
      )}

      {overdue.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[11px] font-semibold px-2.5 py-[3px] rounded-full bg-lf-red-bg text-lf-red">
              {'\uD83D\uDD34 En retard'}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {overdue.map((item, idx) => (
              <DeadlineCard key={item.task.id} item={item} type="overdue" idx={idx} onJump={onJumpToTask} />
            ))}
          </div>
        </div>
      )}

      {soon.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[11px] font-semibold px-2.5 py-[3px] rounded-full bg-lf-orange-bg text-lf-orange">
              {'\uD83D\uDFE1 Dans moins de 3 jours'}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {soon.map((item, idx) => (
              <DeadlineCard key={item.task.id} item={item} type="soon" idx={idx} onJump={onJumpToTask} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[11px] font-semibold px-2.5 py-[3px] rounded-full bg-lf-green-bg text-lf-green">
              {'\uD83D\uDCC5 A venir (7 jours)'}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {upcoming.map((item, idx) => (
              <DeadlineCard key={item.task.id} item={item} type="upcoming" idx={idx} onJump={onJumpToTask} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DeadlineCard({
  item,
  type,
  idx,
  onJump,
}: {
  item: DeadlineItem
  type: 'overdue' | 'soon' | 'upcoming'
  idx: number
  onJump: (catId: string, taskId: string) => void
}) {
  const { task, cat, diffDays } = item
  let daysLabel = ''
  if (diffDays < 0) daysLabel = `Il y a ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`
  else if (diffDays === 0) daysLabel = "Aujourd'hui"
  else if (diffDays === 1) daysLabel = 'Demain'
  else daysLabel = `Dans ${diffDays} jours`

  return (
    <div
      onClick={() => onJump(cat.id, task.id)}
      className={`bg-lf-surface border-[1.5px] border-lf-border rounded-[10px] px-4 py-3.5 flex gap-3 items-start cursor-pointer lf-transition animate-lf-fade-up hover:-translate-y-[2px] ${
        type === 'overdue' ? '!border-lf-red !bg-lf-red-bg' : type === 'soon' ? '!border-lf-orange !bg-lf-orange-bg' : ''
      }`}
      style={{
        boxShadow: 'var(--lf-shadow-sm)',
        animationDelay: `${idx * 0.04}s`,
      }}
    >
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
          type === 'overdue' ? 'bg-lf-red' : type === 'soon' ? 'bg-lf-orange' : 'bg-lf-green'
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] leading-[1.4] text-lf-text-1">{task.title}</div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="text-[10.5px] px-2 py-[1px] rounded-full font-medium text-white flex items-center gap-1"
            style={{ background: cat.accent || '#5B8BE8' }}
          >
            {cat.emoji} {cat.name}
          </span>
          <span
            className={`text-[11px] font-semibold ${
              type === 'overdue' ? 'text-lf-red' : type === 'soon' ? 'text-lf-orange' : 'text-lf-text-2'
            }`}
          >
            {daysLabel}
          </span>
        </div>
        {task.desc && (
          <div className="text-[11.5px] text-lf-text-2 mt-1 leading-[1.4]">
            {task.desc.substring(0, 80)}{task.desc.length > 80 ? '\u2026' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
