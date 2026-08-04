CREATE INDEX CONCURRENTLY IF NOT EXISTS restaurants_user_created_idx
  ON restaurants (user_id, created_at DESC);
