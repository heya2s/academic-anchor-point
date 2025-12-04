import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation functions
const validateEmail = (email: string): string | null => {
  if (!email || typeof email !== 'string') {
    return 'Email is required';
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return 'Email is required';
  }
  if (trimmed.length > 255) {
    return 'Email must be less than 255 characters';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Invalid email format';
  }
  return null;
};

const validateFullName = (name: string): string | null => {
  if (!name || typeof name !== 'string') {
    return 'Full name is required';
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return 'Full name must be at least 2 characters';
  }
  if (trimmed.length > 100) {
    return 'Full name must be less than 100 characters';
  }
  return null;
};

const validateOptionalString = (value: string | undefined, fieldName: string, maxLength: number): string | null => {
  if (!value) return null;
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  // Only allow alphanumeric, spaces, and basic punctuation
  const safePattern = /^[a-zA-Z0-9\s\-_.]+$/;
  if (trimmed.length > 0 && !safePattern.test(trimmed)) {
    return `${fieldName} contains invalid characters`;
  }
  return null;
};

const sanitizeString = (value: string | undefined): string | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  return value.trim().replace(/[<>]/g, '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.log('Authentication failed:', authError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'admin') {
      console.log('Non-admin user attempted to create student:', user.id)
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, full_name, student_id, roll_no, class: studentClass } = body

    // Validate required fields
    const emailError = validateEmail(email);
    if (emailError) {
      return new Response(JSON.stringify({ error: emailError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const nameError = validateFullName(full_name);
    if (nameError) {
      return new Response(JSON.stringify({ error: nameError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate optional fields
    const studentIdError = validateOptionalString(student_id, 'Student ID', 20);
    if (studentIdError) {
      return new Response(JSON.stringify({ error: studentIdError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rollNoError = validateOptionalString(roll_no, 'Roll number', 20);
    if (rollNoError) {
      return new Response(JSON.stringify({ error: rollNoError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const classError = validateOptionalString(studentClass, 'Class', 50);
    if (classError) {
      return new Response(JSON.stringify({ error: classError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedName = sanitizeString(full_name)!;
    const sanitizedStudentId = sanitizeString(student_id);
    const sanitizedRollNo = sanitizeString(roll_no);
    const sanitizedClass = sanitizeString(studentClass);

    // Generate a temporary password (students should change this)
    const temporaryPassword = `Student@${Math.random().toString(36).slice(-8)}`

    // Create the auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: sanitizedName,
        user_role: 'student'
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update the students record with the specific details
    // The trigger handle_new_user() creates the student record with user_id set
    if (newUser.user) {
      const { error: updateError } = await supabaseAdmin
        .from('students')
        .update({
          student_id: sanitizedStudentId,
          roll_no: sanitizedRollNo,
          class: sanitizedClass
        })
        .eq('user_id', newUser.user.id)

      if (updateError) {
        console.error('Error updating student details:', updateError)
      }
    }

    console.log('Student account created successfully:', newUser.user?.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUser.user?.id,
        temporary_password: temporaryPassword,
        message: 'Student account created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
