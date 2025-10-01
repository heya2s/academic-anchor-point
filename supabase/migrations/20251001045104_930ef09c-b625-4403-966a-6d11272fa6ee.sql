-- Add foreign key constraint from attendance.student_id to profiles.user_id
-- This allows us to join attendance records with user profiles directly

-- First, drop the existing foreign key if it exists
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;

-- Add the new foreign key constraint
ALTER TABLE attendance 
ADD CONSTRAINT attendance_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Create an index for better performance on joins
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);