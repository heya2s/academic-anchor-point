import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Download, Search, Filter, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface SyllabusFile {
  id: string;
  subject: string;
  semester: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
}

export default function Syllabus() {
  const [syllabusFiles, setSyllabusFiles] = useState<SyllabusFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<SyllabusFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');

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
    const semesters = [...new Set(syllabusFiles.map(file => file.semester))];
    return semesters.sort();
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
      <div>
        <h1 className="text-3xl font-bold">Syllabus</h1>
        <p className="text-muted-foreground">Access course materials and syllabus documents</p>
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
                        <Button
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="campus-button-primary"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
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
    </div>
  );
}