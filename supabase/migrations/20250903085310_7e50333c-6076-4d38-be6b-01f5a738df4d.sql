-- Update the handle_new_user function to support admin signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  
  -- Assign role based on metadata or default to student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id, 
    COALESCE(
      (new.raw_user_meta_data ->> 'user_role')::app_role,
      'student'::app_role
    )
  );
  
  RETURN new;
END;
$function$;