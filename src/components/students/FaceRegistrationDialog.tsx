import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CameraCapture from '@/components/attendance/CameraCapture';
import { Camera, Upload, Check, X, Loader2, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Student {
  id: string;
  name: string;
  student_id: string;
  roll_no: string;
  class: string;
}

interface FaceRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess: () => void;
}

export default function FaceRegistrationDialog({
  open,
  onOpenChange,
  student,
  onSuccess
}: FaceRegistrationDialogProps) {
  const [mode, setMode] = useState<'choose' | 'camera' | 'upload'>('choose');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [existingFace, setExistingFace] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (open && student) {
      checkExistingFace();
    } else {
      setPreviewImage(null);
      setExistingFace(null);
      setMode('choose');
    }
  }, [open, student]);

  const checkExistingFace = async () => {
    if (!student) return;
    
    setLoadingExisting(true);
    try {
      const { data, error } = await supabase
        .from('student_faces')
        .select('face_data')
        .eq('student_id', student.id)
        .maybeSingle();

      if (!error && data) {
        setExistingFace(data.face_data);
      }
    } catch (error) {
      console.error('Error checking existing face:', error);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleCameraCapture = (imageData: string) => {
    setPreviewImage(imageData);
    setMode('choose');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewImage(result);
      setMode('choose');
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    if (!student || !previewImage) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-face', {
        body: {
          student_id: student.id,
          face_data: previewImage
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(data.message || 'Face registered successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error registering face:', error);
      toast.error(error.message || 'Failed to register face');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPreviewImage(null);
    setExistingFace(null);
    setMode('choose');
    onOpenChange(false);
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Face Registration - {student.name}
          </DialogTitle>
        </DialogHeader>

        {mode === 'camera' ? (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setMode('choose')}
            title="Capture Face Photo"
          />
        ) : (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Student ID:</span>
                <span>{student.student_id || 'N/A'}</span>
                <span className="text-muted-foreground">Roll No:</span>
                <span>{student.roll_no || 'N/A'}</span>
                <span className="text-muted-foreground">Class:</span>
                <span>{student.class || 'N/A'}</span>
              </div>
            </div>

            {/* Existing Face */}
            {loadingExisting ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : existingFace && !previewImage ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[hsl(var(--campus-success))]" />
                  Current Registered Face
                </Label>
                <div className="relative rounded-lg overflow-hidden border">
                  <img 
                    src={existingFace} 
                    alt="Registered face" 
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-[hsl(var(--campus-success))] text-white px-2 py-1 rounded text-xs">
                    Registered
                  </div>
                </div>
              </div>
            ) : null}

            {/* Preview Image */}
            {previewImage && (
              <div className="space-y-2">
                <Label>New Face Photo</Label>
                <div className="relative rounded-lg overflow-hidden border">
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setPreviewImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!previewImage ? (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => setMode('camera')}
                  className="h-24 flex-col gap-2"
                >
                  <Camera className="h-8 w-8" />
                  <span>Capture from Camera</span>
                </Button>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <Button
                    variant="outline"
                    className="w-full h-24 flex-col gap-2"
                    asChild
                  >
                    <div>
                      <Upload className="h-8 w-8" />
                      <span>Upload Photo</span>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewImage(null)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Choose Different
                </Button>
                <Button
                  onClick={handleRegister}
                  className="flex-1 bg-[hsl(var(--campus-success))] hover:bg-[hsl(var(--campus-success))]/90"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {existingFace ? 'Update Face' : 'Register Face'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
