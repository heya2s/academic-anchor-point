import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Play, Square, Clock, Users, CheckCircle, AlertCircle, Wifi, MapPin, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface AttendanceSession {
  id: string;
  course: string;
  subject: string;
  batch: string;
  duration_minutes: number;
  gps_required: boolean;
  wifi_required: boolean;
  status: string;
  started_by: string;
  started_at: string;
  expires_at: string;
  closed_at: string | null;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  user_id: string;
  marked_at: string;
  verification_type: string;
  ip_address: string | null;
  latitude: number | null;
  longitude: number | null;
  device_info: string | null;
  student?: { name: string; student_id: string | null; roll_no: string | null };
}

export default function AttendanceControl() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  // New session form
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [batch, setBatch] = useState("");
  const [duration, setDuration] = useState(10);
  const [gpsRequired, setGpsRequired] = useState(true);
  const [wifiRequired, setWifiRequired] = useState(true);

  useEffect(() => {
    fetchSessions();
    fetchTotalStudents();
  }, []);

  // Real-time subscription for attendance records
  useEffect(() => {
    if (!activeSession) return;

    const channel = supabase
      .channel('smart-attendance-records')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'smart_attendance_records',
        filter: `session_id=eq.${activeSession.id}`
      }, (payload) => {
        fetchSessionRecords(activeSession.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeSession?.id]);

  // Countdown timer
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') {
      setTimeLeft("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const expires = new Date(activeSession.expires_at);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        // Auto-close
        handleCloseSession(activeSession.id);
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSessions((data as AttendanceSession[]) || []);

      const active = (data as AttendanceSession[])?.find(s => s.status === 'active');
      if (active) {
        setActiveSession(active);
        fetchSessionRecords(active.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalStudents = async () => {
    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');
    setTotalStudents(count || 0);
  };

  const fetchSessionRecords = async (sessionId: string) => {
    const { data } = await supabase
      .from('smart_attendance_records')
      .select('*')
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: false });

    if (data) {
      // Fetch student names
      const enriched = await Promise.all(
        (data as AttendanceRecord[]).map(async (r) => {
          const { data: student } = await supabase
            .from('students')
            .select('name, student_id, roll_no')
            .eq('id', r.student_id)
            .single();
          return { ...r, student: student || undefined };
        })
      );
      setRecords(enriched);
    }
  };

  const handleStartSession = async () => {
    if (!course || !subject || !batch) {
      toast.error("Please fill all required fields");
      return;
    }

    setCreating(true);
    try {
      const expiresAt = new Date(Date.now() + duration * 60000).toISOString();

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          course,
          subject,
          batch,
          duration_minutes: duration,
          gps_required: gpsRequired,
          wifi_required: wifiRequired,
          started_by: user!.id,
          expires_at: expiresAt,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Attendance session started!");
      setIsDialogOpen(false);
      setActiveSession(data as AttendanceSession);
      setCourse(""); setSubject(""); setBatch("");
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || "Failed to start session");
    } finally {
      setCreating(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      toast.success("Session closed");
      setActiveSession(null);
      fetchSessions();
    } catch (err: any) {
      toast.error("Failed to close session");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4" />
        <div className="h-40 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Control Panel</h1>
          <p className="text-muted-foreground">Start and manage smart attendance sessions</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!!activeSession} className="gap-2">
              <Play className="h-4 w-4" />
              Start New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Attendance Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Course *</Label>
                <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. B.Tech CSE" />
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Data Structures" />
              </div>
              <div className="space-y-2">
                <Label>Batch / Semester *</Label>
                <Input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. 2024 / Sem 3" />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="20">20 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> GPS Verification</Label>
                <Switch checked={gpsRequired} onCheckedChange={setGpsRequired} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Wifi className="h-4 w-4" /> WiFi Verification</Label>
                <Switch checked={wifiRequired} onCheckedChange={setWifiRequired} />
              </div>
              <Button onClick={handleStartSession} disabled={creating} className="w-full">
                {creating ? "Starting..." : "Start Attendance Session"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Session Card */}
      {activeSession && (
        <Card className="border-2 border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[hsl(var(--campus-success))] animate-pulse" />
                  Live Session
                </CardTitle>
                <CardDescription>
                  {activeSession.course} — {activeSession.subject} — {activeSession.batch}
                </CardDescription>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleCloseSession(activeSession.id)} className="gap-2">
                <Square className="h-4 w-4" /> Close Session
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Time Left</p>
                  <p className="text-lg font-bold font-mono">{timeLeft}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-[hsl(var(--campus-blue))]" />
                <div>
                  <p className="text-xs text-muted-foreground">Marked</p>
                  <p className="text-lg font-bold">{records.length}/{totalStudents}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 text-[hsl(var(--campus-indigo))]" />
                <div>
                  <p className="text-xs text-muted-foreground">GPS</p>
                  <p className="text-sm font-medium">{activeSession.gps_required ? "Required" : "Off"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Wifi className="h-5 w-5 text-[hsl(var(--campus-info))]" />
                <div>
                  <p className="text-xs text-muted-foreground">WiFi</p>
                  <p className="text-sm font-medium">{activeSession.wifi_required ? "Required" : "Off"}</p>
                </div>
              </div>
            </div>

            {/* Live Records */}
            {records.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2">Attendance Log</h3>
                <div className="border rounded-lg overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Verified Via</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.student?.name || "Unknown"}</TableCell>
                          <TableCell>{r.student?.student_id || r.student?.roll_no || "—"}</TableCell>
                          <TableCell>{format(new Date(r.marked_at), "hh:mm:ss a")}</TableCell>
                          <TableCell>
                            <Badge variant={r.verification_type === 'both' ? 'default' : 'secondary'}>
                              {r.verification_type === 'gps' && <><MapPin className="h-3 w-3 mr-1" />GPS</>}
                              {r.verification_type === 'wifi' && <><Wifi className="h-3 w-3 mr-1" />WiFi</>}
                              {r.verification_type === 'both' && <><CheckCircle className="h-3 w-3 mr-1" />Both</>}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>All past attendance sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sessions yet. Start your first attendance session.</p>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.course}</TableCell>
                      <TableCell>{s.subject}</TableCell>
                      <TableCell>{s.batch}</TableCell>
                      <TableCell>{format(new Date(s.started_at), "MMM dd, hh:mm a")}</TableCell>
                      <TableCell>{s.duration_minutes} min</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                          {s.status === 'active' ? 'Active' : 'Closed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
