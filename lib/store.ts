"use client"

import { create } from 'zustand'
import type { Category, Task, TasksMap, ExpandedMap, ViewType } from './types'
import { DEFAULT_CATEGORIES } from './types'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// API helper - all requests go through the password-protected API route
async function api(method: 'GET' | 'POST', body?: Record<string, unknown>) {
  const password = useLifeFlowStore.getState().password
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-app-password': password,
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch('/api/lifeflow', opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

interface LifeFlowState {
  categories: Category[]
  tasks: TasksMap
  expanded: ExpandedMap
  addFormOpen: Record<string, boolean>
  searchQuery: string
  currentView: ViewType
  completedCats: Set<string>
  password: string
  authenticated: boolean
  loading: boolean
  error: string | null

  // Calendar state
  calYear: number
  calMonth: number

  // Actions
  setPassword: (pw: string) => void
  load: () => Promise<void>
  save: () => void

  setSearchQuery: (q: string) => void
  setCurrentView: (v: ViewType) => void

  toggleCard: (catId: string) => void
  expandAll: () => void
  collapseAll: () => void

  openAddForm: (catId: string) => void
  closeAddForm: (catId: string) => void

  addTask: (catId: string, data: Omit<Task, 'id' | 'done' | 'createdAt'>) => void
  toggleTask: (catId: string, taskId: string) => string
  deleteTask: (catId: string, taskId: string) => void
  updateTask: (catId: string, taskId: string, data: Partial<Task>) => void

  addCategory: (data: Omit<Category, 'id'>) => void
  updateCategory: (catId: string, data: Partial<Category>) => void
  deleteCategory: (catId: string) => void

  calPrevMonth: () => void
  calNextMonth: () => void
  calGoToday: () => void
}

export const useLifeFlowStore = create<LifeFlowState>((set, get) => ({
  categories: [],
  tasks: {},
  expanded: {},
  addFormOpen: {},
  searchQuery: '',
  currentView: 'tasks',
  completedCats: new Set(),
  password: '',
  authenticated: false,
  loading: false,
  error: null,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),

  setPassword: (pw) => set({ password: pw }),

  load: async () => {
    set({ loading: true, error: null })
    try {
      const data = await api('GET')
      let cats: Category[] = data.categories || []
      const tasksData: TasksMap = data.tasks || {}

      // If no categories in DB, seed defaults
      if (cats.length === 0) {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
        await api('POST', { action: 'seedDefaults', categories: defaults })
        cats = defaults
      }

      // Ensure all categories have a tasks array
      cats.forEach(c => {
        if (!tasksData[c.id]) tasksData[c.id] = []
      })

      // Restore expanded state from sessionStorage (UI-only state)
      let expandedData: ExpandedMap = {}
      try {
        const se = sessionStorage.getItem('lf_expanded')
        if (se) expandedData = JSON.parse(se)
      } catch { /* ignore */ }

      const completedSet = new Set<string>()
      cats.forEach(c => {
        const arr = tasksData[c.id] || []
        if (arr.length > 0 && arr.every(t => t.done)) completedSet.add(c.id)
      })

      set({
        categories: cats,
        tasks: tasksData,
        expanded: expandedData,
        completedCats: completedSet,
        authenticated: true,
        loading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load'
      set({ error: message, loading: false, authenticated: false })
    }
  },

  // Save only stores UI state (expanded) locally
  save: () => {
    const { expanded } = get()
    try {
      sessionStorage.setItem('lf_expanded', JSON.stringify(expanded))
    } catch { /* ignore */ }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCurrentView: (v) => set({ currentView: v }),

  toggleCard: (catId) => {
    const { expanded, save } = get()
    const next = { ...expanded, [catId]: !expanded[catId] }
    set({ expanded: next })
    setTimeout(() => save(), 0)
  },

  expandAll: () => {
    const { categories, save } = get()
    const next: ExpandedMap = {}
    categories.forEach(c => { next[c.id] = true })
    set({ expanded: next })
    setTimeout(() => save(), 0)
  },

  collapseAll: () => {
    const { categories, save } = get()
    const next: ExpandedMap = {}
    categories.forEach(c => { next[c.id] = false })
    set({ expanded: next })
    setTimeout(() => save(), 0)
  },

  openAddForm: (catId) => {
    const { addFormOpen, expanded, save } = get()
    set({
      addFormOpen: { ...addFormOpen, [catId]: true },
      expanded: { ...expanded, [catId]: true }
    })
    setTimeout(() => save(), 0)
  },

  closeAddForm: (catId) => {
    const { addFormOpen } = get()
    set({ addFormOpen: { ...addFormOpen, [catId]: false } })
  },

  addTask: (catId, data) => {
    const { tasks, addFormOpen } = get()
    const newTask: Task = {
      id: uid(),
      ...data,
      done: false,
      createdAt: Date.now(),
    }
    const catTasks = [...(tasks[catId] || []), newTask]
    set({
      tasks: { ...tasks, [catId]: catTasks },
      addFormOpen: { ...addFormOpen, [catId]: false },
    })

    // Persist to Supabase in background
    api('POST', { action: 'addTask', catId, task: newTask }).catch(console.error)
  },

  toggleTask: (catId, taskId) => {
    const { tasks, completedCats, categories } = get()
    const catTasks = (tasks[catId] || []).map(t =>
      t.id === taskId ? { ...t, done: !t.done } : t
    )
    const newTasks = { ...tasks, [catId]: catTasks }

    const toggledTask = catTasks.find(t => t.id === taskId)

    // Check 100% celebration
    const newCompleted = new Set(completedCats)
    const total = catTasks.length
    const doneCount = catTasks.filter(t => t.done).length
    const pct = total > 0 ? Math.round(doneCount / total * 100) : 0

    let shouldCelebrate = false
    if (pct === 100 && !completedCats.has(catId)) {
      newCompleted.add(catId)
      shouldCelebrate = true
    } else if (pct < 100) {
      newCompleted.delete(catId)
    }

    set({ tasks: newTasks, completedCats: newCompleted })

    // Persist toggle to Supabase in background
    if (toggledTask) {
      api('POST', { action: 'updateTask', taskId, data: { done: toggledTask.done } }).catch(console.error)
    }

    if (shouldCelebrate) {
      const cat = categories.find(c => c.id === catId)
      return cat?.name || ''
    }
    return ''
  },

  deleteTask: (catId, taskId) => {
    const { tasks } = get()
    const catTasks = (tasks[catId] || []).filter(t => t.id !== taskId)
    set({ tasks: { ...tasks, [catId]: catTasks } })

    // Persist to Supabase in background
    api('POST', { action: 'deleteTask', taskId }).catch(console.error)
  },

  updateTask: (catId, taskId, data) => {
    const { tasks } = get()
    const catTasks = (tasks[catId] || []).map(t =>
      t.id === taskId ? { ...t, ...data } : t
    )
    set({ tasks: { ...tasks, [catId]: catTasks } })

    // Persist to Supabase in background
    api('POST', { action: 'updateTask', taskId, data }).catch(console.error)
  },

  addCategory: (data) => {
    const { categories, tasks } = get()
    const id = uid()
    const newCat: Category = { id, ...data }
    const newTasks = { ...tasks, [id]: [] }
    set({ categories: [...categories, newCat], tasks: newTasks })

    // Persist to Supabase in background
    api('POST', { action: 'addCategory', category: { id, ...data, sortOrder: categories.length } }).catch(console.error)
  },

  updateCategory: (catId, data) => {
    const { categories } = get()
    const updated = categories.map(c => c.id === catId ? { ...c, ...data } : c)
    set({ categories: updated })

    // Persist to Supabase in background
    api('POST', { action: 'updateCategory', catId, data }).catch(console.error)
  },

  deleteCategory: (catId) => {
    const { categories, tasks, expanded, completedCats } = get()
    const newCats = categories.filter(c => c.id !== catId)
    const newTasks = { ...tasks }
    delete newTasks[catId]
    const newExpanded = { ...expanded }
    delete newExpanded[catId]
    const newCompleted = new Set(completedCats)
    newCompleted.delete(catId)
    set({ categories: newCats, tasks: newTasks, expanded: newExpanded, completedCats: newCompleted })

    // Persist to Supabase in background
    api('POST', { action: 'deleteCategory', catId }).catch(console.error)

    // Save expanded state
    const { save } = get()
    setTimeout(() => save(), 0)
  },

  calPrevMonth: () => {
    const { calMonth, calYear } = get()
    if (calMonth === 0) {
      set({ calMonth: 11, calYear: calYear - 1 })
    } else {
      set({ calMonth: calMonth - 1 })
    }
  },

  calNextMonth: () => {
    const { calMonth, calYear } = get()
    if (calMonth === 11) {
      set({ calMonth: 0, calYear: calYear + 1 })
    } else {
      set({ calMonth: calMonth + 1 })
    }
  },

  calGoToday: () => {
    set({ calYear: new Date().getFullYear(), calMonth: new Date().getMonth() })
  },
}))
