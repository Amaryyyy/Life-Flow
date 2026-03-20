"use client"

import { useState, useCallback, useMemo } from 'react'
import { useLifeFlowStore } from '@/lib/store'
import { taskMatchesSearch } from '@/lib/helpers'
import type { Category, Task } from '@/lib/types'
import { TopBar, HeaderStats, GlobalProgress, NavTabs } from '@/components/lifeflow/top-bar'
import { CategoryCard } from '@/components/lifeflow/category-card'
import { CategoryModal } from '@/components/lifeflow/category-modal'
import { TaskEditModal } from '@/components/lifeflow/task-edit-modal'
import { ConfirmDeleteModal } from '@/components/lifeflow/confirm-delete-modal'
import { DeadlinesView, getDeadlineBadgeCount } from '@/components/lifeflow/deadlines-view'
import { CalendarView } from '@/components/lifeflow/calendar-view'
import { Toast } from '@/components/lifeflow/toast'
import { useConfetti } from '@/hooks/use-confetti'
import { useToast } from '@/hooks/use-lifeflow-toast'
import { Lock } from 'lucide-react'

function PasswordGate() {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const setPassword = useLifeFlowStore(s => s.setPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pw.trim()) return
    setSubmitting(true)
    setError('')
    setPassword(pw)
    // Need to wait a tick for zustand to update before load reads the password
    await new Promise(r => setTimeout(r, 50))
    try {
      await useLifeFlowStore.getState().load()
      const state = useLifeFlowStore.getState()
      if (!state.authenticated) {
        setError('Mot de passe incorrect')
      }
    } catch {
      setError('Mot de passe incorrect')
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--lf-bg)' }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[360px] mx-4 p-8 rounded-[var(--lf-radius)] flex flex-col items-center gap-5"
        style={{
          background: 'var(--lf-surface)',
          boxShadow: 'var(--lf-shadow-lg)',
          border: '1px solid var(--lf-border)',
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'var(--lf-bg2)' }}
        >
          <Lock className="w-5 h-5" style={{ color: 'var(--lf-text-2)' }} />
        </div>
        <div className="text-center">
          <h1 className="text-[22px] font-bold font-serif" style={{ color: 'var(--lf-text-1)' }}>
            LifeFlow
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--lf-text-2)' }}>
            Entrez le mot de passe pour acceder a vos taches
          </p>
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="Mot de passe"
          autoFocus
          className="w-full px-4 py-2.5 rounded-[var(--lf-radius-sm)] text-[14px] outline-none lf-transition"
          style={{
            background: 'var(--lf-bg)',
            border: '1px solid var(--lf-border)',
            color: 'var(--lf-text-1)',
          }}
        />
        {error && (
          <p className="text-[12px] font-medium" style={{ color: 'var(--lf-red)' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting || !pw.trim()}
          className="w-full py-2.5 rounded-[var(--lf-radius-sm)] text-[14px] font-semibold lf-transition cursor-pointer disabled:opacity-50"
          style={{
            background: 'var(--lf-text-1)',
            color: 'var(--lf-surface)',
            border: 'none',
          }}
        >
          {submitting ? 'Connexion...' : 'Connexion'}
        </button>
      </form>
    </div>
  )
}

export default function LifeFlowApp() {
  const store = useLifeFlowStore()
  const authenticated = useLifeFlowStore(s => s.authenticated)
  const loading = useLifeFlowStore(s => s.loading)
  const { canvasRef, launch: launchConfetti } = useConfetti()
  const { visible: toastVisible, message: toastMessage, icon: toastIcon, showToast } = useToast()

  // Modal states
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTaskState, setEditingTaskState] = useState<{ catId: string; taskId: string } | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [pendingDeleteCatId, setPendingDeleteCatId] = useState<string | null>(null)

  // Global stats - ALL hooks must be above early returns
  const globalStats = useMemo(() => {
    let done = 0
    let total = 0
    store.categories.forEach(c => {
      const catTasks = store.tasks[c.id] || []
      done += catTasks.filter(t => t.done).length
      total += catTasks.length
    })
    const pct = total === 0 ? 0 : Math.round(done / total * 100)
    return { done, remaining: total - done, total, pct, catCount: store.categories.length }
  }, [store.categories, store.tasks])

  const deadlineBadge = useMemo(
    () => getDeadlineBadgeCount(store.categories, store.tasks),
    [store.categories, store.tasks]
  )

  // Sorted categories (pinned first)
  const sortedCategories = useMemo(
    () => [...store.categories].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)),
    [store.categories]
  )

  // Search
  const searchMatchCount = useMemo(() => {
    if (!store.searchQuery) return 0
    let count = 0
    store.categories.forEach(c => {
      ;(store.tasks[c.id] || []).forEach(t => {
        if (taskMatchesSearch(t, store.searchQuery)) count++
      })
    })
    return count
  }, [store.searchQuery, store.categories, store.tasks])

  // Category modal
  const openCatModal = useCallback((catId?: string) => {
    setEditingCatId(catId || null)
    setCatModalOpen(true)
  }, [])

  const handleSaveCategory = useCallback((data: Omit<Category, 'id'>) => {
    if (editingCatId) {
      store.updateCategory(editingCatId, data)
      showToast('Categorie mise a jour', '\u2713')
    } else {
      store.addCategory(data)
      showToast(`Categorie "${data.name}" creee`, '\u2728')
    }
    setCatModalOpen(false)
    setEditingCatId(null)
  }, [editingCatId, store, showToast])

  const handleDeleteCategoryRequest = useCallback(() => {
    setCatModalOpen(false)
    setPendingDeleteCatId(editingCatId)
    setConfirmDeleteOpen(true)
  }, [editingCatId])

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteCatId) return
    const cat = store.categories.find(c => c.id === pendingDeleteCatId)
    store.deleteCategory(pendingDeleteCatId)
    showToast(`"${cat?.name}" supprimee`, '\uD83D\uDDD1')
    setConfirmDeleteOpen(false)
    setPendingDeleteCatId(null)
  }, [pendingDeleteCatId, store, showToast])

  // Task modal
  const openTaskModal = useCallback((catId: string, taskId: string) => {
    setEditingTaskState({ catId, taskId })
    setTaskModalOpen(true)
  }, [])

  const handleSaveTask = useCallback((data: Partial<Task>) => {
    if (!editingTaskState) return
    store.updateTask(editingTaskState.catId, editingTaskState.taskId, data)
    showToast('Tache mise a jour', '\u2713')
    setTaskModalOpen(false)
    setEditingTaskState(null)
  }, [editingTaskState, store, showToast])

  // Task actions
  const handleToggleTask = useCallback((catId: string, taskId: string) => {
    const result = store.toggleTask(catId, taskId)
    if (result) {
      launchConfetti()
      showToast(`"${result}" est a 100% \u2014 Bravo !`, '\uD83C\uDFC6')
    }
  }, [store, launchConfetti, showToast])

  const handleAddTask = useCallback((catId: string, data: Omit<Task, 'id' | 'done' | 'createdAt'>) => {
    store.addTask(catId, data)
    showToast('Tache ajoutee', '\u2713')
  }, [store, showToast])

  const handleDeleteTask = useCallback((catId: string, taskId: string) => {
    store.deleteTask(catId, taskId)
    showToast('Tache supprimee', '\uD83D\uDDD1')
  }, [store, showToast])

  // Jump to task from deadlines/calendar
  const handleJumpToTask = useCallback((catId: string, taskId: string) => {
    store.setCurrentView('tasks')
    const expanded = { ...store.expanded, [catId]: true }
    useLifeFlowStore.setState({ expanded, currentView: 'tasks' })
    store.save()
    setTimeout(() => {
      const el = document.getElementById(`task-${taskId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.outline = '2px solid var(--lf-orange)'
        el.style.outlineOffset = '2px'
        setTimeout(() => {
          el.style.outline = ''
          el.style.outlineOffset = ''
        }, 2000)
      }
    }, 200)
  }, [store])

  // Get editing task for modal
  const editingTask = editingTaskState
    ? (store.tasks[editingTaskState.catId] || []).find(t => t.id === editingTaskState.taskId) || null
    : null

  // Get editing category for modal
  const editingCategory = editingCatId
    ? store.categories.find(c => c.id === editingCatId) || null
    : null

  // Get pending delete category info
  const pendingDeleteCat = pendingDeleteCatId
    ? store.categories.find(c => c.id === pendingDeleteCatId)
    : null

  // Show password gate if not authenticated
  if (!authenticated && !loading) {
    return <PasswordGate />
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--lf-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--lf-border2)', borderTopColor: 'transparent' }}
          />
          <p className="text-[13px] font-medium" style={{ color: 'var(--lf-text-2)' }}>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[9999]"
      />

      {/* Toast */}
      <Toast visible={toastVisible} message={toastMessage} icon={toastIcon} />

      <main className="max-w-[1320px] mx-auto px-6 pb-20">
        <TopBar onOpenCatModal={() => openCatModal()} />

        <HeaderStats
          done={globalStats.done}
          remaining={globalStats.remaining}
          catCount={globalStats.catCount}
        />

        <GlobalProgress percentage={globalStats.pct} />

        <NavTabs
          currentView={store.currentView}
          onChangeView={store.setCurrentView}
          deadlineBadge={deadlineBadge}
          onExpandAll={store.expandAll}
          onCollapseAll={store.collapseAll}
        />

        {/* Search banner */}
        {store.searchQuery && store.currentView === 'tasks' && (
          <div className="bg-lf-orange-bg border border-lf-orange rounded-[10px] px-4 py-2.5 text-[12.5px] text-lf-orange font-medium mb-[18px] flex items-center justify-between gap-2.5 animate-lf-fade-up">
            <span>
              {searchMatchCount} resultat{searchMatchCount !== 1 ? 's' : ''} pour &quot;{store.searchQuery}&quot;
            </span>
            <button
              onClick={() => store.setSearchQuery('')}
              className="bg-transparent border-none cursor-pointer text-lf-orange text-base leading-none"
            >
              {'\u00D7'}
            </button>
          </div>
        )}

        {/* Tasks View */}
        {store.currentView === 'tasks' && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-5">
            {sortedCategories.map(cat => (
              <CategoryCard
                key={cat.id}
                category={cat}
                tasks={store.tasks[cat.id] || []}
                isExpanded={store.expanded[cat.id] || false}
                isAddFormOpen={store.addFormOpen[cat.id] || false}
                searchQuery={store.searchQuery}
                onToggleCard={() => store.toggleCard(cat.id)}
                onOpenAddForm={() => store.openAddForm(cat.id)}
                onCloseAddForm={() => store.closeAddForm(cat.id)}
                onAddTask={(data) => handleAddTask(cat.id, data)}
                onToggleTask={(taskId) => handleToggleTask(cat.id, taskId)}
                onDeleteTask={(taskId) => handleDeleteTask(cat.id, taskId)}
                onEditTask={(taskId) => openTaskModal(cat.id, taskId)}
                onEditCategory={() => openCatModal(cat.id)}
              />
            ))}
          </div>
        )}

        {/* Deadlines View */}
        {store.currentView === 'deadlines' && (
          <DeadlinesView
            categories={store.categories}
            tasks={store.tasks}
            onJumpToTask={handleJumpToTask}
          />
        )}

        {/* Calendar View */}
        {store.currentView === 'calendar' && (
          <CalendarView
            categories={store.categories}
            tasks={store.tasks}
            calYear={store.calYear}
            calMonth={store.calMonth}
            onPrevMonth={store.calPrevMonth}
            onNextMonth={store.calNextMonth}
            onToday={store.calGoToday}
            onJumpToTask={handleJumpToTask}
          />
        )}
      </main>

      {/* Modals */}
      <CategoryModal
        isOpen={catModalOpen}
        editingCategory={editingCategory}
        onClose={() => { setCatModalOpen(false); setEditingCatId(null) }}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategoryRequest}
      />

      <TaskEditModal
        isOpen={taskModalOpen}
        task={editingTask}
        onClose={() => { setTaskModalOpen(false); setEditingTaskState(null) }}
        onSave={handleSaveTask}
      />

      <ConfirmDeleteModal
        isOpen={confirmDeleteOpen}
        categoryName={pendingDeleteCat?.name || ''}
        taskCount={(pendingDeleteCatId && store.tasks[pendingDeleteCatId]?.length) || 0}
        onClose={() => { setConfirmDeleteOpen(false); setPendingDeleteCatId(null) }}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
