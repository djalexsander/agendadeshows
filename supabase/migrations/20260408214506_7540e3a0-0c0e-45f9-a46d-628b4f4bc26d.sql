
ALTER TABLE public.companies ADD COLUMN max_users integer NOT NULL DEFAULT 1;

-- Set existing companies that may already have multiple members to a reasonable default
UPDATE public.companies SET max_users = 10 WHERE id IN (
  SELECT company_id FROM public.company_members GROUP BY company_id HAVING COUNT(*) > 1
);
