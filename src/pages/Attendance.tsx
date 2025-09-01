import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Target, Clock } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'Present' | 'Absent';
  created_at: string;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
}

export default function Attendance() {
  const { profile, userRole } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (userRole === 'student') {
      fetchAttendanceData();
    }
  }, [profile, userRole]);

  const fetchAttendanceData = async () => {
    if (!profile) return;

    try {
      // Get student record first
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profile.user_id)
        .single();

      if (student) {
        // Get attendance records
        const { data: attendance, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false });

        if (error) throw error;

        setAttendanceRecords(attendance || []);
        
        // Calculate stats
        const totalDays = attendance?.length || 0;
        const presentDays = attendance?.filter(a => a.status === 'Present').length || 0;
        const absentDays = totalDays - presentDays;
        const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        setStats({
          totalDays,
          presentDays,
          absentDays,
          percentage
        });
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getAttendanceForDay = (day: Date) => {
    return attendanceRecords.find(record => 
      isSameDay(parseISO(record.date), day)
    );
  };

  if (userRole === 'admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground">Manage student attendance records</p>
        </div>
        
        <Card className="campus-card">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Admin attendance management features coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground">Track your attendance records and statistics</p>
      </div>

      {/* Attendance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="campus-stats-card">
          <div className="p-2 bg-primary/10 rounded-full">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
            <p className="text-2xl font-bold">{stats.percentage.toFixed(1)}%</p>
            <Badge className={stats.percentage >= 75 ? 'campus-attendance-present' : 'campus-attendance-absent'}>
              {stats.percentage >= 75 ? 'Good' : 'Low'}
            </Badge>
          </div>
        </Card>

        <Card className="campus-stats-card">
          <div className="p-2 bg-[hsl(var(--campus-success))]/10 rounded-full">
            <TrendingUp className="h-6 w-6 text-[hsl(var(--campus-success))]" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Present Days</p>
            <p className="text-2xl font-bold">{stats.presentDays}</p>
            <p className="text-xs text-muted-foreground">
              of {stats.totalDays} total days
            </p>
          </div>
        </Card>

        <Card className="campus-stats-card">
          <div className="p-2 bg-destructive/10 rounded-full">
            <Clock className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Absent Days</p>
            <p className="text-2xl font-bold">{stats.absentDays}</p>
            <p className="text-xs text-muted-foreground">
              Missing classes
            </p>
          </div>
        </Card>

        <Card className="campus-stats-card">
          <div className="p-2 bg-[hsl(var(--campus-blue))]/10 rounded-full">
            <Calendar className="h-6 w-6 text-[hsl(var(--campus-blue))]" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Days</p>
            <p className="text-2xl font-bold">{stats.totalDays}</p>
            <p className="text-xs text-muted-foreground">
              Recorded attendance
            </p>
          </div>
        </Card>
      </div>

      {/* Calendar View */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Attendance Calendar - {format(currentDate, 'MMMM yyyy')}</span>
          </CardTitle>
          <CardDescription>
            View your daily attendance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {getCalendarDays().map(day => {
              const attendance = getAttendanceForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    p-3 text-center text-sm rounded-lg border transition-colors
                    ${attendance?.status === 'Present' 
                      ? 'bg-[hsl(var(--campus-success))]/10 border-[hsl(var(--campus-success))]/20 text-[hsl(var(--campus-success))]' 
                      : attendance?.status === 'Absent'
                      ? 'bg-destructive/10 border-destructive/20 text-destructive'
                      : 'bg-muted/50 border-border text-muted-foreground'
                    }
                  `}
                >
                  <div className="font-medium">{format(day, 'd')}</div>
                  {attendance && (
                    <div className="text-xs mt-1">
                      {attendance.status === 'Present' ? 'P' : 'A'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Attendance Records */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle>Recent Records</CardTitle>
          <CardDescription>Your latest attendance entries</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length > 0 ? (
            <div className="space-y-3">
              {attendanceRecords.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{format(parseISO(record.date), 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      Recorded: {format(parseISO(record.created_at), 'h:mm a')}
                    </p>
                  </div>
                  <Badge className={record.status === 'Present' ? 'campus-attendance-present' : 'campus-attendance-absent'}>
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No attendance records found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}