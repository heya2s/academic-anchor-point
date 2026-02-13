import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check user is a student
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || roleData.role !== 'student') {
      return new Response(JSON.stringify({ error: 'Only students can mark attendance' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { session_id, latitude, longitude, device_info } = body

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('attendance_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check session is active and not expired
    const now = new Date()
    const expiresAt = new Date(session.expires_at)
    if (session.status !== 'active' || now > expiresAt) {
      return new Response(JSON.stringify({ error: 'Attendance session has expired or is closed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get student record
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!student) {
      return new Response(JSON.stringify({ error: 'Student record not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from('smart_attendance_records')
      .select('id')
      .eq('session_id', session_id)
      .eq('student_id', student.id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Attendance already marked for this session' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get campus settings
    const { data: campusSettings } = await supabaseAdmin
      .from('campus_settings')
      .select('*')
      .limit(1)
      .single()

    let gpsVerified = false
    let wifiVerified = false

    // GPS verification
    if (session.gps_required && campusSettings) {
      if (latitude != null && longitude != null) {
        const distance = getDistanceMeters(
          latitude, longitude,
          campusSettings.latitude, campusSettings.longitude
        )
        gpsVerified = distance <= campusSettings.allowed_radius_meters
      }
    } else {
      gpsVerified = true // GPS not required
    }

    // WiFi/IP verification
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 'unknown'
    
    if (session.wifi_required && campusSettings) {
      if (campusSettings.campus_ip && clientIp !== 'unknown') {
        if (campusSettings.campus_ip_range) {
          wifiVerified = clientIp.startsWith(campusSettings.campus_ip_range) || 
                         clientIp === campusSettings.campus_ip
        } else {
          wifiVerified = clientIp === campusSettings.campus_ip
        }
      }
    } else {
      wifiVerified = true // WiFi not required
    }

    // Determine verification type
    let verificationType = 'gps'
    if (gpsVerified && wifiVerified) verificationType = 'both'
    else if (wifiVerified) verificationType = 'wifi'
    else if (gpsVerified) verificationType = 'gps'

    // Must pass at least one verification if required
    const gpsCheck = !session.gps_required || gpsVerified
    const wifiCheck = !session.wifi_required || wifiVerified

    // At least one must be verified (GPS OR WiFi)
    if (!gpsVerified && !wifiVerified) {
      return new Response(JSON.stringify({ 
        error: 'Verification failed. You must be inside campus area or connected to campus WiFi.',
        gps_verified: gpsVerified,
        wifi_verified: wifiVerified
      }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insert attendance record
    const { error: insertError } = await supabaseAdmin
      .from('smart_attendance_records')
      .insert({
        session_id,
        student_id: student.id,
        user_id: user.id,
        ip_address: clientIp,
        latitude,
        longitude,
        device_info: device_info || navigator?.userAgent || 'unknown',
        verification_type: verificationType,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to mark attendance' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Also insert into the main attendance table so it shows in the student panel
    const today = new Date().toISOString().split('T')[0]
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false })
    
    // Check if attendance already exists for today in the main table
    const { data: existingAttendance } = await supabaseAdmin
      .from('attendance')
      .select('id')
      .eq('student_id', student.id)
      .eq('date', today)
      .maybeSingle()

    if (!existingAttendance) {
      const { error: attendanceError } = await supabaseAdmin
        .from('attendance')
        .insert({
          student_id: student.id,
          date: today,
          status: 'Present',
          time: currentTime,
          marked_via: 'smart_attendance',
        })

      if (attendanceError) {
        console.error('Attendance table insert error:', attendanceError)
        // Don't fail the whole request - smart record was already saved
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Attendance marked successfully',
      verification_type: verificationType
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
