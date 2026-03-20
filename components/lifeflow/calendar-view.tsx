"use client"

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Category, Task, TasksMap } from '@/lib/types'
import { MONTHS_FR, toDateStr } from '@/lib/helpers'

interface CalendarViewProps {
  categories: Category[]
  tasks: TasksMap
  calYear: number
  calMonth: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onJumpToTask: (catId: string, taskId: string) => void
}

interface CalendarTask {
  task: Task
  cat: Category
  dateStr: string
}

const DOW_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export function CalendarView({
  categories,
  tasks,
  calYear,
  calMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onJumpToTask,
}: CalendarViewProps) {
  const allTasksWithDates = useMemo(() => {
    const result: CalendarTask[] = []
    categories.forEach(cat => {
      ;(tasks[cat.id] || []).forEach(t => {
        if (t.date) result.push({ task: t, cat, dateStr: t.date })
      })
    })
    return result
  }, [categories, tasks])

  const dayMap = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {}
    allTasksWithDates.forEach(item => {
      if (!map[item.dateStr]) map[item.dateStr] = []
      map[item.dateStr].push(item)
    })
    return map
  }, [allTasksWithDates])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const cells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1)
    const lastDay = new Date(calYear, calMonth + 1, 0)
    let startDow = firstDay.getDay()
    startDow = startDow === 0 ? 6 : startDow - 1

    const result: { date: Date; otherMonth: boolean }[] = []

    // Previous month
    const prevLast = new Date(calYear, calMonth, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const day = prevLast - i
      result.push({ date: new Date(calYear, calMonth - 1, day), otherMonth: true })
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      result.push({ date: new Date(calYear, calMonth, d), otherMonth: false })
    }

    // Next month
    const totalCells = startDow + lastDay.getDate()
    const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
    for (let d = 1; d <= remainder; d++) {
      result.push({ date: new Date(calYear, calMonth + 1, d), otherMonth: true })
    }

    return result
  }, [calYear, calMonth])

  return (
    <div
      className="bg-lf-surface border-[1.5px] border-lf-border rounded-[18px] overflow-hidden"
      style={{ boxShadow: 'var(--lf-shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-[22px] py-[18px] border-b border-lf-border gap-3 flex-wrap">
        <span className="font-serif text-[1.3rem] font-normal tracking-tight text-lf-text-1">
          {MONTHS_FR[calMonth]} {calYear}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onToday}
            className="px-3.5 py-[5px] rounded-full border-[1.5px] border-lf-border bg-transparent cursor-pointer font-sans text-[12px] font-medium text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition"
          >
            {"Aujourd'hui"}
          </button>
          <button
            onClick={onPrevMonth}
            className="w-8 h-8 rounded-[9px] border-[1.5px] border-lf-border bg-transparent cursor-pointer flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border2 lf-transition"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={onNextMonth}
            className="w-8 h-8 rounded-[9px] border-[1.5px] border-lf-border bg-transparent cursor-pointer flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border2 lf-transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2.5 px-[22px] py-3 border-b border-lf-border">
        {categories.map(c => (
          <div key={c.id} className="flex items-center gap-[5px] text-[11px] text-lf-text-2">
            <div className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: c.accent || '#5B8BE8' }} />
            <span>{c.emoji} {c.name}</span>
          </div>
        ))}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-lf-border">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center py-2.5 px-1 text-[11px] font-semibold text-lf-text-3 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const dateStr = toDateStr(cell.date)
          const isToday = cell.date.getTime() === today.getTime()
          const items = dayMap[dateStr] || []
          const MAX_VISIBLE = 3
          const visible = items.slice(0, MAX_VISIBLE)
          const extra = items.length - MAX_VISIBLE

          return (
            <div
              key={i}
              className={`border-r border-b border-lf-border min-h-[100px] p-[8px_6px_6px] relative lf-transition hover:bg-lf-surface2 ${
                cell.otherMonth ? 'opacity-40' : ''
              } ${isToday ? 'bg-lf-bg2' : ''} ${i % 7 === 6 ? '!border-r-0' : ''}`}
            >
              <div
                className={`text-[12px] font-semibold text-lf-text-2 mb-[5px] w-6 h-6 flex items-center justify-center ${
                  isToday ? 'bg-lf-text-1 text-lf-surface rounded-full' : ''
                }`}
              >
                {cell.date.getDate()}
              </div>
              {items.length > 0 && (
                <div className="flex flex-col gap-[2px]">
                  {visible.map(item => {
                    const isOverdue = !item.task.done && cell.date < today
                    return (
                      <div
                        key={item.task.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onJumpToTask(item.cat.id, item.task.id)
                        }}
                        className={`text-[10px] px-1.5 py-[2px] rounded text-white whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer font-medium flex items-center gap-[3px] leading-[1.4] hover:opacity-80 lf-transition ${
                          item.task.done ? 'opacity-45 line-through' : ''
                        } ${isOverdue ? 'outline-2 outline-lf-red -outline-offset-1' : ''}`}
                        style={{ background: item.cat.accent || '#5B8BE8' }}
                        title={`${item.cat.name}: ${item.task.title}`}
                      >
                        <span className="flex-shrink-0">{item.cat.emoji}</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.task.title}</span>
                      </div>
                    )
                  })}
                  {extra > 0 && (
                    <div className="text-[10px] text-lf-text-3 font-medium px-1 cursor-pointer hover:text-lf-text-1 lf-transition">
                      +{extra} de plus
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
