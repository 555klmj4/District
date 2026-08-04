ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS signature_dishes jsonb DEFAULT '[]';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS signature_dishes_zh jsonb DEFAULT '[]';
