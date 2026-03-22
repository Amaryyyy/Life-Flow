"use client"

import { useMemo, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, X, Plus, Cake, MapPin, Clock, Pencil, Trash2, ExternalLink, CalendarDays, CalendarRange, Calendar, List, Flag, Play, Pause, RotateCcw, BarChart3, Circle, Check, XCircle, GripVertical } from 'lucide-react'
import type { Category, Task, TasksMap, CalendarEvent, Birthday, EventPriority, EventStatus } from '@/lib/types'
import { MONTHS_FR, toDateStr } from '@/lib/helpers'
import { EVENT_COLORS, PRIORITY_CONFIG, STATUS_CONFIG } from '@/lib/types'
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

// Get the week containing a given date (Monday-Sunday)
function getWeekDates(year: number, month: number, dayOfMonth: number = 1): Date[] {
  const date = new Date(year, month, dayOfMonth)
  const dayOfWeek = date.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(year, month, dayOfMonth + mondayOffset)
  
  const week: Date[] = []
  for (let i = 0; i < 7; i++) {
    week.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
  }
  return week
}

// Generate hours for timeline (6am - 11pm)
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

// ============= WEEK VIEW =============
interface WeekViewProps {
  today: Date
  calYear: number
  calMonth: number
  taskDayMap: Record<string, CalendarTask[]>
  eventDayMap: Record<string, CalendarEvent[]>
  birthdays: Birthday[]
  onDayClick: (date: Date) => void
}

function WeekView({ today, calYear, calMonth, taskDayMap, eventDayMap, birthdays, onDayClick }: WeekViewProps) {
  const weekDates = useMemo(() => getWeekDates(calYear, calMonth, today.getDate()), [calYear, calMonth, today])
  
  return (
    <div className="overflow-x-auto">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-lf-border sticky top-0 bg-lf-surface z-10">
        <div className="p-2 text-[10px] text-lf-text-3 font-medium" />
        {weekDates.map((date, i) => {
          const isToday = date.getTime() === today.getTime()
          return (
            <div 
              key={i} 
              onClick={() => onDayClick(date)}
              className={`p-2 text-center border-l border-lf-border cursor-pointer hover:bg-lf-surface2 lf-transition ${isToday ? 'bg-lf-bg2' : ''}`}
            >
              <div className="text-[10px] text-lf-text-3 uppercase">{DOW_LABELS[i]}</div>
              <div className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-lf-text-1' : 'text-lf-text-2'}`}>
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Time grid */}
      <div className="max-h-[500px] overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-lf-border min-h-[50px]">
            <div className="p-1 text-[10px] text-lf-text-3 text-right pr-2">{hour}:00</div>
            {weekDates.map((date, di) => {
              const dateStr = toDateStr(date)
              const dayEvents = (eventDayMap[dateStr] || []).filter(e => {
                if (!e.startTime) return false
                const eventHour = parseInt(e.startTime.split(':')[0], 10)
                return eventHour === hour
              })
              
              return (
                <div 
                  key={di} 
                  className="border-l border-lf-border p-0.5 relative"
                  onClick={() => onDayClick(date)}
                >
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="text-[10px] px-1.5 py-1 rounded text-white font-medium truncate mb-0.5"
                      style={{ background: event.color }}
                    >
                      {event.startTime && <span className="opacity-80 mr-1">{event.startTime}</span>}
                      {event.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============= DAY VIEW =============
interface DayViewProps {
  today: Date
  calYear: number
  calMonth: number
  taskDayMap: Record<string, CalendarTask[]>
  eventDayMap: Record<string, CalendarEvent[]>
  birthdays: Birthday[]
  onOpenEvent: (event: CalendarEvent) => void
}

function DayView({ today, calYear, calMonth, taskDayMap, eventDayMap, birthdays, onOpenEvent }: DayViewProps) {
  const [selectedDay, setSelectedDay] = useState(() => {
    const t = new Date()
    return new Date(calYear, calMonth, t.getMonth() === calMonth && t.getFullYear() === calYear ? t.getDate() : 1)
  })
  
  const dateStr = toDateStr(selectedDay)
  const dayTasks = taskDayMap[dateStr] || []
  const dayEvents = eventDayMap[dateStr] || []
  const dayBirthdays = birthdays.filter(b => birthdayMatchesDate(b, selectedDay))
  const isToday = selectedDay.getTime() === today.getTime()
  
  const prevDay = () => setSelectedDay(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))
  const nextDay = () => setSelectedDay(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
  
  return (
    <div className="p-4">
      {/* Day selector */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={prevDay} className="w-8 h-8 rounded-lg border border-lf-border flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 cursor-pointer">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-[11px] text-lf-text-3 uppercase">{DOW_LABELS[(selectedDay.getDay() + 6) % 7]}</div>
          <div className={`text-2xl font-semibold ${isToday ? 'text-lf-text-1' : 'text-lf-text-2'}`}>
            {selectedDay.getDate()} {MONTHS_FR[selectedDay.getMonth()]}
          </div>
        </div>
        <button onClick={nextDay} className="w-8 h-8 rounded-lg border border-lf-border flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 cursor-pointer">
          <ChevronRight size={16} />
        </button>
      </div>
      
      {/* Birthdays */}
      {dayBirthdays.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-lf-pink/5 border border-lf-pink/20">
          <div className="flex items-center gap-2 text-lf-pink text-[13px] font-medium mb-2">
            <Cake size={14} />
            Anniversaires
          </div>
          {dayBirthdays.map(b => (
            <div key={b.id} className="text-[13px] text-lf-text-1">{b.name}</div>
          ))}
        </div>
      )}
      
      {/* Timeline */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {HOURS.map(hour => {
          const hourEvents = dayEvents.filter(e => {
            if (!e.startTime) return hour === 6
            const eventHour = parseInt(e.startTime.split(':')[0], 10)
            return eventHour === hour
          })
          
          return (
            <div key={hour} className="flex gap-3 min-h-[40px]">
              <div className="w-12 text-right text-[11px] text-lf-text-3 pt-1 flex-shrink-0">
                {hour}:00
              </div>
              <div className="flex-1 border-t border-lf-border pt-1">
                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => onOpenEvent(event)}
                    className="text-[12px] px-2 py-1.5 rounded-lg text-white font-medium mb-1 cursor-pointer hover:opacity-90 lf-transition"
                    style={{ background: event.color }}
                  >
                    <div className="flex items-center gap-2">
                      {event.startTime && <span className="opacity-80">{event.startTime}</span>}
                      <span>{event.title}</span>
                    </div>
                    {event.location && (
                      <div className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />
                        {event.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Tasks for the day */}
      {dayTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-lf-border">
          <div className="text-[12px] font-semibold text-lf-text-2 mb-2 uppercase">Taches</div>
          <div className="space-y-1">
            {dayTasks.map(({ task, cat }) => (
              <div 
                key={task.id}
                className={`text-[13px] px-3 py-2 rounded-lg border border-lf-border flex items-center gap-2 ${task.done ? 'opacity-50 line-through' : ''}`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.accent }} />
                <span className="text-lf-text-2">{cat.emoji}</span>
                <span className="text-lf-text-1">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============= AGENDA VIEW =============
interface AgendaViewProps {
  allTasksWithDates: CalendarTask[]
  events: CalendarEvent[]
  birthdays: Birthday[]
  today: Date
  onJumpToTask: (catId: string, taskId: string) => void
  onOpenEvent: (event: CalendarEvent) => void
}

function AgendaView({ allTasksWithDates, events, birthdays, today, onJumpToTask, onOpenEvent }: AgendaViewProps) {
  // Combine and sort upcoming items
  const upcomingItems = useMemo(() => {
    const items: Array<{
      type: 'task' | 'event' | 'birthday'
      date: Date
      data: CalendarTask | CalendarEvent | Birthday
    }> = []
    
    const todayTime = today.getTime()
    
    // Add tasks
    allTasksWithDates.forEach(t => {
      const [y, m, d] = t.dateStr.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      if (date.getTime() >= todayTime - 86400000 * 7) { // Include last 7 days
        items.push({ type: 'task', date, data: t })
      }
    })
    
    // Add events
    events.forEach(e => {
      const [y, m, d] = e.date.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      if (date.getTime() >= todayTime - 86400000 * 7) {
        items.push({ type: 'event', date, data: e })
      }
    })
    
    // Add birthdays for current year
    birthdays.forEach(b => {
      const [month, day] = b.date.split('-').map(Number)
      const date = new Date(today.getFullYear(), month - 1, day)
      if (date.getTime() >= todayTime - 86400000 * 7) {
        items.push({ type: 'birthday', date, data: b })
      }
    })
    
    // Sort by date
    items.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    return items
  }, [allTasksWithDates, events, birthdays, today])
  
  // Group by date
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof upcomingItems> = {}
    upcomingItems.forEach(item => {
      const key = toDateStr(item.date)
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }, [upcomingItems])
  
  const groupKeys = Object.keys(groupedItems).sort()
  
  return (
    <div className="p-4 max-h-[600px] overflow-y-auto">
      {groupKeys.length === 0 ? (
        <p className="text-center text-lf-text-3 py-8">Aucun evenement a venir</p>
      ) : (
        <div className="space-y-4">
          {groupKeys.map(dateKey => {
            const [y, m, d] = dateKey.split('-').map(Number)
            const date = new Date(y, m - 1, d)
            const isToday = date.getTime() === today.getTime()
            const isPast = date.getTime() < today.getTime()
            const items = groupedItems[dateKey]
            
            return (
              <div key={dateKey}>
                <div className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${
                  isToday ? 'text-lf-text-1' : isPast ? 'text-lf-text-3' : 'text-lf-text-2'
                }`}>
                  {isToday ? "Aujourd'hui" : `${DOW_LABELS[(date.getDay() + 6) % 7]} ${d} ${MONTHS_FR[m - 1]}`}
                </div>
                <div className="space-y-1.5">
                  {items.map((item, i) => {
                    if (item.type === 'task') {
                      const { task, cat } = item.data as CalendarTask
                      return (
                        <div
                          key={`task-${task.id}`}
                          onClick={() => onJumpToTask(cat.id, task.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-lf-border hover:border-lf-border2 cursor-pointer lf-transition ${
                            task.done ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.accent }} />
                          <span className="text-[12px] text-lf-text-2">{cat.emoji}</span>
                          <span className={`text-[13px] text-lf-text-1 flex-1 ${task.done ? 'line-through' : ''}`}>
                            {task.title}
                          </span>
                        </div>
                      )
                    }
                    
                    if (item.type === 'event') {
                      const event = item.data as CalendarEvent
                      return (
                        <div
                          key={`event-${event.id}`}
                          onClick={() => onOpenEvent(event)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white cursor-pointer hover:opacity-90 lf-transition"
                          style={{ background: event.color }}
                        >
                          {event.startTime && (
                            <span className="text-[11px] opacity-80">{event.startTime}</span>
                          )}
                          <span className="text-[13px] font-medium">{event.title}</span>
                          {event.location && (
                            <span className="text-[11px] opacity-70 flex items-center gap-1 ml-auto">
                              <MapPin size={10} />
                              {event.location}
                            </span>
                          )}
                        </div>
                      )
                    }
                    
                    if (item.type === 'birthday') {
                      const birthday = item.data as Birthday
                      return (
                        <div
                          key={`bday-${birthday.id}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-lf-pink/10 border border-lf-pink/20"
                        >
                          <Cake size={14} className="text-lf-pink" />
                          <span className="text-[13px] text-lf-text-1">{birthday.name}</span>
                        </div>
                      )
                    }
                    
                    return null
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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
  // View mode: month, week, day, agenda, stats, pomodoro
  type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda' | 'stats' | 'pomodoro'
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  
  // Calendar events and birthdays state
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [loading, setLoading] = useState(true)
  
  // Drag and drop state
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)
  
  // Day detail modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Birthdays section collapsed state (persisted in sessionStorage)
  const [birthdaysCollapsed, setBirthdaysCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('lf-birthdays-collapsed') === 'true'
    }
    return false
  })
  
  const toggleBirthdaysCollapsed = useCallback(() => {
    setBirthdaysCollapsed(prev => {
      const next = !prev
      sessionStorage.setItem('lf-birthdays-collapsed', String(next))
      return next
    })
  }, [])
  
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
  
  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, event: CalendarEvent) => {
    e.stopPropagation()
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', event.id)
  }, [])
  
  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDropTargetDate(dateStr)
  }, [])
  
  const handleDragLeave = useCallback(() => {
    setDropTargetDate(null)
  }, [])
  
  const handleDrop = useCallback(async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDropTargetDate(null)
    
    if (draggedEvent && draggedEvent.date !== dateStr) {
      await updateEvent(draggedEvent.id, { date: dateStr })
    }
    setDraggedEvent(null)
  }, [draggedEvent, updateEvent])
  
  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null)
    setDropTargetDate(null)
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
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg sm:text-[1.3rem] font-normal tracking-tight text-lf-text-1">
              {MONTHS_FR[calMonth]} {calYear}
            </span>
            {/* View Mode Switcher */}
            <div className="hidden sm:flex items-center bg-lf-bg rounded-lg p-0.5 gap-0.5">
              {([
                { mode: 'month' as const, icon: CalendarDays, label: 'Mois' },
                { mode: 'week' as const, icon: CalendarRange, label: 'Semaine' },
                { mode: 'day' as const, icon: Calendar, label: 'Jour' },
                { mode: 'agenda' as const, icon: List, label: 'Agenda' },
                { mode: 'stats' as const, icon: BarChart3, label: 'Stats' },
                { mode: 'pomodoro' as const, icon: Clock, label: 'Pomodoro' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer lf-transition ${
                    viewMode === mode
                      ? 'bg-lf-surface text-lf-text-1 shadow-sm'
                      : 'text-lf-text-3 hover:text-lf-text-2'
                  }`}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile View Switcher */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
              className="sm:hidden px-2 py-1.5 rounded-lg border border-lf-border bg-lf-surface text-[11px] font-medium text-lf-text-1 cursor-pointer"
            >
              <option value="month">Mois</option>
              <option value="week">Semaine</option>
              <option value="day">Jour</option>
              <option value="agenda">Agenda</option>
              <option value="stats">Stats</option>
              <option value="pomodoro">Pomodoro</option>
            </select>
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

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <>
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

                const isDropTarget = dropTargetDate === dateStr
                
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(cell.date)}
                    onDragOver={(e) => handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dateStr)}
                    className={`border-r border-b border-lf-border min-h-[60px] sm:min-h-[100px] p-1 sm:p-[8px_6px_6px] relative lf-transition cursor-pointer hover:bg-lf-surface2 ${
                      cell.otherMonth ? 'opacity-40' : ''
                    } ${isToday ? 'bg-lf-bg2' : ''} ${i % 7 === 6 ? '!border-r-0' : ''} ${
                      isDropTarget ? 'ring-2 ring-inset ring-lf-text-1/30 bg-lf-surface2' : ''
                    }`}
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
                        draggable
                        onDragStart={(e) => handleDragStart(e, event)}
                        onDragEnd={handleDragEnd}
                        className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-[1px] sm:py-[2px] rounded text-white whitespace-nowrap overflow-hidden text-ellipsis font-medium leading-[1.4] cursor-grab active:cursor-grabbing ${
                          event.priority === 'high' ? 'ring-1 ring-lf-red/50' : ''
                        } ${event.status === 'done' ? 'opacity-50 line-through' : ''}`}
                        style={{ background: event.color }}
                        title={`${event.title}${event.priority === 'high' ? ' (Haute priorite)' : ''}`}
                      >
                        <span className="hidden sm:inline">
                          {event.priority === 'high' && <Flag size={8} className="inline mr-0.5" />}
                          {event.title}
                        </span>
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
          </>
        )}

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <WeekView
            today={today}
            calYear={calYear}
            calMonth={calMonth}
            taskDayMap={taskDayMap}
            eventDayMap={eventDayMap}
            birthdays={birthdays}
            onDayClick={setSelectedDate}
          />
        )}

        {/* DAY VIEW */}
        {viewMode === 'day' && (
          <DayView
            today={today}
            calYear={calYear}
            calMonth={calMonth}
            taskDayMap={taskDayMap}
            eventDayMap={eventDayMap}
            birthdays={birthdays}
            onOpenEvent={openEditEvent}
          />
        )}

        {/* AGENDA VIEW */}
        {viewMode === 'agenda' && (
          <AgendaView
            allTasksWithDates={allTasksWithDates}
            events={events}
            birthdays={birthdays}
            today={today}
            onJumpToTask={onJumpToTask}
            onOpenEvent={openEditEvent}
          />
        )}

        {/* STATISTICS VIEW */}
        {viewMode === 'stats' && (
          <StatisticsPanel
            events={events}
            tasks={allTasksWithDates}
            birthdays={birthdays}
          />
        )}

        {/* POMODORO VIEW */}
        {viewMode === 'pomodoro' && (
          <PomodoroTimer />
        )}
      </div>

      {/* Birthdays Section - Collapsible */}
      <div
        className="mt-4 bg-lf-surface border-[1.5px] border-lf-border rounded-[18px] overflow-hidden"
        style={{ boxShadow: 'var(--lf-shadow-sm)' }}
      >
        <div 
          className={`flex items-center justify-between px-3 sm:px-[22px] py-3 sm:py-4 cursor-pointer hover:bg-lf-surface2 lf-transition ${birthdaysCollapsed ? '' : 'border-b border-lf-border'}`}
          onClick={toggleBirthdaysCollapsed}
        >
          <div className="flex items-center gap-2">
            <Cake size={16} className="text-lf-pink" />
            <span className="font-serif text-base sm:text-lg font-normal text-lf-text-1">Anniversaires</span>
            {birthdays.length > 0 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-lf-pink/10 text-lf-pink">
                {birthdays.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); openAddBirthday(); }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-lf-text-1 text-lf-surface flex items-center justify-center cursor-pointer hover:opacity-80 lf-transition"
            >
              <Plus size={14} />
            </button>
            <ChevronDown 
              size={18} 
              className={`text-lf-text-3 lf-transition ${birthdaysCollapsed ? '-rotate-90' : ''}`} 
            />
          </div>
        </div>
        {!birthdaysCollapsed && (
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
        )}
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
  const [priority, setPriority] = useState<EventPriority>(event?.priority || 'medium')
  const [status, setStatus] = useState<EventStatus>(event?.status || 'pending')
  const [tagsInput, setTagsInput] = useState((event?.tags || []).join(', '))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
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
      priority,
      status,
      tags,
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

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Priorite</label>
                <div className="flex gap-1">
                  {(['high', 'medium', 'low'] as EventPriority[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer lf-transition ${
                        priority === p
                          ? 'ring-1 ring-offset-1'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        background: PRIORITY_CONFIG[p].bg,
                        color: PRIORITY_CONFIG[p].color,
                        ...(priority === p ? { '--tw-ring-color': PRIORITY_CONFIG[p].color } as React.CSSProperties : {}),
                      }}
                    >
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Statut</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as EventStatus)}
                  className="w-full px-3 py-2 rounded-[10px] bg-lf-bg border border-lf-border text-[13px] text-lf-text-1 outline-none focus:border-lf-border2 lf-transition cursor-pointer"
                >
                  {(['pending', 'in_progress', 'done', 'cancelled'] as EventStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[12px] font-medium text-lf-text-2 mb-1.5">Tags (separes par virgule)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="travail, urgent, projet"
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

// ============= STATISTICS PANEL =============
interface StatisticsPanelProps {
  events: CalendarEvent[]
  tasks: CalendarTask[]
  birthdays: Birthday[]
}

export function StatisticsPanel({ events, tasks, birthdays }: StatisticsPanelProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    
    // Events stats
    const totalEvents = events.length
    const eventsByStatus = {
      pending: events.filter(e => e.status === 'pending').length,
      in_progress: events.filter(e => e.status === 'in_progress').length,
      done: events.filter(e => e.status === 'done').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
    }
    const eventsByPriority = {
      high: events.filter(e => e.priority === 'high').length,
      medium: events.filter(e => e.priority === 'medium').length,
      low: events.filter(e => e.priority === 'low').length,
    }
    const eventsThisMonth = events.filter(e => {
      const [y, m] = e.date.split('-').map(Number)
      return y === thisYear && m - 1 === thisMonth
    }).length
    
    // Tasks stats  
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.task.done).length
    const pendingTasks = totalTasks - completedTasks
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    
    // Birthdays this month
    const birthdaysThisMonth = birthdays.filter(b => {
      const month = parseInt(b.date.split('-')[0], 10)
      return month - 1 === thisMonth
    }).length
    
    return {
      totalEvents,
      eventsByStatus,
      eventsByPriority,
      eventsThisMonth,
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate,
      birthdaysThisMonth,
    }
  }, [events, tasks, birthdays])
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-serif text-lg text-lf-text-1 flex items-center gap-2">
        <BarChart3 size={18} />
        Statistiques
      </h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-lf-bg border border-lf-border">
          <div className="text-2xl font-bold text-lf-text-1">{stats.totalEvents}</div>
          <div className="text-[11px] text-lf-text-3 uppercase">Evenements</div>
        </div>
        <div className="p-3 rounded-xl bg-lf-bg border border-lf-border">
          <div className="text-2xl font-bold text-lf-text-1">{stats.eventsThisMonth}</div>
          <div className="text-[11px] text-lf-text-3 uppercase">Ce mois</div>
        </div>
        <div className="p-3 rounded-xl bg-lf-bg border border-lf-border">
          <div className="text-2xl font-bold text-lf-green">{stats.completionRate}%</div>
          <div className="text-[11px] text-lf-text-3 uppercase">Taches faites</div>
        </div>
        <div className="p-3 rounded-xl bg-lf-pink/10 border border-lf-pink/20">
          <div className="text-2xl font-bold text-lf-pink">{stats.birthdaysThisMonth}</div>
          <div className="text-[11px] text-lf-text-3 uppercase">Anniversaires</div>
        </div>
      </div>
      
      {/* Status Breakdown */}
      <div className="p-4 rounded-xl bg-lf-bg border border-lf-border">
        <div className="text-[12px] font-semibold text-lf-text-2 mb-3 uppercase">Statut des evenements</div>
        <div className="space-y-2">
          {(['pending', 'in_progress', 'done', 'cancelled'] as EventStatus[]).map(s => {
            const count = stats.eventsByStatus[s]
            const pct = stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0
            return (
              <div key={s} className="flex items-center gap-3">
                <div className="w-20 text-[12px] text-lf-text-2">{STATUS_CONFIG[s].label}</div>
                <div className="flex-1 h-2 bg-lf-surface2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full lf-transition"
                    style={{ width: `${pct}%`, background: STATUS_CONFIG[s].color }}
                  />
                </div>
                <div className="w-8 text-[11px] text-lf-text-3 text-right">{count}</div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Priority Breakdown */}
      <div className="p-4 rounded-xl bg-lf-bg border border-lf-border">
        <div className="text-[12px] font-semibold text-lf-text-2 mb-3 uppercase">Priorites</div>
        <div className="flex gap-4">
          {(['high', 'medium', 'low'] as EventPriority[]).map(p => (
            <div key={p} className="flex-1 text-center">
              <div
                className="text-xl font-bold"
                style={{ color: PRIORITY_CONFIG[p].color }}
              >
                {stats.eventsByPriority[p]}
              </div>
              <div className="text-[10px] text-lf-text-3 uppercase">{PRIORITY_CONFIG[p].label}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Tasks Progress */}
      <div className="p-4 rounded-xl bg-lf-bg border border-lf-border">
        <div className="text-[12px] font-semibold text-lf-text-2 mb-3 uppercase">Progression des taches</div>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--lf-surface2)" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="var(--lf-green)"
                strokeWidth="6"
                strokeDasharray={`${stats.completionRate * 1.76} 176`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-lf-text-1">
              {stats.completionRate}%
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-[12px]">
              <span className="text-lf-text-2">Terminees</span>
              <span className="text-lf-green font-medium">{stats.completedTasks}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-lf-text-2">En attente</span>
              <span className="text-lf-text-1 font-medium">{stats.pendingTasks}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============= POMODORO TIMER =============
interface PomodoroTimerProps {
  onComplete?: () => void
}

export function PomodoroTimer({ onComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<'work' | 'break' | 'longBreak'>('work')
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  
  const DURATIONS = {
    work: 25 * 60,
    break: 5 * 60,
    longBreak: 15 * 60,
  }
  
  const MODE_LABELS = {
    work: 'Travail',
    break: 'Pause',
    longBreak: 'Longue pause',
  }
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setIsRunning(false)
      if (mode === 'work') {
        const newSessions = sessions + 1
        setSessions(newSessions)
        onComplete?.()
        // Every 4 sessions, take a long break
        if (newSessions % 4 === 0) {
          setMode('longBreak')
          setTimeLeft(DURATIONS.longBreak)
        } else {
          setMode('break')
          setTimeLeft(DURATIONS.break)
        }
      } else {
        setMode('work')
        setTimeLeft(DURATIONS.work)
      }
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, mode, sessions, onComplete])
  
  const toggleTimer = () => setIsRunning(!isRunning)
  
  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(DURATIONS[mode])
  }
  
  const switchMode = (newMode: typeof mode) => {
    setMode(newMode)
    setTimeLeft(DURATIONS[newMode])
    setIsRunning(false)
  }
  
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const progress = ((DURATIONS[mode] - timeLeft) / DURATIONS[mode]) * 100
  
  const modeColor = mode === 'work' ? '#E05555' : '#4BAE82'
  
  return (
    <div className="p-4">
      <h3 className="font-serif text-lg text-lf-text-1 flex items-center gap-2 mb-4">
        <Clock size={18} />
        Pomodoro
      </h3>
      
      {/* Mode Tabs */}
      <div className="flex bg-lf-bg rounded-lg p-1 mb-6">
        {(['work', 'break', 'longBreak'] as const).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2 rounded-md text-[12px] font-medium cursor-pointer lf-transition ${
              mode === m
                ? 'bg-lf-surface text-lf-text-1 shadow-sm'
                : 'text-lf-text-3 hover:text-lf-text-2'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
      
      {/* Timer Display */}
      <div className="relative w-48 h-48 mx-auto mb-6">
        <svg className="w-48 h-48 -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="var(--lf-surface2)"
            strokeWidth="8"
          />
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke={modeColor}
            strokeWidth="8"
            strokeDasharray={`${progress * 5.53} 553`}
            strokeLinecap="round"
            className="lf-transition"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-lf-text-1 font-mono">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-[12px] text-lf-text-3 uppercase mt-1">{MODE_LABELS[mode]}</div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={resetTimer}
          className="w-10 h-10 rounded-full border border-lf-border flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 cursor-pointer lf-transition"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={toggleTimer}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white cursor-pointer hover:opacity-90 lf-transition"
          style={{ background: modeColor }}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <div className="w-10 h-10 rounded-full border border-lf-border flex items-center justify-center">
          <span className="text-[12px] font-bold text-lf-text-2">{sessions}</span>
        </div>
      </div>
      
      {/* Session info */}
      <div className="mt-4 text-center text-[11px] text-lf-text-3">
        {sessions} session{sessions !== 1 ? 's' : ''} completee{sessions !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
