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

// GET - Load all categories and tasks
export async function GET(req: NextRequest) {
  if (!checkPassword(req)) return unauthorized()

  const supabase = getSupabase()

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

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
