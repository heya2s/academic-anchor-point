-- Make user_id nullable in students table so admins can add students without auth accounts
-- Students can sign up later and link their accounts

ALTER TABLE public.students
ALTER COLUMN user_id DROP NOT NULL;

-- Add a unique constraint on email to prevent duplicates
ALTER TABLE public.students
ADD CONSTRAINT students_email_unique UNIQUE (email);

-- Update RLS policy to allow viewing students without user_id
DROP POLICY IF EXISTS "Students can view their own record" ON public.students;

CREATE POLICY "Students can view their own record"
ON public.students
FOR SELECT
USING (
  user_id IS NOT NULL AND auth.uid() = user_id
);