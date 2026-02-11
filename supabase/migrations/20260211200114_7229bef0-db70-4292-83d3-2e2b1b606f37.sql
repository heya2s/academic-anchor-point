
-- Campus Settings table for GPS/WiFi configuration
CREATE TABLE public.campus_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_name text NOT NULL DEFAULT 'Main Campus',
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  allowed_radius_meters integer NOT NULL DEFAULT 200,
  campus_ip text,
  campus_ip_range text,
  gps_verification_enabled boolean NOT NULL DEFAULT true,
  wifi_verification_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.campus_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view campus settings" ON public.campus_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert campus settings" ON public.campus_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update campus settings" ON public.campus_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete campus settings" ON public.campus_settings FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_campus_settings_updated_at BEFORE UPDATE ON public.campus_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default campus settings
INSERT INTO public.campus_settings (campus_name) VALUES ('Main Campus');

-- Attendance Sessions table
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course text NOT NULL,
  subject text NOT NULL,
  batch text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 10,
  gps_required boolean NOT NULL DEFAULT true,
  wifi_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_by uuid NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view attendance sessions" ON public.attendance_sessions FOR SELECT USING (true);
CREATE POLICY "Admins can create sessions" ON public.attendance_sessions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update sessions" ON public.attendance_sessions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete sessions" ON public.attendance_sessions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_attendance_sessions_updated_at BEFORE UPDATE ON public.attendance_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Smart Attendance Records table
CREATE TABLE public.smart_attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  marked_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  latitude double precision,
  longitude double precision,
  device_info text,
  verification_type text NOT NULL CHECK (verification_type IN ('gps', 'wifi', 'both')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE public.smart_attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all records" ON public.smart_attendance_records FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can view own records" ON public.smart_attendance_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own records" ON public.smart_attendance_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage records" ON public.smart_attendance_records FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_attendance_records;
