import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Loader2, Shield, ArrowLeft, AlertCircle } from "lucide-react";

export default function AdminSignup() {
  const { user, signUpAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    adminCode: "", // Optional admin verification code
  });

  // Redirect if already authenticated
  if (user && !authLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      setError("All fields are required");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { error } = await signUpAdmin(
        formData.email, 
        formData.password, 
        formData.fullName,
        formData.adminCode
      );
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (error: any) {
      setError("An unexpected error occurred. Please try again.");
    }
    
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <Card className="w-full max-w-md campus-card">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="p-2 bg-[hsl(var(--campus-success))]/10 rounded-full">
                <Shield className="h-8 w-8 text-[hsl(var(--campus-success))]" />
              </div>
            </div>
            <CardTitle className="text-xl text-[hsl(var(--campus-success))]">Registration Successful!</CardTitle>
            <CardDescription>
              Your admin account has been created successfully. Please check your email to verify your account.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll receive an email confirmation shortly. Once verified, you can sign in with your admin credentials.
              </AlertDescription>
            </Alert>
            
            <div className="flex space-x-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/auth">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md campus-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">CampusTrack</h1>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <CardTitle className="text-xl">Admin Registration</CardTitle>
            <Badge className="bg-primary/10 text-primary">Admin Portal</Badge>
          </div>
          <CardDescription>
            Create your administrator account to manage the campus portal
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Admin Full Name"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@university.edu"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminCode">Admin Code (Optional)</Label>
              <Input
                id="adminCode"
                name="adminCode"
                type="text"
                placeholder="Special admin verification code"
                value={formData.adminCode}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">
                If your organization provided an admin code, enter it here
              </p>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This will create an administrator account with full system access. Please ensure you have proper authorization.
              </AlertDescription>
            </Alert>
            
            <Button 
              type="submit" 
              className="w-full campus-button-primary" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Admin Account...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Create Admin Account
                </>
              )}
            </Button>
            
            <div className="flex justify-center space-x-4 text-sm">
              <Link 
                to="/auth" 
                className="text-primary hover:underline flex items-center"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}