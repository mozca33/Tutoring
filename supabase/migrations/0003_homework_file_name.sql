-- =====================================================
-- Homework: store original submission file name for display
-- (storage_path already exists as homeworks.submission_file_path)
-- =====================================================

alter table public.homeworks add column if not exists submission_file_name text;
