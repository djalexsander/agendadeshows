
ALTER TABLE public.module_catalog ADD COLUMN max_users_default integer NOT NULL DEFAULT 1;

-- Set a reasonable default for existing agenda_compartilhada
UPDATE public.module_catalog SET max_users_default = 5 WHERE module_name = 'agenda_compartilhada';
