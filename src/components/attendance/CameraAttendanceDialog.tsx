import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CameraCapture from './CameraCapture';
import { CheckCircle, XCircle, Camera, AlertCircle } from 'lucide-react';

interface CameraAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classes: string[];
}

type ResultState = {
  type: 'success' | 'error' | 'already_marked' | null;
  message: string;
  student?: {
    name: string;
    student_id: string;
    roll_no: string;
    class: string;
  };
};

export default function CameraAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
  classes
}: CameraAttendanceDialogProps) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResultState>({ type: null, message: '' });
  const [showCamera, setShowCamera] = useState(false);

  const handleCapture = async (imageData: string) => {
    setIsProcessing(true);
    setResult({ type: null, message: '' });

    try {
      const { data, error } = await supabase.functions.invoke('verify-face', {
        body: {
          captured_face: imageData,
          class_filter: selectedClass === 'all' ? undefined : selectedClass
        }
      });

      if (error) throw error;

      if (data.recognized) {
        if (data.already_marked) {
          setResult({
            type: 'already_marked',
            message: data.message,
            student: data.student
          });
          toast.info(data.message);
        } else if (data.attendance_marked) {
          setResult({
            type: 'success',
            message: data.message,
            student: data.student
          });
          toast.success(data.message);
          onSuccess();
        }
      } else {
        setResult({
          type: 'error',
          message: data.message || 'Face not recognized'
        });
        toast.error(data.message || 'Face not recognized');
      }
    } catch (error: any) {
      console.error('Face verification error:', error);
      setResult({
        type: 'error',
        message: error.message || 'Failed to verify face'
      });
      toast.error('Failed to verify face');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = () => {
    setResult({ type: null, message: '' });
    setShowCamera(false);
    setSelectedClass('');
    onOpenChange(false);
  };

  const tryAgain = () => {
    setResult({ type: null, message: '' });
    setShowCamera(true);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[hsl(var(--campus-success))]" />
            Mark Attendance via Camera
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[200px]">
          {!showCamera && !result.type && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Filter by Class (Optional)</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a class to only match faces from that class
                </p>
              </div>

              <Button 
                onClick={() => setShowCamera(true)} 
                className="w-full bg-[hsl(var(--campus-success))] hover:bg-[hsl(var(--campus-success))]/90"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            </div>
          )}

          {showCamera && !result.type && (
            <CameraCapture
              onCapture={handleCapture}
              onClose={() => setShowCamera(false)}
              isProcessing={isProcessing}
              title="Capture Student Face"
            />
          )}

          {result.type && (
            <div className="space-y-6">
              <div className={`text-center p-6 rounded-lg ${
                result.type === 'success' ? 'bg-[hsl(var(--campus-success))]/10' :
                result.type === 'already_marked' ? 'bg-[hsl(var(--campus-info))]/10' :
                'bg-destructive/10'
              }`}>
                {result.type === 'success' && (
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--campus-success))]" />
                )}
                {result.type === 'already_marked' && (
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--campus-info))]" />
                )}
                {result.type === 'error' && (
                  <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
                )}
                
                <h3 className={`text-xl font-bold mb-2 ${
                  result.type === 'success' ? 'text-[hsl(var(--campus-success))]' :
                  result.type === 'already_marked' ? 'text-[hsl(var(--campus-info))]' :
                  'text-destructive'
                }`}>
                  {result.type === 'success' ? 'Attendance Marked!' :
                   result.type === 'already_marked' ? 'Already Marked' :
                   'Not Recognized'}
                </h3>
                
                <p className="text-muted-foreground mb-4">{result.message}</p>
                
                {result.student && (
                  <div className="bg-card border rounded-lg p-4 text-left">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{result.student.name}</span>
                      <span className="text-muted-foreground">Student ID:</span>
                      <span>{result.student.student_id || 'N/A'}</span>
                      <span className="text-muted-foreground">Roll No:</span>
                      <span>{result.student.roll_no || 'N/A'}</span>
                      <span className="text-muted-foreground">Class:</span>
                      <span>{result.student.class || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={tryAgain} 
                  variant="outline" 
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Scan Another
                </Button>
                <Button 
                  onClick={resetAndClose}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
