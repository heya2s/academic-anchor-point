import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import Index from "./pages/Index";
import AuthPage from "./components/auth/AuthPage";
import AdminSignup from "./pages/AdminSignup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Attendance from "./pages/Attendance";
import Syllabus from "./pages/Syllabus";
import PYQs from "./pages/PYQs";
import Notices from "./pages/Notices";
import Students from "./pages/Students";
import FileUpload from "./pages/FileUpload";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="campus-track-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/admin-signup" element={<AdminSignup />} />
              <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
              <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
              <Route path="/attendance" element={<DashboardLayout><Attendance /></DashboardLayout>} />
              <Route path="/syllabus" element={<DashboardLayout><Syllabus /></DashboardLayout>} />
              <Route path="/pyqs" element={<DashboardLayout><PYQs /></DashboardLayout>} />
              <Route path="/notices" element={<DashboardLayout><Notices /></DashboardLayout>} />
              <Route path="/students" element={<DashboardLayout><Students /></DashboardLayout>} />
              <Route path="/upload" element={<DashboardLayout><FileUpload /></DashboardLayout>} />
              <Route path="/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
              <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
