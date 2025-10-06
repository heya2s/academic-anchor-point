import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  GraduationCap,
  Mail,
  Hash
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  validateLength, 
  validateStudentId, 
  validateRollNumber,
  validateEmail,
  sanitizeFormData, 
  VALIDATION_LIMITS 
} from "@/utils/validation";

interface Student {
  id: string;
  name: string;
  student_id: string;
  roll_no: string;
  class: string;
  email: string;
  user_id: string;
  created_at: string;
}

export default function Students() {
  const { userRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    student_id: '',
    roll_no: '',
    class: '',
    email: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userRole === 'admin') {
      fetchStudents();
    }
  }, [userRole]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm]);

  const fetchStudents = async () => {
    try {
      // Fetch from students table
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (studentsError) throw studentsError;

      // Fetch from profiles table for users who signed up as students
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .not('student_id', 'is', null)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Combine both datasets and remove duplicates
      const allStudents: Student[] = [];
      
      // Add students from students table
      if (studentsData) {
        allStudents.push(...studentsData);
      }

      // Add students from profiles table (convert format)
      if (profilesData) {
        const profileStudents: Student[] = profilesData
          .filter(profile => !studentsData?.some(student => student.email === profile.user_id)) // Avoid duplicates
          .map(profile => ({
            id: profile.id,
            name: profile.full_name,
            student_id: profile.student_id || '',
            roll_no: profile.roll_number || '',
            class: profile.class || '',
            email: profile.email,
            user_id: profile.user_id,
            created_at: profile.created_at
          }));
        allStudents.push(...profileStudents);
      }

      setStudents(allStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchTerm) {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  };

  const validateStudentForm = (data: typeof formData): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    const nameError = validateLength(data.name, VALIDATION_LIMITS.FULL_NAME);
    if (nameError) errors.name = nameError;
    
    const studentIdError = validateStudentId(data.student_id);
    if (studentIdError) errors.student_id = studentIdError;
    
    const rollNoError = validateRollNumber(data.roll_no);
    if (rollNoError) errors.roll_no = rollNoError;
    
    const classError = validateLength(data.class, VALIDATION_LIMITS.CLASS_NAME);
    if (classError) errors.class = classError;
    
    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;
    
    return errors;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and sanitize form data
    const sanitizedData = sanitizeFormData(formData) as typeof formData;
    const errors = validateStudentForm(sanitizedData);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    
    try {
      // Create student record without auth account
      // Students can sign up themselves later and their account will be linked
      const { error: studentError } = await supabase
        .from('students')
        .insert([{
          name: sanitizedData.name,
          student_id: sanitizedData.student_id,
          roll_no: sanitizedData.roll_no,
          class: sanitizedData.class,
          email: sanitizedData.email,
          user_id: null
        }]);

      if (studentError) throw studentError;

      toast({
        title: "Success",
        description: "Student added successfully. They can sign up using their email to access the portal.",
      });

      resetForm();
      setShowAddDialog(false);
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
        variant: "destructive",
      });
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    // Validate and sanitize form data
    const sanitizedData = sanitizeFormData(formData) as typeof formData;
    const errors = validateStudentForm(sanitizedData);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});

    try {
      const { error } = await supabase
        .from('students')
        .update(sanitizedData)
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student updated successfully",
      });

      resetForm();
      setShowEditDialog(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.name}?`)) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student deleted successfully",
      });

      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      student_id: student.student_id,
      roll_no: student.roll_no,
      class: student.class,
      email: student.email
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      student_id: '',
      roll_no: '',
      class: '',
      email: ''
    });
    setValidationErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="campus-card">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only administrators can access student management.
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
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Manage student records and information</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="campus-button-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Enter the student's information below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Student ID</label>
                  <Input
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    placeholder="Student ID"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Roll Number</label>
                  <Input
                    name="roll_no"
                    value={formData.roll_no}
                    onChange={handleInputChange}
                    placeholder="Roll number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Class</label>
                  <Input
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    placeholder="Class/Section"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email address"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="campus-button-primary">
                  Add Student
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="campus-card">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, ID, roll number, class, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="campus-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Students ({filteredStudents.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 bg-primary/10 rounded-full">
                            <GraduationCap className="h-4 w-4 text-primary" />
                          </div>
                          <span>{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {student.student_id}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          <span>{student.roll_no}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-[hsl(var(--campus-blue))]/10 text-[hsl(var(--campus-blue))]">
                          {student.class}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{student.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(student)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteStudent(student)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'No students have been added yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student's information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Student ID</label>
                <Input
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  placeholder="Student ID"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Roll Number</label>
                <Input
                  name="roll_no"
                  value={formData.roll_no}
                  onChange={handleInputChange}
                  placeholder="Roll number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Class</label>
                <Input
                  name="class"
                  value={formData.class}
                  onChange={handleInputChange}
                  placeholder="Class/Section"
                  required
                />
              </div>
            </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email address"
                  required
                />
              </div>
            <DialogFooter>
              <Button type="submit" className="campus-button-primary">
                Update Student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}