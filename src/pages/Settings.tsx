import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Settings as SettingsIcon, 
  Shield, 
  Database, 
  Bell,
  Save,
  UserCheck,
  Mail,
  Key,
  Lock,
  GraduationCap
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
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    emailNotices: true,
    emailAttendance: true,
    emailUploadAlerts: false
  });
  const [systemSettings, setSystemSettings] = useState({
    currentSemester: '1',
    academicYear: '2024-2025',
    defaultClass: ''
  });

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSystemStats();
      fetchSystemSettings();
    }
    fetchUserProfile();
    fetchNotificationPreferences();
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

  const fetchNotificationPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNotifications({
          emailNotices: data.email_notices,
          emailAttendance: data.email_attendance,
          emailUploadAlerts: data.email_upload_alerts
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSystemSettings({
          currentSemester: data.current_semester || '1',
          academicYear: data.academic_year || '2024-2025',
          defaultClass: data.default_class || ''
        });
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleNotificationToggle = async (key: keyof typeof notifications) => {
    if (!user) return;

    const newValue = !notifications[key];
    const updatedNotifications = {
      ...notifications,
      [key]: newValue
    };

    setNotifications(updatedNotifications);

    try {
      // Map state keys to database column names
      const dbColumnMap = {
        emailNotices: 'email_notices',
        emailAttendance: 'email_attendance',
        emailUploadAlerts: 'email_upload_alerts'
      };

      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing preferences
        const { error } = await supabase
          .from('notification_preferences')
          .update({
            [dbColumnMap[key]]: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            email_notices: updatedNotifications.emailNotices,
            email_attendance: updatedNotifications.emailAttendance,
            email_upload_alerts: updatedNotifications.emailUploadAlerts
          });

        if (error) throw error;
      }

      toast({
        title: "Setting Updated",
        description: "Notification preference has been saved.",
      });
    } catch (error: any) {
      console.error('Error saving notification preference:', error);
      // Revert the change on error
      setNotifications(notifications);
      toast({
        title: "Error",
        description: "Failed to save notification preference.",
        variant: "destructive",
      });
    }
  };

  const handleSystemSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSystemSettings({
      ...systemSettings,
      [e.target.name]: e.target.value
    });
  };

  const handleSystemSettingsSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if system settings exist
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing system settings
        const { error } = await supabase
          .from('system_settings')
          .update({
            current_semester: systemSettings.currentSemester,
            academic_year: systemSettings.academicYear,
            default_class: systemSettings.defaultClass,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new system settings
        const { error } = await supabase
          .from('system_settings')
          .insert({
            current_semester: systemSettings.currentSemester,
            academic_year: systemSettings.academicYear,
            default_class: systemSettings.defaultClass,
            updated_by: user.id
          });

        if (error) throw error;
      }

      toast({
        title: "System Settings Saved",
        description: "System-wide settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving system settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save system settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      {/* Password Change */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-primary" />
            <span>Change Password</span>
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordInputChange}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordInputChange}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordInputChange}
                placeholder="Confirm new password"
              />
            </div>
            <Button type="submit" disabled={loading} className="campus-button-primary">
              <Key className="h-4 w-4 mr-2" />
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <span>Notification Preferences</span>
          </CardTitle>
          <CardDescription>Manage your notification settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Email Notifications for Notices</div>
              <div className="text-sm text-muted-foreground">
                Receive email when new notices are posted
              </div>
            </div>
            <Switch
              checked={notifications.emailNotices}
              onCheckedChange={() => handleNotificationToggle('emailNotices')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Attendance Alert Emails</div>
              <div className="text-sm text-muted-foreground">
                Get notified about attendance updates
              </div>
            </div>
            <Switch
              checked={notifications.emailAttendance}
              onCheckedChange={() => handleNotificationToggle('emailAttendance')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">File Upload Notifications</div>
              <div className="text-sm text-muted-foreground">
                Email alerts for new syllabus and PYQ uploads
              </div>
            </div>
            <Switch
              checked={notifications.emailUploadAlerts}
              onCheckedChange={() => handleNotificationToggle('emailUploadAlerts')}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span>System Configuration</span>
          </CardTitle>
          <CardDescription>Configure system-wide academic settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currentSemester">Current Semester</Label>
              <Input
                id="currentSemester"
                name="currentSemester"
                value={systemSettings.currentSemester}
                onChange={handleSystemSettingsChange}
                placeholder="e.g., 1, 2, 3..."
              />
            </div>
            <div>
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                name="academicYear"
                value={systemSettings.academicYear}
                onChange={handleSystemSettingsChange}
                placeholder="e.g., 2024-2025"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="defaultClass">Default Class</Label>
            <Input
              id="defaultClass"
              name="defaultClass"
              value={systemSettings.defaultClass}
              onChange={handleSystemSettingsChange}
              placeholder="e.g., CSE-A, ECE-B"
            />
          </div>
          <Button 
            onClick={handleSystemSettingsSave} 
            className="campus-button-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            Save System Settings
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <span>Advanced Settings</span>
          </CardTitle>
          <CardDescription>Additional system information and controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">File Upload Limits</div>
              <div className="text-sm text-muted-foreground">
                Max size: 50MB per file (PDF, DOCX, PPTX)
              </div>
            </div>
            <Badge variant="outline">Configured</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Database Status</div>
              <div className="text-sm text-muted-foreground">
                Automatic backups enabled with 30-day retention
              </div>
            </div>
            <Badge className="bg-[hsl(var(--campus-success))]/10 text-[hsl(var(--campus-success))]">Active</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Storage Usage</div>
              <div className="text-sm text-muted-foreground">
                Current storage utilization and capacity
              </div>
            </div>
            <Badge variant="outline">Monitor</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}