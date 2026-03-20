-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '#5B8BE8',
  cover TEXT NOT NULL DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT false,
  master BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  done BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Create index on tasks.category_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);

-- Insert default categories
INSERT INTO categories (id, name, emoji, accent, cover, pinned, master, sort_order)
VALUES
  ('education', 'Education', E'\U0001F4DA', '#5B8BE8', '', false, false, 0),
  ('pro', 'Professionnel', E'\U0001F4BC', '#E8924A', '', false, false, 1),
  ('perso', 'Personnel / Loisirs', E'\U0001F3AF', '#4BAE82', '', false, false, 2),
  ('materiel', 'Materiel', E'\U0001F527', '#9B7EDE', '', false, false, 3),
  ('kiff', 'Kiff', E'\u2728', '#E8924A', '', false, false, 4),
  ('vacances', 'Vacances', E'\U0001F334', '#4BAE82', '', false, false, 5),
  ('master', 'Master', E'\U0001F393', '#E05555', '', true, true, 6)
ON CONFLICT (id) DO NOTHING;
