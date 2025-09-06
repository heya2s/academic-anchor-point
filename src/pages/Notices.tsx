import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Bell, Plus, Search, Calendar, MessageSquare, Edit, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { 
  sanitizeHTML, 
  validateLength, 
  sanitizeFormData, 
  VALIDATION_LIMITS 
} from "@/utils/validation";

interface Notice {
  id: string;
  title: string;
  message: string;
  created_at: string;
  posted_by: string;
}

export default function Notices() {
  const { userRole, user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchNotices();
  }, []);

  useEffect(() => {
    filterNotices();
  }, [notices, searchTerm]);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*') // Always select all fields, we'll handle hiding admin info in the UI
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotices = () => {
    if (!searchTerm) {
      setFilteredNotices(notices);
      return;
    }

    const filtered = notices.filter(notice =>
      notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNotices(filtered);
  };

  const validateNoticeForm = (data: { title: string; message: string }): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    const titleError = validateLength(data.title, VALIDATION_LIMITS.NOTICE_TITLE);
    if (titleError) errors.title = titleError;
    
    const messageError = validateLength(data.message, VALIDATION_LIMITS.NOTICE_MESSAGE);
    if (messageError) errors.message = messageError;
    
    return errors;
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || userRole !== 'admin') return;

    // Validate and sanitize form data
    const sanitizedData = sanitizeFormData(formData) as { title: string; message: string };
    const errors = validateNoticeForm(sanitizedData);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});

    try {
      const { error } = await supabase
        .from('notices')
        .insert([
          {
            title: sanitizedData.title,
            message: sanitizedData.message,
            posted_by: user.id
          }
        ]);

      if (error) throw error;

      toast({
        title: "Notice Created",
        description: "The notice has been posted successfully.",
      });

      setFormData({ title: '', message: '' });
      setShowCreateForm(false);
      fetchNotices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotice) return;

    // Validate and sanitize form data
    const sanitizedData = sanitizeFormData(formData) as { title: string; message: string };
    const errors = validateNoticeForm(sanitizedData);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});

    try {
      const { error } = await supabase
        .from('notices')
        .update({
          title: sanitizedData.title,
          message: sanitizedData.message
        })
        .eq('id', selectedNotice.id);

      if (error) throw error;

      toast({
        title: "Notice Updated",
        description: "The notice has been updated successfully.",
      });

      setFormData({ title: '', message: '' });
      setShowEditDialog(false);
      setSelectedNotice(null);
      fetchNotices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteNotice = async (notice: Notice) => {
    if (!confirm(`Are you sure you want to delete "${notice.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', notice.id);

      if (error) throw error;

      toast({
        title: "Notice Deleted",
        description: "The notice has been deleted successfully.",
      });

      fetchNotices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (notice: Notice) => {
    setSelectedNotice(notice);
    setFormData({
      title: notice.title,
      message: notice.message
    });
    setShowEditDialog(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notices & Announcements</h1>
          <p className="text-muted-foreground">Stay updated with important announcements</p>
        </div>
        {userRole === 'admin' && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="campus-button-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Notice
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="campus-card">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Notice Form (Admin Only) */}
      {userRole === 'admin' && showCreateForm && (
        <Card className="campus-card">
          <CardHeader>
            <CardTitle>Create New Notice</CardTitle>
            <CardDescription>Post an announcement for all students</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Notice Title
                </label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter notice title..."
                  maxLength={VALIDATION_LIMITS.NOTICE_TITLE.max}
                  required
                />
                {validationErrors.title && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.title}</p>
                )}
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Notice Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Enter notice message..."
                  maxLength={VALIDATION_LIMITS.NOTICE_MESSAGE.max}
                  rows={4}
                  required
                />
                {validationErrors.message && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.message}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="campus-button-primary">
                  Post Notice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notices List */}
      <div className="space-y-4">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => (
            <Card key={notice.id} className="campus-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2 mb-2">
                      <Bell className="h-5 w-5 text-primary" />
                      <span>{notice.title}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(parseISO(notice.created_at), 'MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{format(parseISO(notice.created_at), 'h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-primary/10 text-primary">
                      Announcement
                    </Badge>
                    {userRole === 'admin' && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(notice)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteNotice(notice)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{sanitizeHTML(notice.message)}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="campus-card">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Notices Found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'No notices have been posted yet.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Notice Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Notice</DialogTitle>
            <DialogDescription>
              Update the notice information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditNotice} className="space-y-4">
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium mb-2">
                Notice Title
              </label>
              <Input
                id="edit-title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter notice title..."
                maxLength={VALIDATION_LIMITS.NOTICE_TITLE.max}
                required
              />
              {validationErrors.title && (
                <p className="text-sm text-destructive mt-1">{validationErrors.title}</p>
              )}
            </div>
            <div>
              <label htmlFor="edit-message" className="block text-sm font-medium mb-2">
                Notice Message
              </label>
              <Textarea
                id="edit-message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Enter notice message..."
                maxLength={VALIDATION_LIMITS.NOTICE_MESSAGE.max}
                rows={4}
                required
              />
              {validationErrors.message && (
                <p className="text-sm text-destructive mt-1">{validationErrors.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="campus-button-primary">
                Update Notice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}