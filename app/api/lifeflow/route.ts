import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function checkPassword(req: NextRequest): boolean {
  const pw = req.headers.get("x-app-password")
  return pw === process.env.APP_PASSWORD
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

// GET - Load all categories, tasks, and meal plan data
export async function GET(req: NextRequest) {
  if (!checkPassword(req)) return unauthorized()

  const supabase = getSupabase()
  const url = new URL(req.url)
  const dataType = url.searchParams.get("type") || "tasks"

  // Meal plan data request
  if (dataType === "mealplan") {
    const [recipesRes, mealPlansRes, shoppingRes] = await Promise.all([
      supabase.from("recipes").select("*").order("created_at", { ascending: false }),
      supabase.from("meal_plans").select("*"),
      supabase.from("shopping_items").select("*").order("aisle", { ascending: true }),
    ])

    if (recipesRes.error) return NextResponse.json({ error: recipesRes.error.message }, { status: 500 })
    if (mealPlansRes.error) return NextResponse.json({ error: mealPlansRes.error.message }, { status: 500 })
    if (shoppingRes.error) return NextResponse.json({ error: shoppingRes.error.message }, { status: 500 })

    // Map recipes
    const recipes = (recipesRes.data || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      tags: r.tags || [],
      image: r.image || "",
      link: r.link || "",
      ingredients: r.ingredients || [],
      instructions: r.instructions || "",
      pinned: r.pinned || false,
      archived: r.archived || false,
    }))

    // Convert meal_plans array to object keyed by slot_key
    const mealPlan: Record<string, { recipeId: string; name: string; ingredients: unknown[] }> = {}
    for (const mp of mealPlansRes.data || []) {
      mealPlan[mp.slot_key as string] = {
        recipeId: mp.recipe_id as string,
        name: mp.recipe_name as string,
        ingredients: (mp.ingredients as unknown[]) || [],
      }
    }

    // Convert shopping_items to grouped by aisle
    const shoppingList: Record<string, Array<{ id: string; name: string; quantity: string; checked: boolean }>> = {}
    for (const item of shoppingRes.data || []) {
      const aisle = item.aisle as string
      if (!shoppingList[aisle]) shoppingList[aisle] = []
      shoppingList[aisle].push({
        id: item.id as string,
        name: item.name as string,
        quantity: item.quantity as string,
        checked: item.checked as boolean,
      })
    }

    return NextResponse.json({ recipes, mealPlan, shoppingList })
  }

  // Default: tasks data
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })

  if (catErr) {
    return NextResponse.json({ error: catErr.message }, { status: 500 })
  }

  const { data: tasks, error: taskErr } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true })

  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 500 })
  }

  // Map DB rows to frontend format
  const mappedCategories = (categories || []).map((c: Record<string, unknown>) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    accent: c.accent,
    cover: c.cover,
    pinned: c.pinned,
    master: c.master,
  }))

  // Group tasks by category_id
  const tasksMap: Record<string, Array<Record<string, unknown>>> = {}
  for (const t of tasks || []) {
    const catId = t.category_id as string
    if (!tasksMap[catId]) tasksMap[catId] = []
    tasksMap[catId].push({
      id: t.id,
      title: t.title,
      date: t.date,
      link: t.link,
      desc: t.description,
      tags: t.tags,
      done: t.done,
      createdAt: Number(t.created_at),
    })
  }

  return NextResponse.json({ categories: mappedCategories, tasks: tasksMap })
}

// POST - Handle mutations (add/update/delete categories and tasks)
export async function POST(req: NextRequest) {
  if (!checkPassword(req)) return unauthorized()

  const supabase = getSupabase()
  const body = await req.json()
  const { action } = body

  try {
    switch (action) {
      // --- Categories ---
      case "addCategory": {
        const { category } = body
        const { error } = await supabase.from("categories").insert({
          id: category.id,
          name: category.name,
          emoji: category.emoji || "",
          accent: category.accent || "#5B8BE8",
          cover: category.cover || "",
          pinned: category.pinned || false,
          master: category.master || false,
          sort_order: category.sortOrder || 0,
        })
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "updateCategory": {
        const { catId, data } = body
        const updateData: Record<string, unknown> = {}
        if (data.name !== undefined) updateData.name = data.name
        if (data.emoji !== undefined) updateData.emoji = data.emoji
        if (data.accent !== undefined) updateData.accent = data.accent
        if (data.cover !== undefined) updateData.cover = data.cover
        if (data.pinned !== undefined) updateData.pinned = data.pinned
        if (data.master !== undefined) updateData.master = data.master

        const { error } = await supabase
          .from("categories")
          .update(updateData)
          .eq("id", catId)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "deleteCategory": {
        const { catId } = body
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", catId)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      // --- Tasks ---
      case "addTask": {
        const { catId, task } = body
        const { error } = await supabase.from("tasks").insert({
          id: task.id,
          category_id: catId,
          title: task.title,
          date: task.date || "",
          link: task.link || "",
          description: task.desc || "",
          tags: task.tags || [],
          done: false,
          created_at: task.createdAt,
        })
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "updateTask": {
        const { taskId, data } = body
        const updateData: Record<string, unknown> = {}
        if (data.title !== undefined) updateData.title = data.title
        if (data.date !== undefined) updateData.date = data.date
        if (data.link !== undefined) updateData.link = data.link
        if (data.desc !== undefined) updateData.description = data.desc
        if (data.tags !== undefined) updateData.tags = data.tags
        if (data.done !== undefined) updateData.done = data.done

        const { error } = await supabase
          .from("tasks")
          .update(updateData)
          .eq("id", taskId)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "deleteTask": {
        const { taskId } = body
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", taskId)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      // --- Bulk seed default categories ---
      case "seedDefaults": {
        const { categories } = body
        for (let i = 0; i < categories.length; i++) {
          const c = categories[i]
          const { error } = await supabase.from("categories").upsert({
            id: c.id,
            name: c.name,
            emoji: c.emoji || "",
            accent: c.accent || "#5B8BE8",
            cover: c.cover || "",
            pinned: c.pinned || false,
            master: c.master || false,
            sort_order: i,
          })
          if (error) throw error
        }
        return NextResponse.json({ success: true })
      }

      // --- Recipes ---
      case "addRecipe": {
        const { recipe } = body
        const { error } = await supabase.from("recipes").insert({
          id: recipe.id,
          name: recipe.name,
          tags: recipe.tags || [],
          image: recipe.image || "",
          link: recipe.link || "",
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || "",
          pinned: recipe.pinned || false,
          archived: recipe.archived || false,
          created_at: Date.now(),
        })
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "updateRecipe": {
        const { recipeId, data } = body
        const updateData: Record<string, unknown> = {}
        if (data.name !== undefined) updateData.name = data.name
        if (data.tags !== undefined) updateData.tags = data.tags
        if (data.image !== undefined) updateData.image = data.image
        if (data.link !== undefined) updateData.link = data.link
        if (data.ingredients !== undefined) updateData.ingredients = data.ingredients
        if (data.instructions !== undefined) updateData.instructions = data.instructions
        if (data.pinned !== undefined) updateData.pinned = data.pinned
        if (data.archived !== undefined) updateData.archived = data.archived

        const { error } = await supabase
          .from("recipes")
          .update(updateData)
          .eq("id", recipeId)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "deleteRecipe": {
        const { recipeId } = body
        const { error } = await supabase
          .from("recipes")
          .delete()
          .eq("id", recipeId)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      // --- Meal Plans ---
      case "setMealSlot": {
        const { slotKey, recipeId, recipeName, ingredients } = body
        const { error } = await supabase.from("meal_plans").upsert({
          id: `mp-${slotKey}`,
          slot_key: slotKey,
          recipe_id: recipeId,
          recipe_name: recipeName,
          ingredients: ingredients || [],
          created_at: Date.now(),
        })
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "removeMealSlot": {
        const { slotKey } = body
        const { error } = await supabase
          .from("meal_plans")
          .delete()
          .eq("slot_key", slotKey)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      // --- Shopping List ---
      case "setShoppingList": {
        const { items } = body
        // Clear existing and insert new
        await supabase.from("shopping_items").delete().neq("id", "")
        
        if (items && items.length > 0) {
          const { error } = await supabase.from("shopping_items").insert(items)
          if (error) throw error
        }
        return NextResponse.json({ success: true })
      }

      case "toggleShoppingItem": {
        const { itemId, checked } = body
        const { error } = await supabase
          .from("shopping_items")
          .update({ checked })
          .eq("id", itemId)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "clearShoppingList": {
        const { error } = await supabase
          .from("shopping_items")
          .delete()
          .neq("id", "")
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
