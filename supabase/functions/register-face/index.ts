import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student_id, face_data } = await req.json();

    // Validate inputs
    if (!student_id || typeof student_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid student_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!face_data || typeof face_data !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid face_data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate base64 image format
    if (!face_data.startsWith('data:image/')) {
      return new Response(JSON.stringify({ error: 'Invalid image format. Must be base64 encoded image.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can register faces' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify student exists
    const { data: studentData, error: studentError } = await supabaseClient
      .from('students')
      .select('id, name')
      .eq('id', student_id)
      .single();

    if (studentError || !studentData) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for inserting face data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Upsert face data (update if exists, insert if not)
    const { data: faceData, error: faceError } = await supabaseAdmin
      .from('student_faces')
      .upsert({
        student_id: student_id,
        face_data: face_data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id' })
      .select()
      .single();

    if (faceError) {
      console.error('Error saving face data:', faceError);
      return new Response(JSON.stringify({ error: 'Failed to save face data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Face registered successfully for student: ${studentData.name}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Face registered for ${studentData.name}`,
      face_id: faceData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in register-face:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
