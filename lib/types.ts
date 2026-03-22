export interface Task {
  id: string
  title: string
  date: string
  link: string
  desc: string
  tags: string[]
  done: boolean
  createdAt: number
}

export interface Category {
  id: string
  name: string
  emoji: string
  accent: string
  cover: string
  pinned: boolean
  master: boolean
}

export type TasksMap = Record<string, Task[]>
export type ExpandedMap = Record<string, boolean>

export type ViewType = 'tasks' | 'deadlines' | 'calendar' | 'mealplan'

export type EventPriority = 'high' | 'medium' | 'low'
export type EventStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  color: string
  description: string
  location: string
  allDay: boolean
  recurrence: string | null
  priority: EventPriority
  status: EventStatus
  tags: string[]
}

export const PRIORITY_CONFIG: Record<EventPriority, { label: string; color: string; bg: string }> = {
  high: { label: 'Haute', color: '#E05555', bg: 'rgba(224,85,85,0.1)' },
  medium: { label: 'Moyenne', color: '#E8924A', bg: 'rgba(232,146,74,0.1)' },
  low: { label: 'Basse', color: '#A89F96', bg: 'rgba(168,159,150,0.1)' },
}

export const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'A faire', color: '#5B8BE8', icon: 'circle' },
  in_progress: { label: 'En cours', color: '#E8924A', icon: 'play' },
  done: { label: 'Termine', color: '#4BAE82', icon: 'check' },
  cancelled: { label: 'Annule', color: '#A89F96', icon: 'x' },
}

export interface Birthday {
  id: string
  name: string
  date: string // MM-DD format
  yearOfBirth: number | null
  notes: string
}

export const EVENT_COLORS = [
  '#5B8BE8', '#E05555', '#E8924A', '#E8C84A', '#4BAE82',
  '#9B7EDE', '#E8629A', '#4BC6B5', '#2A2722', '#A89F96',
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'education', name: 'Education', emoji: '\u{1F4DA}', accent: '#5B8BE8', cover: '', pinned: false, master: false },
  { id: 'pro', name: 'Professionnel', emoji: '\u{1F4BC}', accent: '#E8924A', cover: '', pinned: false, master: false },
  { id: 'perso', name: 'Personnel / Loisirs', emoji: '\u{1F3AF}', accent: '#4BAE82', cover: '', pinned: false, master: false },
  { id: 'materiel', name: 'Materiel', emoji: '\u{1F527}', accent: '#9B7EDE', cover: '', pinned: false, master: false },
  { id: 'kiff', name: 'Kiff', emoji: '\u2728', accent: '#E8924A', cover: '', pinned: false, master: false },
  { id: 'vacances', name: 'Vacances', emoji: '\u{1F334}', accent: '#4BAE82', cover: '', pinned: false, master: false },
  { id: 'master', name: 'Master', emoji: '\u{1F393}', accent: '#E05555', cover: '', pinned: true, master: true },
]

export const ACCENT_PRESETS = [
  '#E05555', '#E8924A', '#E8C84A', '#4BAE82', '#5B8BE8',
  '#9B7EDE', '#E8629A', '#4BC6B5', '#2A2722', '#A89F96',
]

export const EMOJI_PRESETS = [
  '\u{1F4DA}', '\u{1F4BC}', '\u{1F3AF}', '\u{1F527}', '\u2728', '\u{1F334}', '\u{1F393}', '\u{1F3C3}', '\u{1F4AA}', '\u{1F9E0}',
  '\u{1F3A8}', '\u{1F3B5}', '\u{1F331}', '\u{1F4A1}', '\u{1F680}', '\u2764\uFE0F', '\u2B50', '\u{1F525}', '\u{1F48E}', '\u{1F30D}',
  '\u{1F3E0}', '\u2708\uFE0F', '\u{1F4DD}', '\u{1F3AE}', '\u{1F34E}', '\u{1F4B0}', '\u{1F3AD}', '\u{1F9EA}', '\u{1F91D}', '\u{1F338}',
]
