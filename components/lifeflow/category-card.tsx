"use client"

import { ChevronDown, Settings } from 'lucide-react'
import type { Category, Task } from '@/lib/types'
import { getColorState, getStateColor, getDateClass, sortedTasks, taskMatchesSearch } from '@/lib/helpers'
import { TaskItem } from './task-item'
import { AddTaskForm } from './add-task-form'

interface CategoryCardProps {
  category: Category
  tasks: Task[]
  isExpanded: boolean
  isAddFormOpen: boolean
  searchQuery: string
  onToggleCard: () => void
  onOpenAddForm: () => void
  onCloseAddForm: () => void
  onAddTask: (data: Omit<Task, 'id' | 'done' | 'createdAt'>) => void
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
  onEditCategory: () => void
}

export function CategoryCard({
  category,
  tasks: catTasks,
  isExpanded,
  isAddFormOpen,
  searchQuery,
  onToggleCard,
  onOpenAddForm,
  onCloseAddForm,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onEditCategory,
}: CategoryCardProps) {
  const sorted = sortedTasks(catTasks, category.master)
  const total = sorted.length
  const done = sorted.filter(t => t.done).length
  const pct = total === 0 ? 0 : Math.round(done / total * 100)
  const state = getColorState(pct)
  const fillColor = getStateColor(state)

  // Render task list
  const renderTasks = () => {
    if (total === 0) {
      return (
        <div className="text-center py-6 px-4 text-lf-text-3 text-[12.5px]">
          {'Aucune tache \u2014 ajoutez-en une \u2726'}
        </div>
      )
    }

    if (searchQuery) {
      return sorted.map(t => (
        <TaskItem
          key={t.id}
          task={t}
          catId={category.id}
          extraClass={
            taskMatchesSearch(t, searchQuery)
              ? 'border-lf-orange !bg-lf-orange-bg'
              : 'opacity-25'
          }
          onToggle={() => onToggleTask(t.id)}
          onEdit={() => onEditTask(t.id)}
          onDelete={() => onDeleteTask(t.id)}
        />
      ))
    }

    if (category.master) {
      const overdue = sorted.filter(t => !t.done && t.date && getDateClass(t.date) === 'overdue')
      const soon = sorted.filter(t => !t.done && t.date && getDateClass(t.date) === 'soon')
      const rest = sorted.filter(t => !overdue.includes(t) && !soon.includes(t))

      return (
        <>
          {overdue.length > 0 && (
            <>
              <div className="text-[10px] font-semibold text-lf-text-3 uppercase tracking-wider px-1 pt-1.5 pb-0.5">
                {'\uD83D\uDD34 En retard'}
              </div>
              {overdue.map(t => (
                <TaskItem
                  key={t.id} task={t} catId={category.id}
                  onToggle={() => onToggleTask(t.id)}
                  onEdit={() => onEditTask(t.id)}
                  onDelete={() => onDeleteTask(t.id)}
                />
              ))}
            </>
          )}
          {soon.length > 0 && (
            <>
              <div className="text-[10px] font-semibold text-lf-text-3 uppercase tracking-wider px-1 pt-1.5 pb-0.5">
                {'\uD83D\uDFE1 Bientot'}
              </div>
              {soon.map(t => (
                <TaskItem
                  key={t.id} task={t} catId={category.id}
                  onToggle={() => onToggleTask(t.id)}
                  onEdit={() => onEditTask(t.id)}
                  onDelete={() => onDeleteTask(t.id)}
                />
              ))}
            </>
          )}
          {rest.length > 0 && (
            <>
              <div className="text-[10px] font-semibold text-lf-text-3 uppercase tracking-wider px-1 pt-1.5 pb-0.5">
                {'\uD83D\uDCC5 Planifiees'}
              </div>
              {rest.map(t => (
                <TaskItem
                  key={t.id} task={t} catId={category.id}
                  onToggle={() => onToggleTask(t.id)}
                  onEdit={() => onEditTask(t.id)}
                  onDelete={() => onDeleteTask(t.id)}
                />
              ))}
            </>
          )}
        </>
      )
    }

    return sorted.map(t => (
      <TaskItem
        key={t.id} task={t} catId={category.id}
        onToggle={() => onToggleTask(t.id)}
        onEdit={() => onEditTask(t.id)}
        onDelete={() => onDeleteTask(t.id)}
      />
    ))
  }

  return (
    <div
      className={`bg-lf-surface border-[1.5px] border-lf-border rounded-[18px] overflow-hidden relative lf-transition animate-lf-fade-up ${
        !isExpanded ? 'hover:shadow-md hover:-translate-y-[3px] cursor-pointer' : 'shadow-md'
      } ${category.pinned ? '!border-lf-text-2' : ''}`}
      style={{
        boxShadow: isExpanded ? 'var(--lf-shadow-md)' : 'var(--lf-shadow-sm)',
        borderLeft: category.accent ? `4px solid ${category.accent}` : undefined,
      }}
    >
      {/* Cover */}
      {category.cover && (
        <img
          src={category.cover}
          alt=""
          className="w-full h-20 object-cover block border-b border-lf-border"
          style={{ borderRadius: '16px 16px 0 0' }}
        />
      )}

      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 flex items-start gap-3 cursor-pointer select-none"
        onClick={onToggleCard}
      >
        <div
          className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl flex-shrink-0 border-[1.5px] lf-transition"
          style={{
            background: category.accent ? `${category.accent}22` : 'var(--lf-bg2)',
            borderColor: category.accent ? `${category.accent}55` : 'var(--lf-border)',
          }}
        >
          {category.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[1.1rem] font-normal tracking-tight flex items-center gap-1.5 text-lf-text-1">
            {category.name}
            {category.pinned && (
              <span className="text-[10px] bg-lf-text-2 text-lf-surface px-1.5 py-[1px] rounded-full font-sans font-medium">
                {'\uD83D\uDCCC epinglee'}
              </span>
            )}
            {category.master && (
              <span className="text-[10px] bg-lf-text-1 text-lf-surface px-1.5 py-[1px] rounded-full font-sans font-medium">
                deadline
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-lf-text-3 mt-0.5">
            {done} / {total} tache{total !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={onEditCategory}
            className="w-7 h-7 rounded-lg border border-transparent bg-transparent cursor-pointer flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border lf-transition"
            title="Personnaliser"
          >
            <Settings size={13} />
          </button>
          <button
            onClick={onToggleCard}
            className="w-7 h-7 rounded-lg border border-transparent bg-transparent cursor-pointer flex items-center justify-center text-lf-text-3 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border lf-transition"
          >
            <ChevronDown
              size={14}
              className={`lf-transition ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pb-3.5">
        <div className="h-[5px] bg-lf-surface2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: fillColor,
              transition: 'width 0.6s cubic-bezier(.4,0,.2,1), background-color 0.4s',
            }}
          />
        </div>
        <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: fillColor }}>
          {pct}%
        </span>
      </div>

      {/* Tasks panel */}
      {isExpanded && (
        <div className="border-t border-lf-border">
          <div className="px-3 py-2.5 flex flex-col gap-[5px] max-h-[380px] overflow-y-auto lf-scrollbar">
            {renderTasks()}
          </div>
          <AddTaskForm
            catId={category.id}
            isOpen={isAddFormOpen}
            onOpen={onOpenAddForm}
            onClose={onCloseAddForm}
            onAdd={onAddTask}
          />
        </div>
      )}
    </div>
  )
}
