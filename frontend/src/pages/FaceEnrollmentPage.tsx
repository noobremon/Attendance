import React, { useState } from 'react';
import { Camera as CameraIcon, CheckCircle, AlertCircle, Loader2, UserCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Camera } from '@/components/Camera';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { faceApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type EnrollmentStep = 'instructions' | 'capture' | 'processing' | 'success' | 'error';

export const FaceEnrollmentPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<EnrollmentStep>(user?.faceEmbedding ? 'success' : 'instructions');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setStep('processing');
    
    try {
      const result = await faceApi.enrollFace(user?.id || 0, imageData);
      if (result.success) {
        // Update user to reflect that they now have an enrolled face
        updateUser({ faceEmbedding: [] }); // Update with empty array as placeholder
        setStep('success');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Enrollment failed');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setErrorMessage('');
    setStep('capture');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Face Enrollment</h1>
          <p className="text-muted-foreground">
            {user?.faceEmbedding 
              ? 'Your face is enrolled. You can re-enroll if needed.'
              : 'Enroll your face for secure attendance marking'}
          </p>
        </div>

        <div className="card-elevated p-6 md:p-8 animate-slide-up">
          {step === 'instructions' && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="w-12 h-12 text-primary" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">Before You Begin</h2>
                <ul className="text-left text-muted-foreground space-y-3 max-w-sm mx-auto">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">1</span>
                    <span>Find a well-lit area with even lighting</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">2</span>
                    <span>Remove glasses, hats, or face coverings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">3</span>
                    <span>Position your face within the guide frame</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">4</span>
                    <span>Keep a neutral expression and look straight</span>
                  </li>
                </ul>
              </div>
              
              <Button 
                onClick={() => setStep('capture')} 
                className="btn-gradient px-8"
                size="lg"
              >
                <CameraIcon className="w-5 h-5 mr-2" />
                Start Camera
              </Button>
            </div>
          )}

          {step === 'capture' && (
            <div className="space-y-4">
              <Camera 
                onCapture={handleCapture}
                showFaceGuide={true}
              />
              <p className="text-center text-sm text-muted-foreground">
                Position your face within the oval guide and click capture
              </p>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12 space-y-6">
              {capturedImage && (
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden ring-4 ring-primary/20">
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-3">
                <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                <p className="font-medium">Processing your face data...</p>
                <p className="text-sm text-muted-foreground">
                  Our AI is analyzing and encrypting your facial features
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-success mb-2">Enrollment Complete!</h2>
                <p className="text-muted-foreground">
                  Your face has been successfully enrolled. You can now mark attendance.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={handleRetry} 
                  variant="outline"
                >
                  Re-enroll Face
                </Button>
                <Button 
                  onClick={() => window.location.href = '/mark-attendance'}
                  className="btn-gradient"
                >
                  Mark Attendance
                </Button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center animate-scale-in">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-destructive mb-2">Enrollment Failed</h2>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>
              <Button onClick={handleRetry} variant="outline">
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className={cn(
          "mt-6 flex items-center justify-center gap-2 p-3 rounded-lg",
          user?.faceEmbedding 
            ? "bg-success/10 text-success" 
            : "bg-warning/10 text-warning"
        )}>
          {user?.faceEmbedding ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Face enrolled</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Face not enrolled</span>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};