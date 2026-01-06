import React, { useState, useEffect } from 'react';
import { 
  History, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceApi, AttendanceRecord } from '@/lib/api';
import { cn } from '@/lib/utils';

// Define the backend attendance record type based on the backend schema
interface BackendAttendanceRecord {
  id: number;
  userId: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  ipAddress?: string;
  lat?: number;
  lng?: number;
  confidence?: number;
  createdAt: string;
  userName?: string;
}

const statusConfig = {
  PRESENT: { label: 'Present', icon: CheckCircle, color: 'bg-success/10 text-success' },
  LATE: { label: 'Late', icon: Clock, color: 'bg-warning/10 text-warning' },
  ABSENT: { label: 'Absent', icon: XCircle, color: 'bg-destructive/10 text-destructive' },
  proxy_detected: { label: 'Proxy Detected', icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
};

// Transform backend record to match frontend expectations
const transformRecord = (record: BackendAttendanceRecord): AttendanceRecord => {
  const date = new Date(record.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  const time = new Date(record.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    ...record,
    date: date,
    checkIn: time,
    checkOut: null, // Backend doesn't track check-out separately
    verificationScore: record.confidence || 0,
    userName: record.userName || 'Current User'
  };
};

export const AttendanceHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        let data: BackendAttendanceRecord[];
        if (user?.role === 'ADMIN') {
          data = await attendanceApi.getAllAttendance();
        } else {
          data = await attendanceApi.getHistory(user?.id || 0);
        }
        
        // Transform records to match frontend expectations
        const transformedRecords = data.map(transformRecord);
        setRecords(transformedRecords);
      } catch (error) {
        console.error('Failed to fetch attendance history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const filteredRecords = statusFilter === 'all' 
    ? records 
    : records.filter(r => {
        if (statusFilter === 'proxy_detected') {
          // Handle proxy detection separately as it's not a backend status
          return false; // Since backend doesn't have proxy_detected status
        }
        return r.status === statusFilter.toUpperCase();
      });

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const stats = {
    present: records.filter(r => r.status === 'PRESENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    proxy: 0, // Backend doesn't track proxy detection in the same way
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {user?.role === 'ADMIN' ? 'All Attendance' : 'My Attendance History'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === 'ADMIN' 
                ? 'View and manage all employee attendance records'
                : 'Track your attendance and verification history'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="proxy_detected">Proxy Detected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.proxy}</p>
                <p className="text-xs text-muted-foreground">Proxy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Records table */}
        <div className="card-elevated overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : paginatedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="font-medium">No records found</p>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== 'all' ? 'Try changing the filter' : 'Start marking attendance to see history'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                      {user?.role === 'ADMIN' && (
                        <th className="text-left p-4 font-medium text-muted-foreground">Employee</th>
                      )}
                      <th className="text-left p-4 font-medium text-muted-foreground">Check In</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Check Out</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedRecords.map((record) => {
                      // Use the appropriate status key
                      const status = statusConfig[record.status as keyof typeof statusConfig] || 
                                   statusConfig.proxy_detected;
                      const StatusIcon = status.icon;
                      
                      return (
                        <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{record.date}</span>
                            </div>
                          </td>
                          {user?.role === 'ADMIN' && (
                            <td className="p-4">{record.userName}</td>
                          )}
                          <td className="p-4">{record.checkIn}</td>
                          <td className="p-4">{record.checkOut || '-'}</td>
                          <td className="p-4">
                            <Badge variant="secondary" className={cn("gap-1", status.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "font-medium",
                              (record.verificationScore || 0) >= 90 ? "text-success" : "text-warning"
                            )}>
                              {record.verificationScore}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {paginatedRecords.map((record) => {
                  const status = statusConfig[record.status as keyof typeof statusConfig] || 
                               statusConfig.proxy_detected;
                  const StatusIcon = status.icon;
                  
                  return (
                    <div key={record.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{record.date}</span>
                        </div>
                        <Badge variant="secondary" className={cn("gap-1", status.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </div>
                      
                      {user?.role === 'ADMIN' && (
                        <p className="text-sm text-muted-foreground">{record.userName}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">In: </span>
                          <span className="font-medium">{record.checkIn}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Out: </span>
                          <span className="font-medium">{record.checkOut || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Score: </span>
                          <span className={cn(
                            "font-medium",
                            (record.verificationScore || 0) >= 90 ? "text-success" : "text-warning"
                          )}>
                            {record.verificationScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};