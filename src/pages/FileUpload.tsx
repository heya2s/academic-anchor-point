import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/utils/validation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  BookOpen, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UploadFile {
  file: File;
  subject: string;
  semester: string;
  year?: number;
  type: 'syllabus' | 'pyq';
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default function FileUpload() {
  const { userRole, user } = useAuth();
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [syllabusForm, setSyllabusForm] = useState({
    subject: '',
    semester: ''
  });
  const [pyqForm, setPyqForm] = useState({
    subject: '',
    semester: '',
    year: ''
  });

  const handleFileSelect = (
    files: FileList | null, 
    type: 'syllabus' | 'pyq',
    formData: any
  ) => {
    if (!files || files.length === 0) return;
    if (!formData.subject || !formData.semester) {
      toast({
        title: "Missing Information",
        description: "Please fill in subject and semester before selecting files.",
        variant: "destructive",
      });
      return;
    }

    const newUploads: UploadFile[] = Array.from(files).map(file => ({
      file,
      subject: formData.subject,
      semester: formData.semester,
      year: type === 'pyq' && formData.year ? parseInt(formData.year) : undefined,
      type,
      status: 'pending',
      progress: 0
    }));

    setUploads(prev => [...prev, ...newUploads]);
  };

  const uploadFile = async (uploadItem: UploadFile, index: number) => {
    try {
      setUploads(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'uploading', progress: 0 } : item
      ));

      const fileExt = uploadItem.file.name.split('.').pop();
      const sanitizedFileName = sanitizeFileName(`${uploadItem.subject}_${uploadItem.semester}${uploadItem.year ? `_${uploadItem.year}` : ''}_${Date.now()}.${fileExt}`);
      const filePath = `${uploadItem.type}/${sanitizedFileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(uploadItem.type === 'syllabus' ? 'syllabus' : 'pyqs')
        .upload(filePath, uploadItem.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploads(prev => prev.map((item, i) => 
        i === index ? { ...item, progress: 50 } : item
      ));

      // Insert record into database
      const dbData = {
        subject: uploadItem.subject,
        semester: uploadItem.semester,
        file_url: uploadData.path,
        file_name: uploadItem.file.name,
        uploaded_by: user?.id,
        ...(uploadItem.type === 'pyq' && uploadItem.year && { year: uploadItem.year })
      };

      const { error: dbError } = await supabase
        .from(uploadItem.type === 'syllabus' ? 'syllabus' : 'pyqs')
        .insert([dbData]);

      if (dbError) throw dbError;

      setUploads(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'success', progress: 100 } : item
      ));

      toast({
        title: "Upload Successful",
        description: `${uploadItem.file.name} has been uploaded successfully.`,
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map((item, i) => 
        i === index ? { 
          ...item, 
          status: 'error', 
          progress: 0,
          error: error.message 
        } : item
      ));

      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadAll = async () => {
    const pendingUploads = uploads
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status === 'pending');

    for (const { item, index } of pendingUploads) {
      await uploadFile(item, index);
    }
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setUploads(prev => prev.filter(item => 
      item.status !== 'success' && item.status !== 'error'
    ));
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="campus-card">
          <CardContent className="p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only administrators can upload files.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">File Upload</h1>
        <p className="text-muted-foreground">Upload syllabus documents and previous year question papers</p>
      </div>

      <Tabs defaultValue="syllabus" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="syllabus" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Syllabus</span>
          </TabsTrigger>
          <TabsTrigger value="pyqs" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>PYQs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="syllabus">
          <Card className="campus-card">
            <CardHeader>
              <CardTitle>Upload Syllabus Files</CardTitle>
              <CardDescription>Upload course syllabus documents for students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="syllabus-subject">Subject</Label>
                  <Input
                    id="syllabus-subject"
                    value={syllabusForm.subject}
                    onChange={(e) => setSyllabusForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter subject name"
                  />
                </div>
                <div>
                  <Label htmlFor="syllabus-semester">Semester</Label>
                  <Input
                    id="syllabus-semester"
                    value={syllabusForm.semester}
                    onChange={(e) => setSyllabusForm(prev => ({ ...prev, semester: e.target.value }))}
                    placeholder="Enter semester"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="syllabus-files">Select Files</Label>
                <Input
                  id="syllabus-files"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files, 'syllabus', syllabusForm)}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Accepted formats: PDF, DOC, DOCX
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pyqs">
          <Card className="campus-card">
            <CardHeader>
              <CardTitle>Upload PYQ Files</CardTitle>
              <CardDescription>Upload previous year question papers for students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="pyq-subject">Subject</Label>
                  <Input
                    id="pyq-subject"
                    value={pyqForm.subject}
                    onChange={(e) => setPyqForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter subject name"
                  />
                </div>
                <div>
                  <Label htmlFor="pyq-semester">Semester</Label>
                  <Input
                    id="pyq-semester"
                    value={pyqForm.semester}
                    onChange={(e) => setPyqForm(prev => ({ ...prev, semester: e.target.value }))}
                    placeholder="Enter semester"
                  />
                </div>
                <div>
                  <Label htmlFor="pyq-year">Year</Label>
                  <Input
                    id="pyq-year"
                    type="number"
                    value={pyqForm.year}
                    onChange={(e) => setPyqForm(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="Enter year"
                    min="2000"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pyq-files">Select Files</Label>
                <Input
                  id="pyq-files"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files, 'pyq', pyqForm)}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Accepted formats: PDF, DOC, DOCX
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <Card className="campus-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-primary" />
                <span>Upload Queue ({uploads.length})</span>
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  onClick={uploadAll}
                  disabled={uploads.every(item => item.status !== 'pending')}
                  className="campus-button-primary"
                >
                  Upload All
                </Button>
                <Button
                  variant="outline"
                  onClick={clearCompleted}
                  disabled={!uploads.some(item => item.status === 'success' || item.status === 'error')}
                >
                  Clear Completed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploads.map((upload, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        {upload.type === 'syllabus' ? (
                          <BookOpen className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{upload.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {upload.subject} • {upload.semester}
                          {upload.year && ` • ${upload.year}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={`${
                          upload.status === 'pending' ? 'bg-muted' :
                          upload.status === 'uploading' ? 'bg-[hsl(var(--campus-blue))]/10 text-[hsl(var(--campus-blue))]' :
                          upload.status === 'success' ? 'bg-[hsl(var(--campus-success))]/10 text-[hsl(var(--campus-success))]' :
                          'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {upload.status === 'pending' && 'Pending'}
                        {upload.status === 'uploading' && (
                          <div className="flex items-center space-x-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Uploading</span>
                          </div>
                        )}
                        {upload.status === 'success' && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Success</span>
                          </div>
                        )}
                        {upload.status === 'error' && (
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Failed</span>
                          </div>
                        )}
                      </Badge>
                      {(upload.status === 'pending' || upload.status === 'error') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeUpload(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="mt-2" />
                  )}
                  
                  {upload.status === 'error' && upload.error && (
                    <p className="text-sm text-destructive mt-2">{upload.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}