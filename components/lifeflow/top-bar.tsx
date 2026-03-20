"use client"

import { Search, Moon, Sun, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLifeFlowStore } from '@/lib/store'

interface TopBarProps {
  onOpenCatModal: () => void
}

export function TopBar({ onOpenCatModal }: TopBarProps) {
  const { searchQuery, setSearchQuery } = useLifeFlowStore()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center justify-between pt-5 gap-3 flex-wrap">
      <div className="font-serif text-2xl tracking-tight text-lf-text-1">
        Life <em className="text-lf-text-2 italic">Flow</em>
      </div>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lf-text-3 pointer-events-none" size={13} />
          <input
            type="search"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.trim())}
            className="bg-lf-surface border-[1.5px] border-lf-border rounded-full py-[7px] pl-8 pr-3.5 font-sans text-[13px] text-lf-text-1 outline-none w-[200px] focus:w-[240px] focus:border-lf-text-2 placeholder:text-lf-text-3 lf-transition"
            style={{ boxShadow: 'var(--lf-shadow-sm)' }}
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-[10px] border-[1.5px] border-lf-border bg-lf-surface flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border2 lf-transition"
          style={{ boxShadow: 'var(--lf-shadow-sm)' }}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Add category */}
        <button
          onClick={onOpenCatModal}
          className="flex items-center gap-1.5 px-4 py-[7px] bg-lf-text-1 text-lf-surface rounded-full font-sans text-[12.5px] font-medium cursor-pointer hover:opacity-85 lf-transition"
          style={{ boxShadow: 'var(--lf-shadow-sm)' }}
        >
          <Plus size={13} strokeWidth={2.5} />
          Nouvelle categorie
        </button>
      </div>
    </div>
  )
}

interface HeaderStatsProps {
  done: number
  remaining: number
  catCount: number
}

export function HeaderStats({ done, remaining, catCount }: HeaderStatsProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="py-7 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="font-serif text-[2.2rem] font-normal tracking-tight leading-[1.1] text-balance text-lf-text-1">
          {dateStr}
        </h1>
        <p className="mt-1 text-lf-text-3 text-[12.5px] font-light">
          Organisez, progressez, epanouissez-vous.
        </p>
      </div>
      <div className="flex gap-2.5 flex-wrap">
        <StatChip
          icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>}
          value={done}
          label="completees"
        />
        <StatChip
          icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
          value={remaining}
          label="restantes"
        />
        <StatChip
          icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
          value={catCount}
          label="categories"
        />
      </div>
    </div>
  )
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div
      className="bg-lf-surface border border-lf-border rounded-full px-4 py-[7px] text-[12px] font-medium text-lf-text-2 flex items-center gap-1.5"
      style={{ boxShadow: 'var(--lf-shadow-sm)' }}
    >
      {icon}
      <strong className="text-lf-text-1 text-[15px] font-semibold">{value}</strong> {label}
    </div>
  )
}

interface GlobalProgressProps {
  percentage: number
}

export function GlobalProgress({ percentage }: GlobalProgressProps) {
  return (
    <div
      className="bg-lf-surface border border-lf-border rounded-full px-5 py-2.5 flex items-center gap-3.5 mb-7"
      style={{ boxShadow: 'var(--lf-shadow-sm)' }}
    >
      <span className="text-[12px] text-lf-text-3 font-medium whitespace-nowrap">Progression globale</span>
      <div className="flex-1 h-1.5 bg-lf-surface2 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, var(--lf-green), #5BC3A0)',
            transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>
      <span className="text-[12px] font-semibold text-lf-green whitespace-nowrap">{percentage}%</span>
    </div>
  )
}

interface NavTabsProps {
  currentView: string
  onChangeView: (v: 'tasks' | 'deadlines' | 'calendar') => void
  deadlineBadge: number
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function NavTabs({ currentView, onChangeView, deadlineBadge, onExpandAll, onCollapseAll }: NavTabsProps) {
  const tabs = [
    {
      id: 'tasks' as const,
      label: 'Taches',
      icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
    },
    {
      id: 'deadlines' as const,
      label: 'Rappels',
      icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
      badge: deadlineBadge,
    },
    {
      id: 'calendar' as const,
      label: 'Calendrier',
      icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    },
  ]

  return (
    <div className="flex items-center justify-between flex-wrap gap-2.5 mb-6">
      <div
        className="flex gap-1 bg-lf-surface border-[1.5px] border-lf-border rounded-full p-1 w-fit"
        style={{ boxShadow: 'var(--lf-shadow-sm)' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChangeView(tab.id)}
            className={`flex items-center gap-[7px] px-[18px] py-[7px] rounded-full font-sans text-[12.5px] font-medium cursor-pointer border-none whitespace-nowrap lf-transition ${
              currentView === tab.id
                ? 'bg-lf-text-1 text-lf-surface'
                : 'bg-transparent text-lf-text-2 hover:text-lf-text-1 hover:bg-lf-surface2'
            }`}
            style={currentView === tab.id ? { boxShadow: 'var(--lf-shadow-sm)' } : {}}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 rounded-full min-w-[18px] text-center leading-4 ${
                  currentView === tab.id ? 'bg-white/25 text-lf-surface' : 'bg-lf-red text-white'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {currentView === 'tasks' && (
        <div className="flex gap-2">
          <button
            onClick={onExpandAll}
            className="w-9 h-9 rounded-[10px] border-[1.5px] border-lf-border bg-lf-surface flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border2 lf-transition"
            style={{ boxShadow: 'var(--lf-shadow-sm)' }}
            title="Tout deplier"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={onCollapseAll}
            className="w-9 h-9 rounded-[10px] border-[1.5px] border-lf-border bg-lf-surface flex items-center justify-center text-lf-text-2 hover:bg-lf-surface2 hover:text-lf-text-1 hover:border-lf-border2 lf-transition"
            style={{ boxShadow: 'var(--lf-shadow-sm)' }}
            title="Tout replier"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
