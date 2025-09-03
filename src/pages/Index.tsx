import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GraduationCap, Users, BookOpen, Calendar, Bell, Loader2, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-5xl font-bold campus-gradient bg-clip-text text-transparent">
              CampusTrack
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Your comprehensive student portal for academic management, attendance tracking, and resource access
          </p>
          <div className="space-x-4">
            <Link to="/auth">
              <Button size="lg" className="campus-button-primary">
                Get Started
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg">
                Student Login
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <Link to="/admin-signup">
              <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                Admin Access →
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="campus-card text-center">
            <CardHeader>
              <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Attendance Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitor your attendance with detailed analytics and insights
              </p>
            </CardContent>
          </Card>

          <Card className="campus-card text-center">
            <CardHeader>
              <div className="p-3 bg-[hsl(var(--campus-blue))]/10 rounded-full w-fit mx-auto mb-2">
                <BookOpen className="h-6 w-6 text-[hsl(var(--campus-blue))]" />
              </div>
              <CardTitle className="text-lg">Study Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access syllabus and previous year question papers
              </p>
            </CardContent>
          </Card>

          <Card className="campus-card text-center">
            <CardHeader>
              <div className="p-3 bg-[hsl(var(--campus-indigo))]/10 rounded-full w-fit mx-auto mb-2">
                <Bell className="h-6 w-6 text-[hsl(var(--campus-indigo))]" />
              </div>
              <CardTitle className="text-lg">Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Stay updated with important notices and announcements
              </p>
            </CardContent>
          </Card>

          <Card className="campus-card text-center">
            <CardHeader>
              <div className="p-3 bg-[hsl(var(--campus-success))]/10 rounded-full w-fit mx-auto mb-2">
                <Users className="h-6 w-6 text-[hsl(var(--campus-success))]" />
              </div>
              <CardTitle className="text-lg">Student Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Comprehensive dashboard for all academic activities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="campus-card text-center">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Join CampusTrack today and streamline your academic journey
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="campus-button-primary">
                  Access Student Portal
                </Button>
              </Link>
              <Link to="/admin-signup">
                <Button variant="outline" size="lg" className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Registration
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
