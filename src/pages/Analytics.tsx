import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  FileText, 
  Calendar, 
  Target,
  Award,
  Clock
} from "lucide-react";

interface AnalyticsData {
  totalStudents: number;
  totalNotices: number;
  totalSyllabus: number;
  totalPYQs: number;
  attendanceStats: {
    totalRecords: number;
    averageAttendance: number;
    presentCount: number;
    absentCount: number;
  };
  classDistribution: { class: string; count: number }[];
  subjectDistribution: { subject: string; syllabusCount: number; pyqCount: number }[];
  monthlyUploads: { month: string; syllabus: number; pyqs: number }[];
  recentActivity: any[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--campus-blue))', 'hsl(var(--campus-indigo))', 'hsl(var(--campus-success))'];

export default function Analytics() {
  const { userRole } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchAnalyticsData();
    }
  }, [userRole]);

  const fetchAnalyticsData = async () => {
    try {
      const [
        studentsRes,
        noticesRes,
        syllabusRes,
        pyqsRes,
        attendanceRes
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('notices').select('*'),
        supabase.from('syllabus').select('*'),
        supabase.from('pyqs').select('*'),
        supabase.from('attendance').select('*')
      ]);

      // Process class distribution
      const classDistribution = studentsRes.data?.reduce((acc: any, student) => {
        const existing = acc.find((item: any) => item.class === student.class);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ class: student.class, count: 1 });
        }
        return acc;
      }, []) || [];

      // Process subject distribution
      const subjects = new Set([
        ...(syllabusRes.data?.map(s => s.subject) || []),
        ...(pyqsRes.data?.map(p => p.subject) || [])
      ]);

      const subjectDistribution = Array.from(subjects).map(subject => ({
        subject,
        syllabusCount: syllabusRes.data?.filter(s => s.subject === subject).length || 0,
        pyqCount: pyqsRes.data?.filter(p => p.subject === subject).length || 0
      }));

      // Process monthly uploads (last 6 months)
      const monthlyUploads = getMonthlyUploads(syllabusRes.data || [], pyqsRes.data || []);

      // Process attendance stats
      const attendanceData = attendanceRes.data || [];
      const presentCount = attendanceData.filter(a => a.status === 'Present').length;
      const absentCount = attendanceData.filter(a => a.status === 'Absent').length;
      const averageAttendance = attendanceData.length > 0 ? (presentCount / attendanceData.length) * 100 : 0;

      // Recent activity (last 10 uploads/notices)
      const recentSyllabus = syllabusRes.data?.slice(0, 5).map(s => ({
        ...s,
        type: 'syllabus',
        title: `${s.subject} - ${s.semester}`
      })) || [];
      
      const recentPyqs = pyqsRes.data?.slice(0, 5).map(p => ({
        ...p,
        type: 'pyq',
        title: `${p.subject} - ${p.semester} (${p.year})`
      })) || [];
      
      const recentNotices = noticesRes.data?.slice(0, 5).map(n => ({
        ...n,
        type: 'notice'
      })) || [];

      const recentActivity = [...recentSyllabus, ...recentPyqs, ...recentNotices]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setAnalytics({
        totalStudents: studentsRes.data?.length || 0,
        totalNotices: noticesRes.data?.length || 0,
        totalSyllabus: syllabusRes.data?.length || 0,
        totalPYQs: pyqsRes.data?.length || 0,
        attendanceStats: {
          totalRecords: attendanceData.length,
          averageAttendance,
          presentCount,
          absentCount
        },
        classDistribution,
        subjectDistribution,
        monthlyUploads,
        recentActivity
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyUploads = (syllabusData: any[], pyqData: any[]) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const syllabusCount = syllabusData.filter(s => {
        const uploadDate = new Date(s.created_at);
        return uploadDate.getMonth() === date.getMonth() && 
               uploadDate.getFullYear() === date.getFullYear();
      }).length;
      
      const pyqCount = pyqData.filter(p => {
        const uploadDate = new Date(p.created_at);
        return uploadDate.getMonth() === date.getMonth() && 
               uploadDate.getFullYear() === date.getFullYear();
      }).length;
      
      months.push({ month: monthName, syllabus: syllabusCount, pyqs: pyqCount });
    }
    
    return months;
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="campus-card">
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only administrators can access analytics.
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive insights into your campus portal</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="campus-stats-card">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Students</p>
            <p className="text-2xl font-bold">{analytics.totalStudents}</p>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </div>
        </Card>

        <Card className="campus-stats-card">
          <div className="p-2 bg-[hsl(var(--campus-blue))]/10 rounded-full">
            <Target className="h-6 w-6 text-[hsl(var(--campus-blue))]" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
            <p className="text-2xl font-bold">{analytics.attendanceStats.averageAttendance.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              {analytics.attendanceStats.totalRecords} total records
            </p>
          </div>
        </Card>

        <Card className="campus-stats-card">
          <div className="p-2 bg-[hsl(var(--campus-indigo))]/10 rounded-full">
            <BookOpen className="h-6 w-6 text-[hsl(var(--campus-indigo))]" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Syllabus Files</p>
            <p className="text-2xl font-bold">{analytics.totalSyllabus}</p>
            <p className="text-xs text-muted-foreground">Available downloads</p>
          </div>
        </Card>

        <Card className="campus-stats-card">
          <div className="p-2 bg-[hsl(var(--campus-success))]/10 rounded-full">
            <FileText className="h-6 w-6 text-[hsl(var(--campus-success))]" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">PYQ Papers</p>
            <p className="text-2xl font-bold">{analytics.totalPYQs}</p>
            <p className="text-xs text-muted-foreground">Practice papers</p>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Distribution */}
        <Card className="campus-card">
          <CardHeader>
            <CardTitle>Class Distribution</CardTitle>
            <CardDescription>Number of students per class</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.classDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ class: className, count }) => `${className}: ${count}`}
                >
                  {analytics.classDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Uploads */}
        <Card className="campus-card">
          <CardHeader>
            <CardTitle>Monthly Uploads</CardTitle>
            <CardDescription>File uploads over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.monthlyUploads}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="syllabus" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Syllabus"
                />
                <Line 
                  type="monotone" 
                  dataKey="pyqs" 
                  stroke="hsl(var(--campus-blue))" 
                  strokeWidth={2}
                  name="PYQs"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Distribution */}
        <Card className="campus-card">
          <CardHeader>
            <CardTitle>Subject Files</CardTitle>
            <CardDescription>Syllabus and PYQ files by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.subjectDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="subject" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="syllabusCount" fill="hsl(var(--primary))" name="Syllabus" />
                <Bar dataKey="pyqCount" fill="hsl(var(--campus-blue))" name="PYQs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Overview */}
        <Card className="campus-card">
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
            <CardDescription>Present vs Absent records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-[hsl(var(--campus-success))] rounded-full"></div>
                  <span className="text-sm">Present</span>
                </div>
                <Badge className="bg-[hsl(var(--campus-success))]/10 text-[hsl(var(--campus-success))]">
                  {analytics.attendanceStats.presentCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-destructive rounded-full"></div>
                  <span className="text-sm">Absent</span>
                </div>
                <Badge variant="destructive">
                  {analytics.attendanceStats.absentCount}
                </Badge>
              </div>
              <div className="pt-4 border-t">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: analytics.attendanceStats.presentCount },
                        { name: 'Absent', value: analytics.attendanceStats.absentCount }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                    >
                      <Cell fill="hsl(var(--campus-success))" />
                      <Cell fill="hsl(var(--destructive))" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>Latest uploads and announcements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentActivity.slice(0, 8).map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'syllabus' ? 'bg-primary/10' :
                    activity.type === 'pyq' ? 'bg-[hsl(var(--campus-blue))]/10' :
                    'bg-[hsl(var(--campus-indigo))]/10'
                  }`}>
                    {activity.type === 'syllabus' && <BookOpen className="h-4 w-4 text-primary" />}
                    {activity.type === 'pyq' && <FileText className="h-4 w-4 text-[hsl(var(--campus-blue))]" />}
                    {activity.type === 'notice' && <Award className="h-4 w-4 text-[hsl(var(--campus-indigo))]" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {activity.type === 'notice' ? activity.title : activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.type === 'notice' ? 'Notice posted' : 
                       activity.type === 'syllabus' ? 'Syllabus uploaded' : 'PYQ uploaded'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}