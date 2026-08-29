-- Adiciona o campo "completed" à tabela reminders para permitir marcar
-- compromissos como concluídos (habilita o botão "Concluir" na Agenda).
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;
