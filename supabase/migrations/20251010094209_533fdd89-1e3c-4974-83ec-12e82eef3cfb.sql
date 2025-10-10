-- Fix wrong foreign key on attendance.student_id and align data

-- 1) Drop the existing FK that incorrectly points to auth.users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_student_id_fkey'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance DROP CONSTRAINT attendance_student_id_fkey;
  END IF;
END$$;

-- 2) Migrate existing data: map auth user IDs to students table IDs
UPDATE public.attendance a
SET student_id = s.id
FROM public.students s
WHERE a.student_id = s.user_id;

-- 3) Remove any orphaned rows that still don't match a student (safety)
DELETE FROM public.attendance a
WHERE NOT EXISTS (
  SELECT 1 FROM public.students s WHERE s.id = a.student_id
);

-- 4) Add the correct foreign key to students(id)
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES public.students(id) 
ON DELETE CASCADE;

-- 5) Ensure an index exists on the referencing column for performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
