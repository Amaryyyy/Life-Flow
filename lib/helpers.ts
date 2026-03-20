import type { Task } from './types'

export function getColorState(pct: number): 'state-green' | 'state-orange' | 'state-red' {
  if (pct > 80) return 'state-green'
  if (pct >= 50) return 'state-orange'
  return 'state-red'
}

export function getStateColor(state: string): string {
  if (state === 'state-green') return 'var(--lf-green)'
  if (state === 'state-orange') return 'var(--lf-orange)'
  return 'var(--lf-red)'
}

export function formatDate(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getDateClass(s: string): string {
  if (!s) return ''
  const diff = (new Date(s).getTime() - new Date().getTime()) / 86400000
  if (diff < 0) return 'overdue'
  if (diff < 3) return 'soon'
  return ''
}

export function taskMatchesSearch(t: Task, query: string): boolean {
  const q = query.toLowerCase()
  return (
    t.title.toLowerCase().includes(q) ||
    (t.desc || '').toLowerCase().includes(q) ||
    (t.tags || []).some(tag => tag.toLowerCase().includes(q))
  )
}

export function sortedTasks(tasks: Task[], isMaster: boolean): Task[] {
  if (!isMaster) return tasks
  return [...tasks].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
]
