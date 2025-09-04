import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, Download, Search, Filter, Calendar, Upload, Edit, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface SyllabusFile {
  id: string;
  subject: string;
  semester: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
}

export default function Syllabus() {
  const { userRole } = useAuth();
  const [syllabusFiles, setSyllabusFiles] = useState<SyllabusFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<SyllabusFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SyllabusFile | null>(null);
  const [editFormData, setEditFormData] = useState({
    subject: '',
    semester: ''
  });

  useEffect(() => {
    fetchSyllabusFiles();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [syllabusFiles, searchTerm, selectedSemester]);

  const fetchSyllabusFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('syllabus')
        .select('*')
        .order('semester', { ascending: true })
        .order('subject', { ascending: true });

      if (error) throw error;
      setSyllabusFiles(data || []);
    } catch (error) {
      console.error('Error fetching syllabus files:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = () => {
    let filtered = syllabusFiles;

    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.semester.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSemester !== 'all') {
      filtered = filtered.filter(file => file.semester === selectedSemester);
    }

    setFilteredFiles(filtered);
  };

  const handleDownload = async (file: SyllabusFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('syllabus')
        .download(file.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name || `${file.subject}_${file.semester}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getUniqueSemesters = () => {
    const predefinedSemesters = ['Semester 1st', 'Semester 2nd', 'Semester 3rd', 'Semester 4th', 'Semester 5th', 'Semester 6th'];
    const dbSemesters = [...new Set(syllabusFiles.map(file => file.semester))];
    const allSemesters = [...new Set([...predefinedSemesters, ...dbSemesters])];
    return allSemesters.sort();
  };

  const groupFilesBySemester = () => {
    const grouped: { [key: string]: SyllabusFile[] } = {};
    filteredFiles.forEach(file => {
      if (!grouped[file.semester]) {
        grouped[file.semester] = [];
      }
      grouped[file.semester].push(file);
    });
    return grouped;
  };

  const handleEditFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      const { error } = await supabase
        .from('syllabus')
        .update({
          subject: editFormData.subject,
          semester: editFormData.semester
        })
        .eq('id', selectedFile.id);

      if (error) throw error;

      toast({
        title: "File Updated",
        description: "The syllabus file has been updated successfully.",
      });

      setShowEditDialog(false);
      setSelectedFile(null);
      fetchSyllabusFiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (file: SyllabusFile) => {
    if (!confirm(`Are you sure you want to delete "${file.subject}"?`)) return;

    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('syllabus')
        .remove([file.file_url]);

      if (storageError) throw storageError;

      // Delete record from database
      const { error } = await supabase
        .from('syllabus')
        .delete()
        .eq('id', file.id);

      if (error) throw error;

      toast({
        title: "File Deleted",
        description: "The syllabus file has been deleted successfully.",
      });

      fetchSyllabusFiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (file: SyllabusFile) => {
    setSelectedFile(file);
    setEditFormData({
      subject: file.subject,
      semester: file.semester
    });
    setShowEditDialog(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const groupedFiles = groupFilesBySemester();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Syllabus</h1>
          <p className="text-muted-foreground">Access course materials and syllabus documents</p>
        </div>
        {userRole === 'admin' && (
          <Link to="/upload">
            <Button className="campus-button-primary">
              <Upload className="h-4 w-4 mr-2" />
              Upload Syllabus
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filter */}
      <Card className="campus-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject or semester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="all">All Semesters</option>
                {getUniqueSemesters().map(semester => (
                  <option key={semester} value={semester}>{semester}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Syllabus Files */}
      {Object.keys(groupedFiles).length > 0 ? (
        Object.entries(groupedFiles).map(([semester, files]) => (
          <Card key={semester} className="campus-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>{semester}</span>
                <Badge variant="secondary">{files.length} files</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <Card key={file.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{file.subject}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {file.file_name || `${file.subject}.pdf`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {file.semester}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(parseISO(file.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleDownload(file)}
                            className="campus-button-primary"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                          {userRole === 'admin' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(file)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteFile(file)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="campus-card">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Syllabus Files Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedSemester !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No syllabus files have been uploaded yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit File Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Syllabus File</DialogTitle>
            <DialogDescription>
              Update the file information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditFile} className="space-y-4">
            <div>
              <label htmlFor="edit-subject" className="block text-sm font-medium mb-2">
                Subject
              </label>
              <Input
                id="edit-subject"
                name="subject"
                value={editFormData.subject}
                onChange={handleEditInputChange}
                placeholder="Enter subject name..."
                required
              />
            </div>
            <div>
              <label htmlFor="edit-semester" className="block text-sm font-medium mb-2">
                Semester
              </label>
              <select
                id="edit-semester"
                name="semester"
                value={editFormData.semester}
                onChange={handleEditInputChange}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                required
              >
                <option value="">Select semester...</option>
                {getUniqueSemesters().map(semester => (
                  <option key={semester} value={semester}>{semester}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" className="campus-button-primary">
                Update File
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}