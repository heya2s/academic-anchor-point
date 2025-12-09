import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('verify-face function called, method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body received, class_filter:', body.class_filter);
    
    const { captured_face, class_filter } = body;

    if (!captured_face || typeof captured_face !== 'string') {
      console.error('Invalid captured_face data');
      return new Response(JSON.stringify({ error: 'Invalid captured_face data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!captured_face.startsWith('data:image/')) {
      console.error('Invalid image format');
      return new Response(JSON.stringify({ error: 'Invalid image format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Image format valid, checking authorization...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
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
      console.error('User authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('Role fetch error:', roleError.message);
    }

    if (roleData?.role !== 'admin') {
      console.error('User is not admin, role:', roleData?.role);
      return new Response(JSON.stringify({ error: 'Only admins can verify faces' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Admin verified, fetching registered faces...');

    // Use service role for database access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all registered faces with student info
    const { data: registeredFaces, error: facesError } = await supabaseAdmin
      .from('student_faces')
      .select(`
        id,
        student_id,
        face_data,
        students (
          id,
          name,
          student_id,
          roll_no,
          class,
          email
        )
      `);

    if (facesError) {
      console.error('Error fetching faces:', facesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch registered faces' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Registered faces found:', registeredFaces?.length || 0);

    if (!registeredFaces || registeredFaces.length === 0) {
      return new Response(JSON.stringify({ 
        recognized: false, 
        message: 'No registered faces found in the system' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter by class if provided
    let facesToCheck = registeredFaces;
    if (class_filter && class_filter !== '') {
      facesToCheck = registeredFaces.filter((f: any) => f.students?.class === class_filter);
      console.log('After class filter, faces to check:', facesToCheck.length);
    }

    if (facesToCheck.length === 0) {
      return new Response(JSON.stringify({ 
        recognized: false, 
        message: 'No registered faces found for the selected class' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Lovable AI to compare faces
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting face comparison with', facesToCheck.length, 'registered faces...');

    // Compare captured face with each registered face using AI
    for (const registeredFace of facesToCheck) {
      const student = registeredFace.students;
      if (!student) {
        console.log('Skipping face without student data');
        continue;
      }

      console.log('Comparing with student:', student.name);

      const comparisonPrompt = `You are a face recognition system. Compare these two images and determine if they show the SAME person.

IMPORTANT INSTRUCTIONS:
1. Look at facial features: eyes, nose, mouth shape, face shape, skin tone
2. Account for slight differences in lighting, angle, and expression
3. Be reasonably confident but not overly strict
4. Respond with ONLY a JSON object in this exact format:
{"match": true, "confidence": 0.85}
or
{"match": false, "confidence": 0.2}

The "match" field should be true if the faces appear to be the same person.
The "confidence" field should be a number between 0 and 1 indicating your confidence.
A confidence above 0.7 with match=true indicates a reliable match.

RESPOND WITH ONLY THE JSON OBJECT, NO OTHER TEXT.`;

      try {
        console.log('Calling AI API for comparison...');
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: comparisonPrompt },
                  { 
                    type: 'image_url', 
                    image_url: { url: captured_face } 
                  },
                  { 
                    type: 'image_url', 
                    image_url: { url: registeredFace.face_data } 
                  }
                ]
              }
            ],
          }),
        });

        console.log('AI API response status:', aiResponse.status);

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('AI API error:', aiResponse.status, errorText);
          continue;
        }

        const aiData = await aiResponse.json();
        const responseText = aiData.choices?.[0]?.message?.content || '';
        console.log('AI response:', responseText);
        
        // Parse the JSON response
        try {
          // Extract JSON from response (handle potential extra text)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            console.log('Parsed result:', result);
            
            if (result.match === true && result.confidence >= 0.65) {
              console.log(`Face matched: ${student.name} with confidence ${result.confidence}`);
              
              // Check if attendance already marked today
              const today = new Date().toISOString().split('T')[0];
              const { data: existingAttendance } = await supabaseAdmin
                .from('attendance')
                .select('id')
                .eq('student_id', student.id)
                .eq('date', today)
                .maybeSingle();

              if (existingAttendance) {
                console.log('Attendance already marked for today');
                return new Response(JSON.stringify({
                  recognized: true,
                  already_marked: true,
                  student: {
                    id: student.id,
                    name: student.name,
                    student_id: student.student_id,
                    roll_no: student.roll_no,
                    class: student.class
                  },
                  message: `Attendance already marked for ${student.name} today`
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }

              // Mark attendance
              const currentTime = new Date().toTimeString().split(' ')[0];
              const { error: attendanceError } = await supabaseAdmin
                .from('attendance')
                .insert({
                  student_id: student.id,
                  date: today,
                  status: 'Present',
                  time: currentTime,
                  marked_via: 'camera'
                });

              if (attendanceError) {
                console.error('Error marking attendance:', attendanceError);
                return new Response(JSON.stringify({ 
                  recognized: true,
                  error: 'Face recognized but failed to mark attendance' 
                }), {
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }

              console.log('Attendance marked successfully for:', student.name);
              return new Response(JSON.stringify({
                recognized: true,
                attendance_marked: true,
                student: {
                  id: student.id,
                  name: student.name,
                  student_id: student.student_id,
                  roll_no: student.roll_no,
                  class: student.class
                },
                confidence: result.confidence,
                time: currentTime,
                message: `Attendance marked for ${student.name}`
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            } else {
              console.log(`No match for ${student.name}, match=${result.match}, confidence=${result.confidence}`);
            }
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError, 'Response:', responseText);
        }
      } catch (aiError) {
        console.error('AI comparison error:', aiError);
      }
    }

    // No match found
    console.log('No face match found after checking all registered faces');
    return new Response(JSON.stringify({
      recognized: false,
      message: 'Face not recognized. Please try again or ensure your face is registered.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-face:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
