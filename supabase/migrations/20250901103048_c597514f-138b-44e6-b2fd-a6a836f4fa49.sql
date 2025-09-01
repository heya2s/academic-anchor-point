-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('Present', 'Absent');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  student_id TEXT,
  roll_number TEXT,
  class TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create students table (legacy support - can be merged with profiles later)
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  student_id TEXT NOT NULL UNIQUE,
  roll_no TEXT NOT NULL,
  class TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'Present',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create syllabus table
CREATE TABLE public.syllabus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  semester TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on syllabus
ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;

-- Create pyqs (Previous Year Questions) table
CREATE TABLE public.pyqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  semester TEXT NOT NULL,
  year INTEGER,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pyqs
ALTER TABLE public.pyqs ENABLE ROW LEVEL SECURITY;

-- Create notices table
CREATE TABLE public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  posted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notices
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Create storage buckets for PDF files
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('syllabus', 'syllabus', true),
  ('pyqs', 'pyqs', true);

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for students
CREATE POLICY "Students can view their own record"
ON public.students
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all students"
ON public.students
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance
CREATE POLICY "Students can view their own attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.id = attendance.student_id 
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all attendance"
ON public.attendance
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for syllabus (public read, admin write)
CREATE POLICY "Everyone can view syllabus"
ON public.syllabus
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage syllabus"
ON public.syllabus
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update syllabus"
ON public.syllabus
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete syllabus"
ON public.syllabus
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pyqs (public read, admin write)
CREATE POLICY "Everyone can view pyqs"
ON public.pyqs
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage pyqs"
ON public.pyqs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pyqs"
ON public.pyqs
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pyqs"
ON public.pyqs
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notices (public read, admin write)
CREATE POLICY "Everyone can view notices"
ON public.notices
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage notices"
ON public.notices
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notices"
ON public.notices
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notices"
ON public.notices
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for syllabus bucket
CREATE POLICY "Everyone can view syllabus files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'syllabus');

CREATE POLICY "Admins can upload syllabus files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'syllabus' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update syllabus files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'syllabus' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete syllabus files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'syllabus' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for pyqs bucket
CREATE POLICY "Everyone can view pyqs files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pyqs');

CREATE POLICY "Admins can upload pyqs files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'pyqs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pyqs files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'pyqs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pyqs files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'pyqs' AND public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  
  RETURN new;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_syllabus_updated_at
  BEFORE UPDATE ON public.syllabus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pyqs_updated_at
  BEFORE UPDATE ON public.pyqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();