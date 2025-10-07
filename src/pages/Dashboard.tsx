import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  BookOpen, 
  Bell, 
  TrendingUp, 
  Award,
  Clock,
  Target
} from "lucide-react";
import { Link } from "react-router-dom";

interface AttendanceData {
  total_days: number;
  present_days: number;
  percentage: number;
  latest_status: string;
}

interface DashboardStats {
  totalStudents?: number;
  totalNotices?: number;
  totalSyllabus?: number;
  totalPYQs?: number;
}

export default function Dashboard() {
  const { userRole, profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [userRole]);

  const fetchDashboardData = async () => {
    try {
      if (userRole === 'student') {
        await fetchStudentData();
      } else if (userRole === 'admin') {
        await fetchAdminData();
      }
      await fetchRecentNotices();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async () => {
    if (!profile) return;

    // Get student record
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (student) {
      // Get attendance data
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false });

      if (attendanceData) {
        const totalDays = attendanceData.length;
        const presentDays = attendanceData.filter(a => a.status === 'Present').length;
        const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
        const latestStatus = attendanceData[0]?.status || 'No Record';

        setAttendance({
          total_days: totalDays,
          present_days: presentDays,
          percentage,
          latest_status: latestStatus
        });
      }
    }
  };

  const fetchAdminData = async () => {
    // Get admin dashboard statistics
    const [studentRolesRes, noticesRes, syllabusRes, pyqsRes] = await Promise.all([
      supabase.from('user_roles').select('user_id').eq('role', 'student'),
      supabase.from('notices').select('id', { count: 'exact' }),
      supabase.from('syllabus').select('id', { count: 'exact' }),
      supabase.from('pyqs').select('id', { count: 'exact' })
    ]);

    const totalStudents = studentRolesRes.data?.length || 0;

    setStats({
      totalStudents,
      totalNotices: noticesRes.count || 0,
      totalSyllabus: syllabusRes.count || 0,
      totalPYQs: pyqsRes.count || 0
    });
  };

  const fetchRecentNotices = async () => {
    const { data } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    setRecentNotices(data || []);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">
          Welcome back, {profile?.full_name}!
        </h1>
        <p className="text-muted-foreground">
          Here's your {userRole} dashboard overview
        </p>
      </div>

      {userRole === 'student' ? <StudentDashboard attendance={attendance} /> : <AdminDashboard stats={stats} />}

      {/* Recent Notices */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <span>Recent Notices</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentNotices.length > 0 ? (
            <div className="space-y-4">
              {recentNotices.map((notice) => (
                <div key={notice.id} className="border-l-4 border-primary pl-4">
                  <h4 className="font-medium">{notice.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notice.message.length > 100 
                      ? `${notice.message.substring(0, 100)}...` 
                      : notice.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notice.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
              <Link to="/notices">
                <Button variant="outline" className="w-full mt-4">
                  View All Notices
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground">No notices available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentDashboard({ attendance }: { attendance: AttendanceData | null }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Attendance Card */}
      <Card className="campus-stats-card">
        <div className="p-2 bg-primary/10 rounded-full">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Attendance</p>
          <p className="text-2xl font-bold">
            {attendance?.percentage.toFixed(1) || '0'}%
          </p>
          <Badge 
            className={attendance?.latest_status === 'Present' 
              ? 'campus-attendance-present' 
              : 'campus-attendance-absent'}
          >
            {attendance?.latest_status || 'No Record'}
          </Badge>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="campus-stats-card">
        <div className="p-2 bg-[hsl(var(--campus-blue))]/10 rounded-full">
          <Target className="h-6 w-6 text-[hsl(var(--campus-blue))]" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Total Days</p>
          <p className="text-2xl font-bold">{attendance?.total_days || 0}</p>
          <p className="text-xs text-muted-foreground">
            Present: {attendance?.present_days || 0}
          </p>
        </div>
      </Card>

      <Card className="campus-stats-card">
        <div className="p-2 bg-[hsl(var(--campus-indigo))]/10 rounded-full">
          <BookOpen className="h-6 w-6 text-[hsl(var(--campus-indigo))]" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Syllabus</p>
          <p className="text-2xl font-bold">Available</p>
          <Link to="/syllabus">
            <Button variant="link" size="sm" className="p-0 h-auto">
              View Materials
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="campus-stats-card">
        <div className="p-2 bg-[hsl(var(--campus-success))]/10 rounded-full">
          <Award className="h-6 w-6 text-[hsl(var(--campus-success))]" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">PYQs</p>
          <p className="text-2xl font-bold">Ready</p>
          <Link to="/pyqs">
            <Button variant="link" size="sm" className="p-0 h-auto">
              Practice Now
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function AdminDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="campus-stats-card">
        <div className="p-2 bg-primary/10 rounded-full">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Total Students</p>
          <p className="text-2xl font-bold">{stats.totalStudents}</p>
          <Link to="/students">
            <Button variant="link" size="sm" className="p-0 h-auto">
              Manage Students
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="campus-stats-card">
        <div className="p-2 bg-[hsl(var(--campus-blue))]/10 rounded-full">
          <Bell className="h-6 w-6 text-[hsl(var(--campus-blue))]" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Active Notices</p>
          <p className="text-2xl font-bold">{stats.totalNotices}</p>
          <Link to="/notices">
            <Button variant="link" size="sm" className="p-0 h-auto">
              View Notices
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="campus-stats-card">
        <div className="p-2 bg-[hsl(var(--campus-indigo))]/10 rounded-full">
          <BookOpen className="h-6 w-6 text-[hsl(var(--campus-indigo))]" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Syllabus Files</p>
          <p className="text-2xl font-bold">{stats.totalSyllabus}</p>
          <Link to="/upload">
            <Button variant="link" size="sm" className="p-0 h-auto">
              Upload More
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="campus-stats-card">
        <div className="p-2 bg-[hsl(var(--campus-success))]/10 rounded-full">
          <TrendingUp className="h-6 w-6 text-[hsl(var(--campus-success))]" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">PYQ Files</p>
          <p className="text-2xl font-bold">{stats.totalPYQs}</p>
          <Link to="/analytics">
            <Button variant="link" size="sm" className="p-0 h-auto">
              View Analytics
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}