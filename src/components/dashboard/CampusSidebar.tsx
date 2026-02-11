import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  User, 
  Calendar, 
  BookOpen, 
  FileText, 
  Bell, 
  Users, 
  Settings,
  Upload,
  BarChart3,
  LogOut,
  GraduationCap,
  Radio,
  MapPinCheck,
  Scan
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const studentMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Attendance", url: "/attendance", icon: Calendar },
  { title: "Mark Attendance", url: "/mark-attendance", icon: Scan },
  { title: "Syllabus", url: "/syllabus", icon: BookOpen },
  { title: "PYQs", url: "/pyqs", icon: FileText },
  { title: "Notices", url: "/notices", icon: Bell },
];

const adminMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Students", url: "/students", icon: Users },
  { title: "Attendance", url: "/attendance", icon: Calendar },
  { title: "Smart Attendance", url: "/attendance-control", icon: Radio },
  { title: "Campus Settings", url: "/campus-settings", icon: MapPinCheck },
  { title: "Upload Files", url: "/upload", icon: Upload },
  { title: "Notices", url: "/notices", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function CampusSidebar() {
  const { state } = useSidebar();
  const { userRole, profile, signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = userRole === 'admin' ? adminMenuItems : studentMenuItems;
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => currentPath === path;
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-accent hover:text-accent-foreground";

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold">CampusTrack</h2>
              <p className="text-sm text-muted-foreground capitalize">{userRole} Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => getNavClasses({ isActive })}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!isCollapsed && profile && (
          <div className="p-3 bg-accent/50 rounded-lg">
            <p className="font-medium text-sm">{profile.full_name}</p>
            {profile.student_id && (
              <p className="text-xs text-muted-foreground">ID: {profile.student_id}</p>
            )}
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {!isCollapsed && (
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex-1"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          )}
          {isCollapsed && (
            <Button
              variant="outline"
              size="icon"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}