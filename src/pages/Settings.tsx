import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings as SettingsIcon, 
  Shield, 
  Database, 
  Bell,
  Save,
  UserCheck,
  Mail,
  Key
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SystemStats {
  totalStudents: number;
  totalNotices: number;
  totalSyllabusFiles: number;
  totalPYQFiles: number;
}

export default function Settings() {
  const { userRole, user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    totalStudents: 0,
    totalNotices: 0,
    totalSyllabusFiles: 0,
    totalPYQFiles: 0
  });
  const [profileData, setProfileData] = useState({
    full_name: '',
    student_id: '',
    roll_number: '',
    class: ''
  });

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSystemStats();
    }
    fetchUserProfile();
  }, [userRole]);

  const fetchSystemStats = async () => {
    try {
      const [studentsRes, noticesRes, syllabusRes, pyqsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }),
        supabase.from('notices').select('id', { count: 'exact' }),
        supabase.from('syllabus').select('id', { count: 'exact' }),
        supabase.from('pyqs').select('id', { count: 'exact' })
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalNotices: noticesRes.count || 0,
        totalSyllabusFiles: syllabusRes.count || 0,
        totalPYQFiles: pyqsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          student_id: data.student_id || '',
          roll_number: data.roll_number || '',
          class: data.class || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(profileData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="campus-card">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only administrators can access system settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage system settings and configuration</p>
      </div>

      {/* System Overview */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <span>System Overview</span>
          </CardTitle>
          <CardDescription>Current system statistics and data overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
              <div className="text-sm text-muted-foreground">Students</div>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.totalNotices}</div>
              <div className="text-sm text-muted-foreground">Notices</div>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.totalSyllabusFiles}</div>
              <div className="text-sm text-muted-foreground">Syllabus Files</div>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.totalPYQFiles}</div>
              <div className="text-sm text-muted-foreground">PYQ Files</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>Profile Settings</span>
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={profileData.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="student_id">Student ID</Label>
                <Input
                  id="student_id"
                  name="student_id"
                  value={profileData.student_id}
                  onChange={handleInputChange}
                  placeholder="Enter student ID"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="roll_number">Roll Number</Label>
                <Input
                  id="roll_number"
                  name="roll_number"
                  value={profileData.roll_number}
                  onChange={handleInputChange}
                  placeholder="Enter roll number"
                />
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Input
                  id="class"
                  name="class"
                  value={profileData.class}
                  onChange={handleInputChange}
                  placeholder="Enter class"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="campus-button-primary">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <span>Account Information</span>
          </CardTitle>
          <CardDescription>Your account details and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Email</span>
            </div>
            <span className="text-muted-foreground">{user?.email}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Role</span>
            </div>
            <Badge className="bg-primary/10 text-primary">
              {userRole?.charAt(0).toUpperCase()}{userRole?.slice(1)}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Account Created</span>
            </div>
            <span className="text-muted-foreground">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <span>System Configuration</span>
          </CardTitle>
          <CardDescription>System-wide settings and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">File Upload Settings</div>
              <div className="text-sm text-muted-foreground">
                Maximum file size and allowed formats for uploads
              </div>
            </div>
            <Badge variant="outline">Configured</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Notification Settings</div>
              <div className="text-sm text-muted-foreground">
                Email notifications and alerts configuration
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">Active</Badge>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Database Backup</div>
              <div className="text-sm text-muted-foreground">
                Automatic backup schedule and retention policy
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}