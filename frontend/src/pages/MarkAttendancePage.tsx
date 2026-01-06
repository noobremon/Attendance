import React, { useState } from 'react';
import { 
  LogIn, 
  LogOut as LogOutIcon, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Clock,
  MapPin,
  Fingerprint
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Camera } from '@/components/Camera';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceApi, AttendanceRecord } from '@/lib/api';
import { cn } from '@/lib/utils';

type AttendanceMode = 'check-in' | 'check-out';
type AttendanceStep = 'select' | 'capture' | 'processing' | 'success' | 'warning' | 'error';

export const MarkAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<AttendanceMode>('check-in');
  const [step, setStep] = useState<AttendanceStep>('select');
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleCapture = async (imageData: string) => {
    setStep('processing');
    
    try {
      // Get current location (for now, using mock values)
      // In a real app, we'd get the user's actual location
      const lat = 37.7749; // Mock latitude
      const lng = -122.4194; // Mock longitude
      
      const result = await attendanceApi.markAttendance(lat, lng, imageData);
      setRecord(result.record);
      setConfidence(result.confidence || 0);
      
      // Check confidence score (higher is better)
      if (result.confidence && result.confidence >= 90) {
        setStep('success');
      } else {
        setStep('warning');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to mark attendance');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('select');
    setRecord(null);
    setConfidence(null);
    setErrorMessage('');
  };

  if (!user?.faceEmbedding) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="card-elevated p-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-warning/10 flex items-center justify-center mb-6">
              <Fingerprint className="w-10 h-10 text-warning" />
            </div>
            <h2 className="text-xl font-semibold mb-3">Face Not Enrolled</h2>
            <p className="text-muted-foreground mb-6">
              You need to enroll your face before marking attendance.
            </p>
            <Button 
              onClick={() => window.location.href = '/enroll-face'}
              className="btn-gradient"
            >
              Enroll Face Now
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Time display */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl md:text-5xl font-bold mb-2 gradient-text">{currentTime}</div>
          <p className="text-muted-foreground">{currentDate}</p>
        </div>

        <div className="card-elevated p-6 md:p-8 animate-slide-up">
          {step === 'select' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-center">Select Attendance Type</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('check-in')}
                  className={cn(
                    "p-6 rounded-xl border-2 transition-all duration-200 text-center",
                    mode === 'check-in'
                      ? "border-primary bg-primary/5 shadow-glow"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <LogIn className={cn(
                    "w-8 h-8 mx-auto mb-3",
                    mode === 'check-in' ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "font-semibold",
                    mode === 'check-in' ? "text-primary" : "text-foreground"
                  )}>Check In</span>
                </button>
                
                <button
                  onClick={() => setMode('check-out')}
                  className={cn(
                    "p-6 rounded-xl border-2 transition-all duration-200 text-center",
                    mode === 'check-out'
                      ? "border-primary bg-primary/5 shadow-glow"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <LogOutIcon className={cn(
                    "w-8 h-8 mx-auto mb-3",
                    mode === 'check-out' ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "font-semibold",
                    mode === 'check-out' ? "text-foreground" : "text-foreground"
                  )}>Check Out</span>
                </button>
              </div>

              <Button 
                onClick={() => setStep('capture')} 
                className="w-full btn-gradient"
                size="lg"
              >
                Continue with Face Verification
              </Button>
            </div>
          )}

          {step === 'capture' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {mode === 'check-in' ? 'Check In' : 'Check Out'}
                </h2>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Cancel
                </Button>
              </div>
              <Camera onCapture={handleCapture} showFaceGuide={true} />
              <p className="text-center text-sm text-muted-foreground">
                Look at the camera and capture your face for verification
              </p>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12 space-y-6">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <div>
                <p className="font-medium text-lg">Verifying your identity...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while our AI confirms your face
                </p>
              </div>
            </div>
          )}

          {step === 'success' && record && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-success mb-2">
                  {mode === 'check-in' ? 'Checked In!' : 'Checked Out!'}
                </h2>
                <p className="text-muted-foreground">
                  Your attendance has been recorded successfully
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Time
                  </span>
                  <span className="font-medium">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" /> Verification
                  </span>
                  <span className="font-medium text-success">{confidence || 'N/A'}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Location
                  </span>
                  <span className="font-medium">Office</span>
                </div>
              </div>

              <Button onClick={handleReset} variant="outline">
                Done
              </Button>
            </div>
          )}

          {step === 'warning' && record && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-warning/10 flex items-center justify-center animate-scale-in">
                <AlertTriangle className="w-10 h-10 text-warning" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-warning mb-2">Low Confidence</h2>
                <p className="text-muted-foreground">
                  Face verification score is below threshold. Please try again with better lighting.
                </p>
              </div>

              <div className="bg-warning/10 rounded-xl p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Verification Score</span>
                  <span className="font-medium text-warning">{confidence || 'N/A'}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Minimum required: 90%
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={handleReset} variant="outline">
                  Cancel
                </Button>
                <Button onClick={() => setStep('capture')} className="btn-gradient">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center animate-scale-in">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>
              <Button onClick={handleReset} variant="outline">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};