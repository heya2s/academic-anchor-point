import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, RotateCcw, Check, X, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose?: () => void;
  isProcessing?: boolean;
  title?: string;
}

export default function CameraCapture({ 
  onCapture, 
  onClose, 
  isProcessing = false,
  title = "Camera Capture"
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(err.message || 'Failed to access camera. Please ensure camera permissions are granted.');
      setIsLoading(false);
    }
  }, [facingMode, stream]);

  useEffect(() => {
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      stream.getTracks().forEach(track => track.stop());
    }
    startCamera();
  }, [facingMode]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally for selfie camera
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
  }, [facingMode]);

  const retake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  if (error) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="p-6 text-center">
          <div className="text-destructive mb-4">
            <X className="h-12 w-12 mx-auto mb-2" />
            <p className="font-medium">Camera Error</p>
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={startCamera} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              
              {/* Face guide overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-60 border-2 border-dashed border-primary/50 rounded-full" />
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-sm text-white bg-black/50 inline-block px-3 py-1 rounded-full">
                    Position face within the oval
                  </p>
                </div>
              </div>
            </>
          ) : (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full aspect-[4/3] object-cover"
            />
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-center">
        {!capturedImage ? (
          <>
            <Button 
              onClick={switchCamera} 
              variant="outline"
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Switch
            </Button>
            <Button 
              onClick={capturePhoto} 
              className="bg-primary"
              disabled={isLoading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={retake} 
              variant="outline"
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button 
              onClick={confirmCapture} 
              className="bg-[hsl(var(--campus-success))]"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
