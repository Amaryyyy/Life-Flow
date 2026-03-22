"use client"

import { useMemo, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, Cake, MapPin, Clock, Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { Category, Task, TasksMap, CalendarEvent, Birthday } from '@/lib/types'
import { MONTHS_FR, toDateStr } from '@/lib/helpers'
import { EVENT_COLORS } from '@/lib/types'
import { useLifeFlowStore } from '@/lib/store'

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
const DOW_LABELS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// API helper for calendar data
async function calendarApi(method: 'GET' | 'POST', body?: Record<string, unknown>) {
  const password = useLifeFlowStore.getState().password
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-app-password': password,
    },
  }
  if (method === 'GET') {
    const res = await fetch('/api/lifeflow?type=calendar', opts)
    if (!res.ok) throw new Error('Failed to load calendar data')
    return res.json()
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch('/api/lifeflow', opts)
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Check if a birthday matches a given date (MM-DD comparison)
function birthdayMatchesDate(birthday: Birthday, date: Date): boolean {
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return birthday.date === `${month}-${day}`
}

// Calculate age from year of birth
function calculateAge(yearOfBirth: number | null, currentYear: number): number | null {
  if (!yearOfBirth) return null
  return currentYear - yearOfBirth
}

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
  // Calendar events and birthdays state
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [loading, setLoading] = useState(true)
  
  // Day detail modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Event/Birthday form modal
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false)
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null)

  // Load calendar data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await calendarApi('GET')
        setEvents(data.events || [])
        setBirthdays(data.birthdays || [])
      } catch (err) {
        console.error('Failed to load calendar data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Task data processing
  const allTasksWithDates = useMemo(() => {
    const result: CalendarTask[] = []
    categories.forEach(cat => {
      ;(tasks[cat.id] || []).forEach(t => {
        if (t.date) result.push({ task: t, cat, dateStr: t.date })
      })
    })
    return result
  }, [categories, tasks])

  const taskDayMap = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {}
    allTasksWithDates.forEach(item => {
      if (!map[item.dateStr]) map[item.dateStr] = []
      map[item.dateStr].push(item)
    })
    return map
  }, [allTasksWithDates])

  // Event day map
  const eventDayMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(event => {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    })
    return map
  }, [events])

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

  // Get items for selected date
  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return { tasks: [], events: [], birthdays: [] }
    const dateStr = toDateStr(selectedDate)
    return {
      tasks: taskDayMap[dateStr] || [],
      events: eventDayMap[dateStr] || [],
      birthdays: birthdays.filter(b => birthdayMatchesDate(b, selectedDate)),
    }
  }, [selectedDate, taskDayMap, eventDayMap, birthdays])

  // Event CRUD
  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = { ...event, id: uid() }
    setEvents(prev => [...prev, newEvent])
    try {
      await calendarApi('POST', { action: 'addCalendarEvent', event: newEvent })
    } catch (err) {
      console.error('Failed to add event:', err)
      setEvents(prev => prev.filter(e => e.id !== newEvent.id))
    }
  }, [])

  const updateEvent = useCallback(async (eventId: string, data: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...data } : e))
    try {
      await calendarApi('POST', { action: 'updateCalendarEvent', eventId, data })
    } catch (err) {
      console.error('Failed to update event:', err)
    }
  }, [])

  const deleteEvent = useCallback(async (eventId: string) => {
    const prev = events
    setEvents(e => e.filter(ev => ev.id !== eventId))
    try {
      await calendarApi('POST', { action: 'deleteCalendarEvent', eventId })
    } catch (err) {
      console.error('Failed to delete event:', err)
      setEvents(prev)
    }
  }, [events])

  // Birthday CRUD
  const addBirthday = useCallback(async (birthday: Omit<Birthday, 'id'>) => {
    const newBirthday: Birthday = { ...birthday, id: uid() }
    setBirthdays(prev => [...prev, newBirthday])
    try {
      await calendarApi('POST', { action: 'addBirthday', birthday: newBirthday })
    } catch (err) {
      console.error('Failed to add birthday:', err)
      setBirthdays(prev => prev.filter(b => b.id !== newBirthday.id))
    }
  }, [])

  const updateBirthday = useCallback(async (birthdayId: string, data: Partial<Birthday>) => {
    setBirthdays(prev => prev.map(b => b.id === birthdayId ? { ...b, ...data } : b))
    try {
      await calendarApi('POST', { action: 'updateBirthday', birthdayId, data })
    } catch (err) {
      console.error('Failed to update birthday:', err)
    }
  }, [])

  const deleteBirthday = useCallback(async (birthdayId: string) => {
    const prev = birthdays
    setBirthdays(b => b.filter(bd => bd.id !== birthdayId))
    try {
      await calendarApi('POST', { action: 'deleteBirthday', birthdayId })
    } catch (err) {
      console.error('Failed to delete birthday:', err)
      setBirthdays(prev)
    }
  }, [birthdays])

  // Open add event modal with selected date pre-filled
  const openAddEvent = useCallback(() => {
    setEditingEvent(null)
    setEventModalOpen(true)
  }, [])

  const openEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setEventModalOpen(true)
  }, [])

  const openAddBirthday = useCallback(() => {
    setEditingBirthday(null)
    setBirthdayModalOpen(true)
  }, [])

  const openEditBirthday = useCallback((birthday: Birthday) => {
    setEditingBirthday(birthday)
    setBirthdayModalOpen(true)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-lf-border2 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div
        className="bg-lf-surface border-[1.5px] border-lf-border rounded-[18px] overflow-hidden"
        style={{ boxShadow: 'var(--lf-shadow-sm)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-[22px] py-3 sm:py-[18px] border-b border-lf-border gap-2 flex-wrap">
          <span className="font-serif text-lg sm:text-[1.3rem] font-normal tracking-tight text-lf-text-1">
            {MONTHS_FR[calMonth]} {calYear}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onToday}
              className="px-2.5 sm:px-3.5 py-[5px] rounded-full border-[1.5px] border-lf-border bg-transparent cursor-pointer font-sans text-[11px] sm:text-[12px] font-medium text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition"
            >
              {"Aujourd'hui"}
            </button>
            <button
              onClick={onPrevMonth}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] border-[1.5px] border-lf-border bg-transparent cursor-pointer flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border2 lf-transition"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={onNextMonth}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] border-[1.5px] border-lf-border bg-transparent cursor-pointer flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border2 lf-transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Legend - scrollable on mobile */}
        <div className="flex gap-2 sm:gap-2.5 px-3 sm:px-[22px] py-2 sm:py-3 border-b border-lf-border overflow-x-auto scrollbar-hide">
          {/* Birthday legend */}
          <div className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-lf-text-2 whitespace-nowrap flex-shrink-0">
            <Cake size={10} className="text-lf-pink" />
            <span>Anniversaires</span>
          </div>
          {/* Category legends */}
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-lf-text-2 whitespace-nowrap flex-shrink-0">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[3px] flex-shrink-0" style={{ background: c.accent || '#5B8BE8' }} />
              <span className="hidden sm:inline">{c.emoji} {c.name}</span>
              <span className="sm:hidden">{c.emoji}</span>
            </div>
          ))}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-lf-border">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className="text-center py-2 sm:py-2.5 px-1 text-[10px] sm:text-[11px] font-semibold text-lf-text-3 uppercase tracking-wide">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{DOW_LABELS_SHORT[i]}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dateStr = toDateStr(cell.date)
            const isToday = cell.date.getTime() === today.getTime()
            const taskItems = taskDayMap[dateStr] || []
            const eventItems = eventDayMap[dateStr] || []
            const birthdayItems = birthdays.filter(b => birthdayMatchesDate(b, cell.date))
            const totalItems = taskItems.length + eventItems.length + birthdayItems.length
            const MAX_VISIBLE = 2
            const visibleTasks = taskItems.slice(0, MAX_VISIBLE)
            const remainingSlots = MAX_VISIBLE - visibleTasks.length
            const visibleEvents = eventItems.slice(0, remainingSlots)
            const extra = totalItems - visibleTasks.length - visibleEvents.length

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(cell.date)}
                className={`border-r border-b border-lf-border min-h-[60px] sm:min-h-[100px] p-1 sm:p-[8px_6px_6px] relative lf-transition cursor-pointer hover:bg-lf-surface2 ${
                  cell.otherMonth ? 'opacity-40' : ''
                } ${isToday ? 'bg-lf-bg2' : ''} ${i % 7 === 6 ? '!border-r-0' : ''}`}
              >
                {/* Date number + birthday indicator */}
                <div className="flex items-center gap-0.5 mb-[2px] sm:mb-[5px]">
                  <div
                    className={`text-[11px] sm:text-[12px] font-semibold text-lf-text-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center ${
                      isToday ? 'bg-lf-text-1 text-lf-surface rounded-full' : ''
                    }`}
                  >
                    {cell.date.getDate()}
                  </div>
                  {birthdayItems.length > 0 && (
                    <Cake size={10} className="text-lf-pink flex-shrink-0" />
                  )}
                </div>

                {/* Items preview */}
                {totalItems > 0 && (
                  <div className="flex flex-col gap-[1px] sm:gap-[2px]">
                    {/* Events first */}
                    {visibleEvents.map(event => (
                      <div
                        key={event.id}
                        className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-[1px] sm:py-[2px] rounded text-white whitespace-nowrap overflow-hidden text-ellipsis font-medium leading-[1.4]"
                        style={{ background: event.color }}
                        title={event.title}
                      >
                        <span className="hidden sm:inline">{event.title}</span>
                        <span className="sm:hidden">{event.title.slice(0, 6)}</span>
                      </div>
                    ))}
                    {/* Tasks */}
                    {visibleTasks.map(item => {
                      const isOverdue = !item.task.done && cell.date < today
                      return (
                        <div
                          key={item.task.id}
                          className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-[1px] sm:py-[2px] rounded text-white whitespace-nowrap overflow-hidden text-ellipsis font-medium leading-[1.4] ${
                            item.task.done ? 'opacity-45 line-through' : ''
                          } ${isOverdue ? 'ring-1 ring-lf-red' : ''}`}
                          style={{ background: item.cat.accent || '#5B8BE8' }}
                          title={`${item.cat.name}: ${item.task.title}`}
                        >
                          <span className="hidden sm:inline">{item.cat.emoji} {item.task.title}</span>
                          <span className="sm:hidden">{item.task.title.slice(0, 6)}</span>
                        </div>
                      )
                    })}
                    {extra > 0 && (
                      <div className="text-[8px] sm:text-[10px] text-lf-text-3 font-medium px-0.5 sm:px-1">
                        +{extra}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Birthdays Section */}
      <div
        className="mt-4 bg-lf-surface border-[1.5px] border-lf-border rounded-[18px] overflow-hidden"
        style={{ boxShadow: 'var(--lf-shadow-sm)' }}
      >
        <div className="flex items-center justify-between px-3 sm:px-[22px] py-3 sm:py-4 border-b border-lf-border">
          <div className="flex items-center gap-2">
            <Cake size={16} className="text-lf-pink" />
            <span className="font-serif text-base sm:text-lg font-normal text-lf-text-1">Anniversaires</span>
          </div>
          <button
            onClick={openAddBirthday}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-lf-text-1 text-lf-surface flex items-center justify-center cursor-pointer hover:opacity-80 lf-transition"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="p-3 sm:p-4">
          {birthdays.length === 0 ? (
            <p className="text-[13px] text-lf-text-3 text-center py-4">Aucun anniversaire enregistre</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {birthdays.map(b => {
                const [month, day] = b.date.split('-').map(Number)
                const monthName = MONTHS_FR[month - 1]
                const age = calculateAge(b.yearOfBirth, calYear)
                
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-[12px] bg-lf-bg border border-lf-border hover:border-lf-border2 lf-transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-lf-pink/10 flex items-center justify-center">
                        <Cake size={16} className="text-lf-pink" />
                      </div>
                      <div>
                        <div className="text-[13px] sm:text-[14px] font-medium text-lf-text-1">{b.name}</div>
                        <div className="text-[11px] sm:text-[12px] text-lf-text-3">
                          {day} {monthName}
                          {age !== null && <span className="ml-1.5">({age} ans)</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 lf-transition">
                      <button
                        onClick={() => openEditBirthday(b)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition cursor-pointer"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteBirthday(b.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-lf-text-3 hover:bg-lf-red/10 hover:text-lf-red lf-transition cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-lf-surface rounded-[18px] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            style={{ boxShadow: 'var(--lf-shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-lf-border">
              <div>
                <h2 className="font-serif text-xl font-normal text-lf-text-1">
                  {selectedDate.getDate()} {MONTHS_FR[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </h2>
                <p className="text-[12px] text-lf-text-3 mt-0.5">
                  {DOW_LABELS[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openAddEvent}
                  className="px-3 py-1.5 rounded-full bg-lf-text-1 text-lf-surface text-[12px] font-medium flex items-center gap-1.5 cursor-pointer hover:opacity-80 lf-transition"
                >
                  <Plus size={12} />
                  Evenement
                </button>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Birthdays */}
              {selectedDateItems.birthdays.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-lf-text-3 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Cake size={12} className="text-lf-pink" />
                    Anniversaires
                  </h3>
                  <div className="space-y-2">
                    {selectedDateItems.birthdays.map(b => {
                      const age = calculateAge(b.yearOfBirth, selectedDate.getFullYear())
                      return (
                        <div key={b.id} className="p-3 rounded-[12px] bg-lf-pink/5 border border-lf-pink/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Cake size={14} className="text-lf-pink" />
                              <span className="text-[14px] font-medium text-lf-text-1">{b.name}</span>
                              {age !== null && (
                                <span className="text-[12px] text-lf-text-3">fete ses {age} ans</span>
                              )}
                            </div>
                          </div>
                          {b.notes && (
                            <p className="text-[12px] text-lf-text-2 mt-1.5 ml-6">{b.notes}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Events */}
              {selectedDateItems.events.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-lf-text-3 uppercase tracking-wide mb-2">
                    Evenements
                  </h3>
                  <div className="space-y-2">
                    {selectedDateItems.events.map(event => (
                      <div
                        key={event.id}
                        className="p-3 rounded-[12px] border-l-[3px]"
                        style={{ borderLeftColor: event.color, background: `${event.color}10` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-[14px] font-medium text-lf-text-1">{event.title}</div>
                            {(event.startTime || event.location) && (
                              <div className="flex items-center gap-3 mt-1">
                                {event.startTime && (
                                  <div className="flex items-center gap-1 text-[11px] text-lf-text-3">
                                    <Clock size={10} />
                                    {event.startTime}{event.endTime && ` - ${event.endTime}`}
                                  </div>
                                )}
                                {event.location && (
                                  <div className="flex items-center gap-1 text-[11px] text-lf-text-3">
                                    <MapPin size={10} />
                                    {event.location}
                                  </div>
                                )}
                              </div>
                            )}
                            {event.description && (
                              <p className="text-[12px] text-lf-text-2 mt-1.5">{event.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditEvent(event)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition cursor-pointer"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => deleteEvent(event.id)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-lf-text-3 hover:bg-lf-red/10 hover:text-lf-red lf-transition cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {selectedDateItems.tasks.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-lf-text-3 uppercase tracking-wide mb-2">
                    Taches
                  </h3>
                  <div className="space-y-2">
                    {selectedDateItems.tasks.map(item => {
                      const isOverdue = !item.task.done && selectedDate < today
                      return (
                        <div
                          key={item.task.id}
                          onClick={() => {
                            setSelectedDate(null)
                            onJumpToTask(item.cat.id, item.task.id)
                          }}
                          className={`p-3 rounded-[12px] border-l-[3px] cursor-pointer hover:opacity-80 lf-transition ${
                            item.task.done ? 'opacity-50' : ''
                          } ${isOverdue ? 'ring-1 ring-lf-red' : ''}`}
                          style={{ borderLeftColor: item.cat.accent || '#5B8BE8', background: `${item.cat.accent}10` }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[14px]">{item.cat.emoji}</span>
                                <span className={`text-[14px] font-medium text-lf-text-1 ${item.task.done ? 'line-through' : ''}`}>
                                  {item.task.title}
                                </span>
                              </div>
                              <div className="text-[11px] text-lf-text-3 mt-0.5">{item.cat.name}</div>
                            </div>
                            {item.task.link && (
                              <a
                                href={item.task.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          {item.task.desc && (
                            <p className="text-[12px] text-lf-text-2 mt-1.5 ml-6">{item.task.desc}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {selectedDateItems.tasks.length === 0 && selectedDateItems.events.length === 0 && selectedDateItems.birthdays.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[14px] text-lf-text-3">Rien de prevu pour ce jour</p>
                  <button
                    onClick={openAddEvent}
                    className="mt-3 px-4 py-2 rounded-full bg-lf-bg border border-lf-border text-[13px] font-medium text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition cursor-pointer"
                  >
                    Ajouter un evenement
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {eventModalOpen && (
        <EventModal
          event={editingEvent}
          defaultDate={selectedDate ? toDateStr(selectedDate) : toDateStr(new Date())}
          onClose={() => { setEventModalOpen(false); setEditingEvent(null) }}
          onSave={async (data) => {
            if (editingEvent) {
              await updateEvent(editingEvent.id, data)
            } else {
              await addEvent(data as Omit<CalendarEvent, 'id'>)
            }
            setEventModalOpen(false)
            setEditingEvent(null)
          }}
        />
      )}

      {/* Birthday Modal */}
      {birthdayModalOpen && (
        <BirthdayModal
          birthday={editingBirthday}
          onClose={() => { setBirthdayModalOpen(false); setEditingBirthday(null) }}
          onSave={async (data) => {
            if (editingBirthday) {
              await updateBirthday(editingBirthday.id, data)
            } else {
              await addBirthday(data as Omit<Birthday, 'id'>)
            }
            setBirthdayModalOpen(false)
            setEditingBirthday(null)
          }}
        />
      )}
    </>
  )
}

// Event Form Modal
interface EventModalProps {
  event: CalendarEvent | null
  defaultDate: string
  onClose: () => void
  onSave: (data: Partial<CalendarEvent>) => void
}

function EventModal({ event, defaultDate, onClose, onSave }: EventModalProps) {
  const [title, setTitle] = useState(event?.title || '')
  const [date, setDate] = useState(event?.date || defaultDate)
  const [startTime, setStartTime] = useState(event?.startTime || '')
  const [endTime, setEndTime] = useState(event?.endTime || '')
  const [color, setColor] = useState(event?.color || EVENT_COLORS[0])
  const [description, setDescription] = useState(event?.description || '')
  const [location, setLocation] = useState(event?.location || '')
  const [allDay, setAllDay] = useState(event?.allDay !== false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    onSave({
      title: title.trim(),
      date,
      endDate: null,
      startTime: allDay ? null : startTime || null,
      endTime: allDay ? null : endTime || null,
      color,
      description,
      location,
      allDay,
      recurrence: null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-lf-surface rounded-[18px] w-full max-w-md overflow-hidden"
        style={{ boxShadow: 'var(--lf-shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-lf-border">
            <h2 className="font-serif text-lg font-normal text-lf-text-1">
              {event ? 'Modifier' : 'Nouvel evenement'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Titre</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nom de l'evenement"
                autoFocus
                className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 placeholder:text-lf-text-3 outline-none focus:border-lf-border2 lf-transition"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 outline-none focus:border-lf-border2 lf-transition"
              />
            </div>

            {/* All day toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={e => setAllDay(e.target.checked)}
                className="w-4 h-4 rounded accent-lf-text-1"
              />
              <label htmlFor="allDay" className="text-[13px] text-lf-text-2">Journee entiere</label>
            </div>

            {/* Time */}
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Debut</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 outline-none focus:border-lf-border2 lf-transition"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Fin</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 outline-none focus:border-lf-border2 lf-transition"
                  />
                </div>
              </div>
            )}

            {/* Color */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full cursor-pointer lf-transition ${
                      color === c ? 'ring-2 ring-offset-2 ring-lf-text-1' : ''
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Lieu (optionnel)</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Adresse ou lieu"
                className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 placeholder:text-lf-text-3 outline-none focus:border-lf-border2 lf-transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Description (optionnel)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Details de l'evenement"
                rows={3}
                className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 placeholder:text-lf-text-3 outline-none focus:border-lf-border2 lf-transition resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-lf-border text-[13px] font-medium text-lf-text-2 hover:bg-lf-surface2 lf-transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !date}
              className="px-4 py-2 rounded-full bg-lf-text-1 text-lf-surface text-[13px] font-medium hover:opacity-80 lf-transition cursor-pointer disabled:opacity-50"
            >
              {event ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Birthday Form Modal
interface BirthdayModalProps {
  birthday: Birthday | null
  onClose: () => void
  onSave: (data: Partial<Birthday>) => void
}

function BirthdayModal({ birthday, onClose, onSave }: BirthdayModalProps) {
  const [name, setName] = useState(birthday?.name || '')
  const [month, setMonth] = useState(birthday ? birthday.date.split('-')[0] : '')
  const [day, setDay] = useState(birthday ? birthday.date.split('-')[1] : '')
  const [yearOfBirth, setYearOfBirth] = useState(birthday?.yearOfBirth?.toString() || '')
  const [notes, setNotes] = useState(birthday?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !month || !day) return
    onSave({
      name: name.trim(),
      date: `${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      yearOfBirth: yearOfBirth ? parseInt(yearOfBirth) : null,
      notes,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-lf-surface rounded-[18px] w-full max-w-md overflow-hidden"
        style={{ boxShadow: 'var(--lf-shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-lf-border">
            <h2 className="font-serif text-lg font-normal text-lf-text-1 flex items-center gap-2">
              <Cake size={18} className="text-lf-pink" />
              {birthday ? 'Modifier' : 'Nouvel anniversaire'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 lf-transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Nom</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nom de la personne"
                autoFocus
                className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 placeholder:text-lf-text-3 outline-none focus:border-lf-border2 lf-transition"
              />
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Mois</label>
                <select
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 outline-none focus:border-lf-border2 lf-transition"
                >
                  <option value="">Choisir...</option>
                  {MONTHS_FR.map((m, i) => (
                    <option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Jour</label>
                <select
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 outline-none focus:border-lf-border2 lf-transition"
                >
                  <option value="">Choisir...</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d.toString().padStart(2, '0')}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year of birth */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Annee de naissance (optionnel)</label>
              <input
                type="number"
                value={yearOfBirth}
                onChange={e => setYearOfBirth(e.target.value)}
                placeholder="1990"
                min="1900"
                max={new Date().getFullYear()}
                className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 placeholder:text-lf-text-3 outline-none focus:border-lf-border2 lf-transition"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Idees cadeaux, rappels..."
                rows={2}
                className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[14px] text-lf-text-1 placeholder:text-lf-text-3 outline-none focus:border-lf-border2 lf-transition resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-lf-border text-[13px] font-medium text-lf-text-2 hover:bg-lf-surface2 lf-transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !month || !day}
              className="px-4 py-2 rounded-full bg-lf-pink text-white text-[13px] font-medium hover:opacity-80 lf-transition cursor-pointer disabled:opacity-50"
            >
              {birthday ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
