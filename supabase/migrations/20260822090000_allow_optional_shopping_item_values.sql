-- Shopping items may be created before the shopper knows quantity or price.
ALTER TABLE public.shopping_items
  ALTER COLUMN qty DROP NOT NULL,
  ALTER COLUMN price DROP NOT NULL;
