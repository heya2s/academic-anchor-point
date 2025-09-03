import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Download, Search, Filter, Calendar, Trophy, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface PYQFile {
  id: string;
  subject: string;
  semester: string;
  year: number | null;
  file_url: string;
  file_name: string | null;
  created_at: string;
}

export default function PYQs() {
  const { userRole } = useAuth();
  const [pyqFiles, setPyqFiles] = useState<PYQFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<PYQFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    fetchPYQFiles();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [pyqFiles, searchTerm, selectedSemester, selectedYear]);

  const fetchPYQFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('pyqs')
        .select('*')
        .order('year', { ascending: false })
        .order('semester', { ascending: true })
        .order('subject', { ascending: true });

      if (error) throw error;
      setPyqFiles(data || []);
    } catch (error) {
      console.error('Error fetching PYQ files:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = () => {
    let filtered = pyqFiles;

    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.semester.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSemester !== 'all') {
      filtered = filtered.filter(file => file.semester === selectedSemester);
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(file => file.year?.toString() === selectedYear);
    }

    setFilteredFiles(filtered);
  };

  const handleDownload = async (file: PYQFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('pyqs')
        .download(file.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name || `${file.subject}_${file.semester}_${file.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getUniqueSemesters = () => {
    const semesters = [...new Set(pyqFiles.map(file => file.semester))];
    return semesters.sort();
  };

  const getUniqueYears = () => {
    const years = [...new Set(pyqFiles.map(file => file.year).filter(Boolean))];
    return years.sort((a, b) => (b as number) - (a as number));
  };

  const groupFilesByYear = () => {
    const grouped: { [key: string]: PYQFile[] } = {};
    filteredFiles.forEach(file => {
      const year = file.year?.toString() || 'Unknown';
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(file);
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

  const groupedFiles = groupFilesByYear();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Previous Year Questions</h1>
          <p className="text-muted-foreground">Practice with past examination papers</p>
        </div>
        {userRole === 'admin' && (
          <Link to="/upload">
            <Button className="campus-button-primary">
              <Upload className="h-4 w-4 mr-2" />
              Upload PYQs
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
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="all">All Years</option>
                {getUniqueYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PYQ Files */}
      {Object.keys(groupedFiles).length > 0 ? (
        Object.entries(groupedFiles)
          .sort(([a], [b]) => {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return parseInt(b) - parseInt(a);
          })
          .map(([year, files]) => (
            <Card key={year} className="campus-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span>{year === 'Unknown' ? 'Year Not Specified' : `Year ${year}`}</span>
                  <Badge variant="secondary">{files.length} papers</Badge>
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
                              {file.file_name || `${file.subject}_${file.year}.pdf`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {file.semester}
                            </Badge>
                            {file.year && (
                              <Badge className="text-xs bg-[hsl(var(--campus-indigo))]/10 text-[hsl(var(--campus-indigo))]">
                                {file.year}
                              </Badge>
                            )}
                          </div>
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
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No PYQ Files Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedSemester !== 'all' || selectedYear !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No previous year question papers have been uploaded yet.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}