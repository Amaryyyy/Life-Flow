"use client"

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, Loader2 } from 'lucide-react'
import { useLifeFlowStore } from '@/lib/store'

interface Recipe {
  id: string
  name: string
  tags: string[]
  image?: string
  link?: string
  ingredients: { name: string; quantity: string }[]
  instructions?: string
  pinned: boolean
  archived: boolean
}

interface MealPlan {
  [key: string]: {
    recipeId: string
    name: string
    ingredients: { name: string; quantity: string }[]
  }
}

interface ShoppingList {
  [aisle: string]: Array<{ id: string; name: string; quantity: string; checked: boolean }>
}

const MEAL_TYPES = ['Petit-dejeuner', 'Dejeuner', 'Gouter', 'Diner', 'Collation'] as const
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

// API helper using password from store
async function mealApi(method: 'GET' | 'POST', body?: Record<string, unknown>, queryParams?: string) {
  const password = useLifeFlowStore.getState().password
  const url = queryParams ? `/api/lifeflow?${queryParams}` : '/api/lifeflow'
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-app-password': password,
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export function MealPlanView() {
  const [subView, setSubView] = useState<'recipes' | 'planner' | 'shopping'>('recipes')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [mealPlan, setMealPlan] = useState<MealPlan>({})
  const [shoppingList, setShoppingList] = useState<ShoppingList>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Recipe modal
  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTag, setFilterTag] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Planner state
  const [weekCount, setWeekCount] = useState(4)
  const [currentWeekStart, setCurrentWeekStart] = useState(0)
  const [displayWeeks, setDisplayWeeks] = useState(1)
  const [selectRecipeModal, setSelectRecipeModal] = useState(false)
  const [currentMealSlot, setCurrentMealSlot] = useState<string | null>(null)

  // Load data from Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await mealApi('GET', undefined, 'type=mealplan')
      setRecipes(data.recipes || [])
      setMealPlan(data.mealPlan || {})
      setShoppingList(data.shoppingList || {})
    } catch (err) {
      console.error('Failed to load meal plan data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Recipe actions
  const saveRecipe = async (recipe: Recipe, isNew: boolean) => {
    setSaving(true)
    try {
      if (isNew) {
        await mealApi('POST', { action: 'addRecipe', recipe })
        setRecipes(prev => [recipe, ...prev])
      } else {
        await mealApi('POST', { action: 'updateRecipe', recipeId: recipe.id, data: recipe })
        setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r))
      }
    } catch (err) {
      console.error('Failed to save recipe:', err)
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (id: string) => {
    const recipe = recipes.find(r => r.id === id)
    if (!recipe) return
    const newPinned = !recipe.pinned
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, pinned: newPinned } : r))
    try {
      await mealApi('POST', { action: 'updateRecipe', recipeId: id, data: { pinned: newPinned } })
    } catch (err) {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, pinned: !newPinned } : r))
    }
  }

  const toggleArchive = async (id: string) => {
    const recipe = recipes.find(r => r.id === id)
    if (!recipe) return
    const newArchived = !recipe.archived
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, archived: newArchived } : r))
    try {
      await mealApi('POST', { action: 'updateRecipe', recipeId: id, data: { archived: newArchived } })
    } catch (err) {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, archived: !newArchived } : r))
    }
  }

  const deleteRecipe = async (id: string) => {
    if (!confirm('Supprimer cette recette ?')) return
    const oldRecipes = recipes
    setRecipes(prev => prev.filter(r => r.id !== id))
    try {
      await mealApi('POST', { action: 'deleteRecipe', recipeId: id })
    } catch (err) {
      setRecipes(oldRecipes)
    }
  }

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      let statusMatch = true
      if (filterStatus === 'active') statusMatch = !recipe.archived
      if (filterStatus === 'pinned') statusMatch = recipe.pinned
      if (filterStatus === 'archived') statusMatch = recipe.archived

      const tagMatch = !filterTag || recipe.tags.includes(filterTag)
      const searchMatch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase())

      return statusMatch && tagMatch && searchMatch
    })
  }, [recipes, filterStatus, filterTag, searchQuery])

  // Planner navigation
  const canGoPrev = currentWeekStart > 0
  const canGoNext = currentWeekStart + displayWeeks < weekCount

  const prevWeeks = () => {
    if (canGoPrev) setCurrentWeekStart(Math.max(0, currentWeekStart - displayWeeks))
  }

  const nextWeeks = () => {
    if (canGoNext) setCurrentWeekStart(Math.min(weekCount - displayWeeks, currentWeekStart + displayWeeks))
  }

  const removeMeal = async (slotKey: string) => {
    const oldPlan = { ...mealPlan }
    setMealPlan(prev => {
      const newPlan = { ...prev }
      delete newPlan[slotKey]
      return newPlan
    })
    try {
      await mealApi('POST', { action: 'removeMealSlot', slotKey })
    } catch (err) {
      setMealPlan(oldPlan)
    }
  }

  const assignRecipe = async (recipeId: string) => {
    if (!currentMealSlot) return
    const recipe = recipes.find(r => r.id === recipeId)
    if (!recipe) return

    const mealData = {
      recipeId: recipe.id,
      name: recipe.name,
      ingredients: recipe.ingredients
    }

    setMealPlan(prev => ({ ...prev, [currentMealSlot]: mealData }))
    setSelectRecipeModal(false)
    
    try {
      await mealApi('POST', {
        action: 'setMealSlot',
        slotKey: currentMealSlot,
        recipeId: recipe.id,
        recipeName: recipe.name,
        ingredients: recipe.ingredients
      })
    } catch (err) {
      console.error('Failed to assign recipe:', err)
    }
    setCurrentMealSlot(null)
  }

  // Generate shopping list
  const generateShopping = async () => {
    const aisles: Record<string, Array<{ name: string; quantity: string }>> = {
      'Fruits & Legumes': [],
      'Viande & Poisson': [],
      'Produits laitiers': [],
      'Epicerie': [],
      'Surgeles': [],
      'Boulangerie': [],
      'Divers': []
    }

    const ingredientMap = new Map<string, { name: string; quantity: string }>()

    Object.values(mealPlan).forEach(meal => {
      meal.ingredients.forEach(ing => {
        const key = ing.name.toLowerCase()
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!
          if (ing.quantity && existing.quantity) {
            if (ing.quantity.match(/\d+\s*(g|kg|ml|l)/i)) {
              const val1 = parseFloat(existing.quantity) || 0
              const val2 = parseFloat(ing.quantity) || 0
              const unit = ing.quantity.match(/(g|kg|ml|l)/i)?.[0] || ''
              existing.quantity = `${val1 + val2}${unit}`
            } else {
              existing.quantity = `${existing.quantity}, ${ing.quantity}`
            }
          }
        } else {
          ingredientMap.set(key, { ...ing })
        }
      })
    })

    ingredientMap.forEach((ing) => {
      let aisle = 'Divers'
      const key = ing.name.toLowerCase()
      
      if (key.match(/tomate|laitue|carotte|oignon|poivron|courgette|pomme|banane|orange|citron|salade|epinard|chou/i)) {
        aisle = 'Fruits & Legumes'
      } else if (key.match(/poulet|boeuf|bœuf|porc|poisson|saumon|thon|jambon|viande|steak/i)) {
        aisle = 'Viande & Poisson'
      } else if (key.match(/lait|yaourt|fromage|beurre|creme|œuf|oeuf/i)) {
        aisle = 'Produits laitiers'
      } else if (key.match(/pates|pate|riz|farine|sucre|huile|sel|poivre|epice|conserve/i)) {
        aisle = 'Epicerie'
      } else if (key.match(/surgele|surgeles|glace|legume surgele/i)) {
        aisle = 'Surgeles'
      } else if (key.match(/pain|baguette|croissant|brioche/i)) {
        aisle = 'Boulangerie'
      }

      aisles[aisle].push(ing)
    })

    // Convert to shopping items with IDs
    const items: Array<{ id: string; aisle: string; name: string; quantity: string; checked: boolean }> = []
    Object.entries(aisles).forEach(([aisle, ingList]) => {
      ingList.forEach(ing => {
        items.push({
          id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          aisle,
          name: ing.name,
          quantity: ing.quantity,
          checked: false
        })
      })
    })

    // Save to Supabase
    try {
      await mealApi('POST', { action: 'setShoppingList', items })
      // Update local state
      const grouped: ShoppingList = {}
      items.forEach(item => {
        if (!grouped[item.aisle]) grouped[item.aisle] = []
        grouped[item.aisle].push(item)
      })
      setShoppingList(grouped)
      setSubView('shopping')
    } catch (err) {
      console.error('Failed to generate shopping list:', err)
    }
  }

  const toggleIngredient = async (aisle: string, index: number) => {
    const item = shoppingList[aisle]?.[index]
    if (!item) return

    const newChecked = !item.checked
    setShoppingList(prev => {
      const newList = { ...prev }
      newList[aisle] = [...newList[aisle]]
      newList[aisle][index] = { ...newList[aisle][index], checked: newChecked }
      return newList
    })

    try {
      await mealApi('POST', { action: 'toggleShoppingItem', itemId: item.id, checked: newChecked })
    } catch (err) {
      setShoppingList(prev => {
        const newList = { ...prev }
        newList[aisle] = [...newList[aisle]]
        newList[aisle][index] = { ...newList[aisle][index], checked: !newChecked }
        return newList
      })
    }
  }

  const clearShoppingList = async () => {
    if (!confirm('Reinitialiser la liste ?')) return
    const oldList = shoppingList
    setShoppingList({})
    try {
      await mealApi('POST', { action: 'clearShoppingList' })
    } catch (err) {
      setShoppingList(oldList)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--lf-text-2)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Sub Navigation */}
      <div className="flex gap-2 mb-6 p-1 rounded-[var(--lf-radius)] w-fit" style={{ background: 'var(--lf-bg2)' }}>
        <button
          onClick={() => setSubView('recipes')}
          className={`px-5 py-2 rounded-[var(--lf-radius-sm)] text-[13px] font-semibold lf-transition ${
            subView === 'recipes' ? 'lf-tab-active' : ''
          }`}
          style={subView === 'recipes' ? {
            background: 'var(--lf-text-1)',
            color: 'var(--lf-surface)'
          } : {
            background: 'transparent',
            color: 'var(--lf-text-2)'
          }}
        >
          Recettes
        </button>
        <button
          onClick={() => setSubView('planner')}
          className={`px-5 py-2 rounded-[var(--lf-radius-sm)] text-[13px] font-semibold lf-transition ${
            subView === 'planner' ? 'lf-tab-active' : ''
          }`}
          style={subView === 'planner' ? {
            background: 'var(--lf-text-1)',
            color: 'var(--lf-surface)'
          } : {
            background: 'transparent',
            color: 'var(--lf-text-2)'
          }}
        >
          Planification
        </button>
        <button
          onClick={() => setSubView('shopping')}
          className={`px-5 py-2 rounded-[var(--lf-radius-sm)] text-[13px] font-semibold lf-transition ${
            subView === 'shopping' ? 'lf-tab-active' : ''
          }`}
          style={subView === 'shopping' ? {
            background: 'var(--lf-text-1)',
            color: 'var(--lf-surface)'
          } : {
            background: 'transparent',
            color: 'var(--lf-text-2)'
          }}
        >
          Liste de courses
        </button>
      </div>

      {/* Recipes View */}
      {subView === 'recipes' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[22px] font-bold font-serif" style={{ color: 'var(--lf-text-1)' }}>
              Bibliotheque de recettes
            </h2>
            <button
              onClick={() => { setEditingRecipeId(null); setRecipeModalOpen(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--lf-radius-sm)] text-[13px] font-semibold lf-transition"
              style={{ background: 'var(--lf-text-1)', color: 'var(--lf-surface)' }}
            >
              <Plus className="w-4 h-4" />
              Nouvelle recette
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-[var(--lf-radius-sm)] text-[13px] outline-none lf-transition"
              style={{ background: 'var(--lf-surface)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            >
              <option value="all">Toutes</option>
              <option value="active">Actives</option>
              <option value="pinned">Epinglees</option>
              <option value="archived">Archivees</option>
            </select>

            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-3 py-2 rounded-[var(--lf-radius-sm)] text-[13px] outline-none lf-transition"
              style={{ background: 'var(--lf-surface)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            >
              <option value="">Tous les tags</option>
              <option value="vege">Vegetarien</option>
              <option value="rapide">Rapide</option>
              <option value="italien">Italien</option>
              <option value="asiatique">Asiatique</option>
              <option value="dessert">Dessert</option>
            </select>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--lf-text-3)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 rounded-[var(--lf-radius-sm)] text-[13px] outline-none lf-transition"
                style={{ background: 'var(--lf-surface)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
              />
            </div>
          </div>

          {/* Recipe Grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
            {filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                className={`rounded-[var(--lf-radius)] overflow-hidden lf-transition hover:scale-[1.02] ${recipe.archived ? 'opacity-50' : ''}`}
                style={{ background: 'var(--lf-surface)', border: '2px solid var(--lf-border)', boxShadow: 'var(--lf-shadow)' }}
              >
                {recipe.image ? (
                  <img src={recipe.image} alt={recipe.name} className="w-full h-48 object-cover" crossOrigin="anonymous" />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-4xl" style={{ background: 'var(--lf-bg2)' }}>
                    🍽️
                  </div>
                )}
                
                <div className="p-4">
                  {recipe.pinned && <span className="text-xl mb-2 block">📌</span>}
                  <h3 className="text-[17px] font-bold font-serif mb-2" style={{ color: 'var(--lf-text-1)' }}>
                    {recipe.name}
                  </h3>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {recipe.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: 'var(--lf-bg2)', color: 'var(--lf-text-2)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[13px] mb-3" style={{ color: 'var(--lf-text-2)' }}>
                    {recipe.ingredients.length} ingredients
                  </p>
                  {recipe.link && (
                    <a
                      href={recipe.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] mb-3 block hover:underline"
                      style={{ color: 'var(--lf-orange)' }}
                    >
                      🔗 Voir la recette
                    </a>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setEditingRecipeId(recipe.id); setRecipeModalOpen(true) }}
                      className="flex-1 px-3 py-2 rounded-[var(--lf-radius-sm)] text-[12px] font-semibold lf-transition"
                      style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => togglePin(recipe.id)}
                      className="px-3 py-2 rounded-[var(--lf-radius-sm)] text-[12px] lf-transition"
                      style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)' }}
                    >
                      {recipe.pinned ? '📌' : '📍'}
                    </button>
                    <button
                      onClick={() => toggleArchive(recipe.id)}
                      className="px-3 py-2 rounded-[var(--lf-radius-sm)] text-[12px] lf-transition"
                      style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)' }}
                    >
                      {recipe.archived ? '📂' : '🗄️'}
                    </button>
                    <button
                      onClick={() => deleteRecipe(recipe.id)}
                      className="px-3 py-2 rounded-[var(--lf-radius-sm)] text-[12px] lf-transition"
                      style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planner View */}
      {subView === 'planner' && (
        <div>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h2 className="text-[22px] font-bold font-serif" style={{ color: 'var(--lf-text-1)' }}>
              Planification des repas
            </h2>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[13px] font-semibold" style={{ color: 'var(--lf-text-2)' }}>Semaines totales:</label>
                <select
                  value={weekCount}
                  onChange={(e) => setWeekCount(parseInt(e.target.value))}
                  className="px-3 py-2 rounded-[var(--lf-radius-sm)] text-[13px] outline-none"
                  style={{ background: 'var(--lf-surface)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="6">6</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[13px] font-semibold" style={{ color: 'var(--lf-text-2)' }}>Afficher:</label>
                <select
                  value={displayWeeks}
                  onChange={(e) => setDisplayWeeks(parseInt(e.target.value))}
                  className="px-3 py-2 rounded-[var(--lf-radius-sm)] text-[13px] outline-none"
                  style={{ background: 'var(--lf-surface)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
                >
                  <option value="1">1 semaine</option>
                  <option value="2">2 semaines</option>
                  <option value="3">3 semaines</option>
                </select>
              </div>
              <button
                onClick={generateShopping}
                className="px-4 py-2 rounded-[var(--lf-radius-sm)] text-[13px] font-semibold lf-transition"
                style={{ background: 'var(--lf-orange)', color: 'white' }}
              >
                Generer liste de courses
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={prevWeeks}
              disabled={!canGoPrev}
              className="p-2 rounded-[var(--lf-radius-sm)] lf-transition disabled:opacity-30"
              style={{ background: 'var(--lf-surface)', border: '1px solid var(--lf-border)' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[14px] font-semibold" style={{ color: 'var(--lf-text-2)' }}>
              Semaine{displayWeeks > 1 ? 's' : ''} {currentWeekStart + 1}{displayWeeks > 1 ? ` - ${currentWeekStart + displayWeeks}` : ''}
            </span>
            <button
              onClick={nextWeeks}
              disabled={!canGoNext}
              className="p-2 rounded-[var(--lf-radius-sm)] lf-transition disabled:opacity-30"
              style={{ background: 'var(--lf-surface)', border: '1px solid var(--lf-border)' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Planner Grid */}
          <div className="overflow-x-auto">
            {Array.from({ length: displayWeeks }).map((_, weekOffset) => {
              const weekIndex = currentWeekStart + weekOffset
              if (weekIndex >= weekCount) return null

              return (
                <div key={weekIndex} className="mb-8">
                  <h3 className="text-[18px] font-bold font-serif mb-4" style={{ color: 'var(--lf-text-1)' }}>
                    Semaine {weekIndex + 1}
                  </h3>
                  <div className="grid gap-3" style={{ gridTemplateColumns: '120px repeat(7, minmax(120px, 1fr))' }}>
                    {/* Headers */}
                    <div></div>
                    {DAYS.map(day => (
                      <div
                        key={day}
                        className="p-3 rounded-[var(--lf-radius-sm)] text-center text-[13px] font-semibold"
                        style={{ background: 'var(--lf-text-1)', color: 'var(--lf-surface)' }}
                      >
                        {day}
                      </div>
                    ))}

                    {/* Meal Slots */}
                    {MEAL_TYPES.map(mealType => (
                      <div key={`row-${weekIndex}-${mealType}`} className="contents">
                        <div
                          className="flex items-center text-[13px] font-semibold"
                          style={{ color: 'var(--lf-text-1)' }}
                        >
                          {mealType}
                        </div>
                        {DAYS.map((_, dayIndex) => {
                          const slotKey = `w${weekIndex}-d${dayIndex}-${mealType}`
                          const meal = mealPlan[slotKey]

                          return (
                            <div
                              key={slotKey}
                              onClick={() => { setCurrentMealSlot(slotKey); setSelectRecipeModal(true) }}
                              className={`p-3 rounded-[var(--lf-radius-sm)] min-h-[80px] cursor-pointer lf-transition ${
                                meal ? 'hover:opacity-80' : 'hover:border-color-text-1'
                              }`}
                              style={{
                                background: meal ? 'var(--lf-orange-bg)' : 'var(--lf-surface)',
                                border: meal ? '2px solid var(--lf-orange)' : '2px dashed var(--lf-border)',
                              }}
                            >
                              {meal ? (
                                <div>
                                  <div className="text-[13px] font-semibold mb-2" style={{ color: 'var(--lf-orange)' }}>
                                    {meal.name}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeMeal(slotKey) }}
                                    className="text-[11px] hover:underline"
                                    style={{ color: 'var(--lf-orange)' }}
                                  >
                                    x Retirer
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[12px] text-center h-full flex items-center justify-center" style={{ color: 'var(--lf-text-3)' }}>
                                  +
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Shopping List View */}
      {subView === 'shopping' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[22px] font-bold font-serif" style={{ color: 'var(--lf-text-1)' }}>
              Liste de courses
            </h2>
            <button
              onClick={clearShoppingList}
              className="px-4 py-2 rounded-[var(--lf-radius-sm)] text-[13px] font-semibold lf-transition"
              style={{ background: 'var(--lf-surface)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            >
              Reinitialiser
            </button>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
            {Object.entries(shoppingList).map(([aisle, items]) => {
              if (items.length === 0) return null

              const checked = items.filter(i => i.checked).length
              const progress = (checked / items.length) * 100

              return (
                <div
                  key={aisle}
                  className="p-5 rounded-[var(--lf-radius)]"
                  style={{ background: 'var(--lf-surface)', border: '2px solid var(--lf-border)', boxShadow: 'var(--lf-shadow)' }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[16px] font-bold font-serif" style={{ color: 'var(--lf-text-1)' }}>
                      {aisle}
                    </h3>
                    <span className="text-[13px]" style={{ color: 'var(--lf-text-2)' }}>
                      {checked}/{items.length}
                    </span>
                  </div>
                  <div className="h-2 rounded-full mb-4" style={{ background: 'var(--lf-bg2)' }}>
                    <div
                      className="h-full rounded-full lf-transition"
                      style={{ width: `${progress}%`, background: 'var(--lf-green)' }}
                    />
                  </div>
                  {items.map((item, idx) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-2 mb-1 rounded-[var(--lf-radius-sm)] cursor-pointer hover:bg-lf-bg lf-transition ${
                        item.checked ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleIngredient(aisle, idx)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[13px]" style={{ color: 'var(--lf-text-1)' }}>
                        <strong>{item.name}</strong>
                        {item.quantity && ` - ${item.quantity}`}
                      </span>
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {recipeModalOpen && (
        <RecipeModal
          recipeId={editingRecipeId}
          recipes={recipes}
          saving={saving}
          onClose={() => { setRecipeModalOpen(false); setEditingRecipeId(null) }}
          onSave={(recipe, isNew) => {
            saveRecipe(recipe, isNew)
            setRecipeModalOpen(false)
            setEditingRecipeId(null)
          }}
        />
      )}

      {/* Select Recipe Modal */}
      {selectRecipeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectRecipeModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[var(--lf-radius)] p-6"
            style={{ background: 'var(--lf-surface)', boxShadow: 'var(--lf-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[20px] font-bold font-serif mb-4" style={{ color: 'var(--lf-text-1)' }}>
              Choisir une recette
            </h3>
            <div className="space-y-3">
              {recipes.filter(r => !r.archived).map(recipe => (
                <div
                  key={recipe.id}
                  onClick={() => assignRecipe(recipe.id)}
                  className="p-4 rounded-[var(--lf-radius-sm)] cursor-pointer hover:scale-[1.02] lf-transition"
                  style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)' }}
                >
                  <h4 className="text-[15px] font-bold mb-1" style={{ color: 'var(--lf-text-1)' }}>
                    {recipe.name}
                  </h4>
                  <p className="text-[13px]" style={{ color: 'var(--lf-text-2)' }}>
                    {recipe.ingredients.length} ingredients
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Recipe Modal Component
function RecipeModal({
  recipeId,
  recipes,
  saving,
  onClose,
  onSave
}: {
  recipeId: string | null
  recipes: Recipe[]
  saving: boolean
  onClose: () => void
  onSave: (recipe: Recipe, isNew: boolean) => void
}) {
  const editing = recipeId ? recipes.find(r => r.id === recipeId) : null
  const [name, setName] = useState(editing?.name || '')
  const [tags, setTags] = useState(editing?.tags.join(', ') || '')
  const [image, setImage] = useState(editing?.image || '')
  const [link, setLink] = useState(editing?.link || '')
  const [instructions, setInstructions] = useState(editing?.instructions || '')
  const [ingredients, setIngredients] = useState<Array<{ name: string; quantity: string }>>(
    editing?.ingredients || [{ name: '', quantity: '' }]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const recipe: Recipe = {
      id: recipeId || Date.now().toString(),
      name,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      image,
      link,
      ingredients: ingredients.filter(i => i.name.trim()),
      instructions,
      pinned: editing?.pinned || false,
      archived: editing?.archived || false
    }
    onSave(recipe, !recipeId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[var(--lf-radius)] p-6"
        style={{ background: 'var(--lf-surface)', boxShadow: 'var(--lf-shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[20px] font-bold font-serif mb-6" style={{ color: 'var(--lf-text-1)' }}>
          {recipeId ? 'Modifier la recette' : 'Nouvelle recette'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--lf-text-1)' }}>
              Nom de la recette *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-[var(--lf-radius-sm)] text-[14px] outline-none"
              style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--lf-text-1)' }}>
              Tags (separes par des virgules)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vege, rapide, italien"
              className="w-full px-4 py-2 rounded-[var(--lf-radius-sm)] text-[14px] outline-none"
              style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--lf-text-1)' }}>
              Image URL
            </label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-[var(--lf-radius-sm)] text-[14px] outline-none"
              style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--lf-text-1)' }}>
              Lien video/site
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-[var(--lf-radius-sm)] text-[14px] outline-none"
              style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--lf-text-1)' }}>
              Ingredients
            </label>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => {
                    const newIng = [...ingredients]
                    newIng[idx].name = e.target.value
                    setIngredients(newIng)
                  }}
                  placeholder="Nom"
                  className="px-4 py-2 rounded-[var(--lf-radius-sm)] text-[14px] outline-none"
                  style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
                />
                <input
                  type="text"
                  value={ing.quantity}
                  onChange={(e) => {
                    const newIng = [...ingredients]
                    newIng[idx].quantity = e.target.value
                    setIngredients(newIng)
                  }}
                  placeholder="Quantite"
                  className="px-4 py-2 rounded-[var(--lf-radius-sm)] text-[14px] outline-none"
                  style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setIngredients([...ingredients, { name: '', quantity: '' }])}
              className="text-[13px] font-semibold px-3 py-2 rounded-[var(--lf-radius-sm)] lf-transition"
              style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            >
              + Ajouter un ingredient
            </button>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--lf-text-1)' }}>
              Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              placeholder="Etapes de preparation..."
              className="w-full px-4 py-2 rounded-[var(--lf-radius-sm)] text-[14px] outline-none resize-y"
              style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-[var(--lf-radius-sm)] text-[14px] font-semibold lf-transition disabled:opacity-50"
              style={{ background: 'var(--lf-text-1)', color: 'var(--lf-surface)' }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-[var(--lf-radius-sm)] text-[14px] font-semibold lf-transition"
              style={{ background: 'var(--lf-bg)', border: '1px solid var(--lf-border)', color: 'var(--lf-text-1)' }}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
