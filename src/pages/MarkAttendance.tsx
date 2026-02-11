import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, MapPin, Wifi, Loader2, AlertTriangle } from "lucide-react";

interface ActiveSession {
  id: string;
  course: string;
  subject: string;
  batch: string;
  duration_minutes: number;
  gps_required: boolean;
  wifi_required: boolean;
  status: string;
  expires_at: string;
}

export default function MarkAttendance() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  // Verification states
  const [gpsVerified, setGpsVerified] = useState(false);
  const [gpsChecking, setGpsChecking] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [wifiVerified, setWifiVerified] = useState(false);
  const [wifiChecking, setWifiChecking] = useState(false);
  const [wifiError, setWifiError] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchActiveSession();

    // Subscribe to new sessions
    const channel = supabase
      .channel('attendance-sessions-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_sessions',
      }, () => {
        fetchActiveSession();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Countdown
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expires = new Date(activeSession.expires_at);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        setActiveSession(null);
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const now = new Date();
        const expires = new Date(data.expires_at);
        if (now < expires) {
          setActiveSession(data as ActiveSession);
          checkAlreadyMarked(data.id);
          // Auto-start verification
          if (data.gps_required) verifyGPS();
          setWifiVerified(!data.wifi_required); // If not required, mark verified
          if (!data.gps_required) setGpsVerified(true);
        } else {
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkAlreadyMarked = async (sessionId: string) => {
    if (!user) return;
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (student) {
      const { data: existing } = await supabase
        .from('smart_attendance_records')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', student.id)
        .maybeSingle();

      if (existing) setMarked(true);
    }
  };

  const verifyGPS = async () => {
    setGpsChecking(true);
    setGpsError("");

    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by your browser");
      setGpsChecking(false);
      return;
    }

    try {
      // Get campus settings
      const { data: campusData } = await supabase
        .from('campus_settings')
        .select('latitude, longitude, allowed_radius_meters')
        .limit(1)
        .single();

      if (!campusData) {
        setGpsError("Campus location not configured");
        setGpsChecking(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });

          const distance = getDistanceMeters(
            latitude, longitude,
            campusData.latitude, campusData.longitude
          );

          if (distance <= campusData.allowed_radius_meters) {
            setGpsVerified(true);
          } else {
            setGpsError(`You are ${Math.round(distance)}m away from campus. Max allowed: ${campusData.allowed_radius_meters}m`);
          }
          setGpsChecking(false);
        },
        (err) => {
          setGpsError("Location access denied. Please enable location permissions.");
          setGpsChecking(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch {
      setGpsError("Failed to verify location");
      setGpsChecking(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!activeSession || !user) return;
    setMarking(true);

    try {
      const { data, error } = await supabase.functions.invoke('mark-smart-attendance', {
        body: {
          session_id: activeSession.id,
          latitude: coords?.lat,
          longitude: coords?.lng,
          device_info: navigator.userAgent,
        }
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setMarked(true);
      toast.success("Attendance marked successfully! ✅");
    } catch (err: any) {
      toast.error(err.message || "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  };

  const canMark = (gpsVerified || wifiVerified) && !marked && activeSession;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mark Attendance</h1>
          <p className="text-muted-foreground">Smart attendance with location & network verification</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Session</h2>
            <p className="text-muted-foreground text-center max-w-md">
              There is no live attendance session right now. You will be notified when your teacher starts one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mark Attendance</h1>
        <p className="text-muted-foreground">Smart attendance with location & network verification</p>
      </div>

      {/* Session Info */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[hsl(var(--campus-success))] animate-pulse" />
                Attendance is Live!
              </CardTitle>
              <CardDescription>{activeSession.course} — {activeSession.subject} — {activeSession.batch}</CardDescription>
            </div>
            <div className="flex items-center gap-2 p-2 px-4 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono font-bold text-lg">{timeLeft}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Already marked */}
      {marked && (
        <Card className="border-2 border-[hsl(var(--campus-success))]">
          <CardContent className="flex flex-col items-center py-8">
            <CheckCircle className="h-16 w-16 text-[hsl(var(--campus-success))] mb-4" />
            <h2 className="text-xl font-bold text-[hsl(var(--campus-success))]">Attendance Marked Successfully!</h2>
            <p className="text-muted-foreground">Your attendance has been recorded for this session.</p>
          </CardContent>
        </Card>
      )}

      {!marked && (
        <>
          {/* Verification Section */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* GPS Verification */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  GPS Verification
                  {!activeSession.gps_required && <Badge variant="secondary">Not Required</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeSession.gps_required ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-[hsl(var(--campus-success))]" />
                    <span>GPS verification is disabled for this session</span>
                  </div>
                ) : gpsChecking ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Checking your location...</span>
                  </div>
                ) : gpsVerified ? (
                  <div className="flex items-center gap-2 text-[hsl(var(--campus-success))]">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Campus Location Verified ✔</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gpsError && (
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="h-5 w-5" />
                        <span className="text-sm">{gpsError}</span>
                      </div>
                    )}
                    <Button variant="outline" onClick={verifyGPS} className="w-full gap-2">
                      <MapPin className="h-4 w-4" />
                      Verify Location
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WiFi Verification */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  WiFi / Network Verification
                  {!activeSession.wifi_required && <Badge variant="secondary">Not Required</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeSession.wifi_required ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-[hsl(var(--campus-success))]" />
                    <span>WiFi verification is disabled for this session</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-5 w-5 text-[hsl(var(--campus-warning))]" />
                    <span className="text-sm">WiFi will be verified server-side when you mark attendance</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mark Button */}
          <Card>
            <CardContent className="py-6">
              <Button
                onClick={handleMarkAttendance}
                disabled={!canMark || marking}
                className="w-full h-14 text-lg gap-2"
                size="lg"
              >
                {marking ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Marking Attendance...</>
                ) : (
                  <><CheckCircle className="h-5 w-5" /> Mark My Attendance</>
                )}
              </Button>
              {!canMark && !marked && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Please verify your location or connect to campus WiFi to enable attendance marking.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
