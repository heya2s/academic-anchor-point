import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Create client with user's auth to verify admin role
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the requesting user is an admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { student_id, user_id } = await req.json();

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: 'student_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting student:', student_id, 'with user_id:', user_id);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Delete from students table first (this will cascade to attendance due to FK)
    const { error: studentDeleteError } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', student_id);

    if (studentDeleteError) {
      console.error('Student delete error:', studentDeleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete student: ${studentDeleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If user_id exists, delete from profiles and auth.users
    if (user_id) {
      // Delete from profiles table
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', user_id);

      if (profileDeleteError) {
        console.error('Profile delete error:', profileDeleteError);
        // Continue anyway, main student record is deleted
      }

      // Delete from user_roles table
      const { error: roleDeleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user_id);

      if (roleDeleteError) {
        console.error('Role delete error:', roleDeleteError);
        // Continue anyway
      }

      // Delete from auth.users
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (authDeleteError) {
        console.error('Auth user delete error:', authDeleteError);
        return new Response(
          JSON.stringify({ 
            error: `Student deleted but failed to remove auth account: ${authDeleteError.message}`,
            partial: true 
          }),
          { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Student and auth user deleted successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Student deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
