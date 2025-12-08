-- Create student_faces table for storing face data
CREATE TABLE public.student_faces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  face_data TEXT NOT NULL, -- Base64 encoded face image
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

-- Enable RLS
ALTER TABLE public.student_faces ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all face data"
ON public.student_faces
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view their own face data"
ON public.student_faces
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = student_faces.student_id AND s.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_student_faces_updated_at
BEFORE UPDATE ON public.student_faces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add time column to attendance table for camera-based attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS time TIME DEFAULT NULL;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS marked_via TEXT DEFAULT 'manual';