import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraProps {
  onCapture: (imageData: string) => void;
  onError?: (error: string) => void;
  showFaceGuide?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Camera: React.FC<CameraProps> = ({
  onCapture,
  onError,
  showFaceGuide = true,
  disabled = false,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      let friendlyMessage = 'Camera access denied';
      
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        friendlyMessage = 'Please allow camera access to continue';
      } else if (message.includes('NotFoundError')) {
        friendlyMessage = 'No camera found on this device';
      } else if (message.includes('NotReadableError')) {
        friendlyMessage = 'Camera is in use by another application';
      }
      
      setError(friendlyMessage);
      onError?.(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    onCapture(imageData);
    stopCamera();
  }, [facingMode, onCapture, stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (isStreaming) {
      stopCamera();
      startCamera();
    }
  }, [facingMode]);

  if (capturedImage) {
    return (
      <div className={cn("relative", className)}>
        <div className="camera-frame bg-muted">
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="mt-4 flex justify-center">
          <Button onClick={retake} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake Photo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="camera-frame bg-muted">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button onClick={startCamera} variant="outline">
              Try Again
            </Button>
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            facingMode === 'user' && "scale-x-[-1]",
            (!isStreaming || error) && "invisible"
          )}
        />
        
        {isStreaming && !error && (
          <>
            <div className="camera-overlay" />
            {showFaceGuide && <div className="face-guide animate-pulse-glow" />}
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
      
      {isStreaming && !error && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={switchCamera}
            className="rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={captureImage}
            disabled={disabled}
            size="lg"
            className="btn-gradient rounded-full px-8 gap-2"
          >
            <CameraIcon className="h-5 w-5" />
            Capture
          </Button>
        </div>
      )}
    </div>
  );
};
