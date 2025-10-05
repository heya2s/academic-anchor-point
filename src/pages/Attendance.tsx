import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, TrendingUp, Target, Clock, Plus, Edit, Trash2, Users, CheckCircle, UserCheck } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

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

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  student_id: string | null;
  roll_number: string | null;
  class: string | null;
}

interface AttendanceWithStudent {
  id: string;
  date: string;
  status: 'Present' | 'Absent';
  student_id: string;
  created_at: string;
  profile?: Student;
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

  // Admin states
  const [students, setStudents] = useState<Student[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceWithStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStatus, setSelectedStatus] = useState<'Present' | 'Absent'>('Present');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceWithStudent | null>(null);
  
  // Bulk attendance states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [bulkStatus, setBulkStatus] = useState<'Present' | 'Absent'>('Present');

  useEffect(() => {
    if (userRole === 'student') {
      fetchAttendanceData();
    } else if (userRole === 'admin') {
      fetchStudents();
      fetchAllAttendanceRecords();
    }
  }, [profile, userRole]);

  const fetchAttendanceData = async () => {
    if (!profile) return;

    try {
      // Get attendance records using user_id
      const { data: attendance, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', profile.user_id)
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

  // Admin functions
  const fetchStudents = async () => {
    try {
      // Fetch all profiles where the user has a student role
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          student_id,
          roll_number,
          class
        `)
        .order('full_name');
      
      if (error) throw error;
      
      // Filter students by checking their role
      const studentProfiles = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .eq('role', 'student')
            .maybeSingle();
          
          return roleData ? profile : null;
        })
      );
      
      setStudents(studentProfiles.filter(p => p !== null) as Student[]);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    }
  };

  const fetchAllAttendanceRecords = async () => {
    try {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles for each attendance record
      const recordsWithProfiles = await Promise.all(
        (attendanceData || []).map(async (record) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, user_id, full_name, student_id, roll_number, class')
            .eq('user_id', record.student_id)
            .maybeSingle();
          
          return {
            ...record,
            profile: profileData
          };
        })
      );
      
      setAllAttendanceRecords(recordsWithProfiles);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendance = async () => {
    if (!selectedStudent || !selectedDate) {
      toast.error('Please select a student and date');
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance')
        .insert({
          student_id: selectedStudent,
          date: selectedDate,
          status: selectedStatus
        });

      if (error) throw error;
      
      toast.success('Attendance marked successfully');
      setIsDialogOpen(false);
      setSelectedStudent('');
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      setSelectedStatus('Present');
      fetchAllAttendanceRecords();
    } catch (error: any) {
      console.error('Error adding attendance:', error);
      if (error.code === '23505') {
        toast.error('Attendance already exists for this student on this date');
      } else {
        toast.error('Failed to mark attendance');
      }
    }
  };

  const handleEditAttendance = async () => {
    if (!editingRecord) return;

    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          status: selectedStatus
        })
        .eq('id', editingRecord.id);

      if (error) throw error;
      
      toast.success('Attendance updated successfully');
      setEditingRecord(null);
      setIsDialogOpen(false);
      fetchAllAttendanceRecords();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Attendance record deleted');
      fetchAllAttendanceRecords();
    } catch (error) {
      console.error('Error deleting attendance:', error);
      toast.error('Failed to delete attendance record');
    }
  };

  const openEditDialog = (record: AttendanceWithStudent) => {
    setEditingRecord(record);
    setSelectedStatus(record.status);
    setIsDialogOpen(true);
  };

  const handleBulkAttendance = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      const attendanceRecords = Array.from(selectedStudents).map(studentId => ({
        student_id: studentId,
        date: bulkDate,
        status: bulkStatus
      }));

      const { error } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (error) throw error;
      
      toast.success(`Attendance marked for ${selectedStudents.size} student(s)`);
      setIsBulkDialogOpen(false);
      setSelectedStudents(new Set());
      setBulkDate(format(new Date(), 'yyyy-MM-dd'));
      setBulkStatus('Present');
      fetchAllAttendanceRecords();
    } catch (error: any) {
      console.error('Error marking bulk attendance:', error);
      if (error.code === '23505') {
        toast.error('Some students already have attendance for this date');
      } else {
        toast.error('Failed to mark attendance');
      }
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.user_id)));
    }
  };

  if (userRole === 'admin') {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-muted rounded-lg mb-6"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <p className="text-muted-foreground">Manage student attendance records</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Bulk Mark Attendance</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Mark Attendance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-date">Date</Label>
                    <Input
                      id="bulk-date"
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulk-status">Status</Label>
                    <Select value={bulkStatus} onValueChange={(value: 'Present' | 'Absent') => setBulkStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Select Students</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                      >
                        {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
                      {students.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No registered students found
                        </p>
                      ) : (
                        students.map((student) => (
                          <div key={student.user_id} className="flex items-center space-x-3">
                            <Checkbox
                              id={`student-${student.user_id}`}
                              checked={selectedStudents.has(student.user_id)}
                              onCheckedChange={() => toggleStudentSelection(student.user_id)}
                            />
                            <label
                              htmlFor={`student-${student.user_id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              <div>
                                <div>{student.full_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {student.student_id && `ID: ${student.student_id}`}
                                  {student.student_id && student.class && ' • '}
                                  {student.class && `Class: ${student.class}`}
                                </div>
                              </div>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedStudents.size > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedStudents.size} student(s) selected
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleBulkAttendance}
                    className="w-full"
                    disabled={selectedStudents.size === 0}
                  >
                    Mark Attendance for {selectedStudents.size} Student(s)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Mark Attendance</span>
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRecord ? 'Edit Attendance' : 'Mark Attendance'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!editingRecord && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="student">Student</Label>
                      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.user_id} value={student.user_id}>
                              {student.full_name} {student.student_id ? `(${student.student_id})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={selectedStatus} onValueChange={(value: 'Present' | 'Absent') => setSelectedStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={editingRecord ? handleEditAttendance : handleAddAttendance}
                  className="w-full"
                >
                  {editingRecord ? 'Update Attendance' : 'Mark Attendance'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="campus-stats-card">
            <div className="p-2 bg-[hsl(var(--campus-blue))]/10 rounded-full">
              <Users className="h-6 w-6 text-[hsl(var(--campus-blue))]" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">{students.length}</p>
            </div>
          </Card>

          <Card className="campus-stats-card">
            <div className="p-2 bg-primary/10 rounded-full">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">{allAttendanceRecords.length}</p>
            </div>
          </Card>

          <Card className="campus-stats-card">
            <div className="p-2 bg-[hsl(var(--campus-success))]/10 rounded-full">
              <TrendingUp className="h-6 w-6 text-[hsl(var(--campus-success))]" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Present Today</p>
              <p className="text-2xl font-bold">
                {allAttendanceRecords.filter(r => 
                  r.date === format(new Date(), 'yyyy-MM-dd') && r.status === 'Present'
                ).length}
              </p>
            </div>
          </Card>

          <Card className="campus-stats-card">
            <div className="p-2 bg-destructive/10 rounded-full">
              <Clock className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Absent Today</p>
              <p className="text-2xl font-bold">
                {allAttendanceRecords.filter(r => 
                  r.date === format(new Date(), 'yyyy-MM-dd') && r.status === 'Absent'
                ).length}
              </p>
            </div>
          </Card>
        </div>

        {/* Attendance Records Table */}
        <Card className="campus-card">
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>Manage all student attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAttendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(record.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{record.profile?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{record.profile?.student_id || 'N/A'}</TableCell>
                    <TableCell>{record.profile?.class || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={record.status === 'Present' ? 'campus-attendance-present' : 'campus-attendance-absent'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAttendance(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {allAttendanceRecords.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No attendance records found
              </p>
            )}
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