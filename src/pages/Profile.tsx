import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Mail, IdCard, Users, Save, Edit } from "lucide-react";
import { 
  validateLength, 
  validateStudentId, 
  validateRollNumber,
  sanitizeFormData, 
  VALIDATION_LIMITS 
} from "@/utils/validation";

export default function Profile() {
  const { profile, user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    student_id: profile?.student_id || '',
    roll_number: profile?.roll_number || '',
    class: profile?.class || '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateProfileForm = (data: typeof formData): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    const nameError = validateLength(data.full_name, VALIDATION_LIMITS.FULL_NAME);
    if (nameError) errors.full_name = nameError;
    
    if (data.student_id) {
      const studentIdError = validateStudentId(data.student_id);
      if (studentIdError) errors.student_id = studentIdError;
    }
    
    if (data.roll_number) {
      const rollNumberError = validateRollNumber(data.roll_number);
      if (rollNumberError) errors.roll_number = rollNumberError;
    }
    
    if (data.class) {
      const classError = validateLength(data.class, VALIDATION_LIMITS.CLASS_NAME);
      if (classError) errors.class = classError;
    }
    
    return errors;
  };

  const handleSave = async () => {
    // Validate and sanitize form data
    const sanitizedData = sanitizeFormData(formData) as typeof formData;
    const errors = validateProfileForm(sanitizedData);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    await updateProfile(sanitizedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      student_id: profile?.student_id || '',
      roll_number: profile?.roll_number || '',
      class: profile?.class || '',
    });
    setValidationErrors({});
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="campus-button-primary">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="campus-button-primary">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <Card className="lg:col-span-2 campus-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription>
              Update your personal details and student information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  maxLength={VALIDATION_LIMITS.FULL_NAME.max}
                />
                {validationErrors.full_name && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.full_name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="student_id">Student ID</Label>
                <Input
                  id="student_id"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your student ID"
                  maxLength={VALIDATION_LIMITS.STUDENT_ID.max}
                />
                {validationErrors.student_id && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.student_id}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roll_number">Roll Number</Label>
                <Input
                  id="roll_number"
                  name="roll_number"
                  value={formData.roll_number}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your roll number"
                  maxLength={VALIDATION_LIMITS.ROLL_NUMBER.max}
                />
                {validationErrors.roll_number && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.roll_number}</p>
                )}
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="class">Class/Department</Label>
                <Input
                  id="class"
                  name="class"
                  value={formData.class}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your class or department"
                  maxLength={VALIDATION_LIMITS.CLASS_NAME.max}
                />
                {validationErrors.class && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.class}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Summary */}
        <Card className="campus-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IdCard className="h-5 w-5 text-primary" />
              <span>Quick Info</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{profile?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <IdCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  ID: {profile?.student_id || 'Not set'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Roll: {profile?.roll_number || 'Not set'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Class: {profile?.class || 'Not set'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}