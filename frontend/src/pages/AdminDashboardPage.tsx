import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  CalendarCheck, 
  ShieldAlert,
  TrendingUp,
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi, User, AttendanceRecord, attendanceApi } from '@/lib/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(152, 69%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

// Define backend API response types
interface BackendAttendanceRecord {
  id: number;
  userId: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  ipAddress: string | null;
  lat: number | null;
  lng: number | null;
  confidence: number | null;
  createdAt: string;
}

// Transform backend record to match frontend expectations
const transformRecord = (record: BackendAttendanceRecord): AttendanceRecord => { // Using proper type for backend response compatibility
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
    userName: 'Current User' // userName will be populated after joining with user data
  };
};

// Define backend API response type for users
interface BackendUser {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'USER';
  faceEmbedding: number[] | null; // Can be null or array of numbers
  createdAt: string;
  // Note: password field is not included as it shouldn't be sent to frontend
}

// Transform user to match frontend expectations
const transformUser = (user: BackendUser): User => { // Using proper type for backend response compatibility
  return {
    ...user,
    name: user.username, // Use username as name since backend doesn't have a separate name field
    enrolledFace: user.faceEmbedding ? true : false
  };
};

export const AdminDashboardPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalUsers: number;
    enrolledUsers: number;
    todayAttendance: number;
    proxyAttempts: number;
    weeklyData: { day: string; present: number; late: number; absent: number }[];
    monthlyTrend: { month: string; attendance: number }[];
  } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [dashboardStats, allUsers, allRecords] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getUsers(),
          attendanceApi.getAllAttendance(),
        ]);
        
        // Transform records to match frontend expectations
        const transformedUsers = allUsers.map(transformUser);
        const transformedRecords = allRecords.map(transformRecord);
        
        setStats(dashboardStats);
        setUsers(transformedUsers);
        setRecentRecords(transformedRecords.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  const pieData = [
    { name: 'Present', value: stats?.weeklyData.reduce((sum, d) => sum + d.present, 0) || 0 },
    { name: 'Late', value: stats?.weeklyData.reduce((sum, d) => sum + d.late, 0) || 0 },
    { name: 'Absent', value: stats?.weeklyData.reduce((sum, d) => sum + d.absent, 0) || 0 },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor attendance and manage your organization
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <Card className="card-elevated">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">{stats?.totalUsers}</p>
                  <p className="text-xs text-success flex items-center mt-1">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    +12% this month
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enrolled</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">{stats?.enrolledUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((stats?.enrolledUsers || 0) / (stats?.totalUsers || 1) * 100)}% of users
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Attendance</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">{stats?.todayAttendance}</p>
                  <p className="text-xs text-success flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    95% rate
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proxy Attempts</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">{stats?.proxyAttempts}</p>
                  <p className="text-xs text-destructive flex items-center mt-1">
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                    -5% vs last week
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Weekly attendance chart */}
          <Card className="card-elevated lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                    <Bar dataKey="present" fill="hsl(152, 69%, 40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-success" />
                  <span className="text-muted-foreground">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-warning" />
                  <span className="text-muted-foreground">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-destructive" />
                  <span className="text-muted-foreground">Absent</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribution pie chart */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                    <span className="font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly trend and recent activity */}
        <div className="grid lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {/* Monthly trend */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" domain={[80, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="attendance" 
                      stroke="hsl(185, 65%, 30%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(185, 65%, 30%)', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent records */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        record.status === 'PRESENT' && "bg-success",
                        record.status === 'LATE' && "bg-warning",
                        record.status === 'ABSENT' && "bg-destructive",
                        (record.status as string) === 'proxy_detected' && "bg-destructive"
                      )} />
                      <div>
                        <p className="font-medium text-sm">{record.userName}</p>
                        <p className="text-xs text-muted-foreground">{record.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{record.checkIn}</p>
                      <p className={cn(
                        "text-xs",
                        (record.verificationScore || 0) >= 90 ? "text-success" : "text-warning"
                      )}>
                        {record.verificationScore}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users table */}
        <Card className="card-elevated animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle className="text-lg">All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Enrolled</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{user.name}</td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium capitalize",
                          user.role === 'ADMIN' 
                            ? "bg-primary/10 text-primary" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {user.role.toLowerCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        {user.enrolledFace ? (
                          <span className="text-success text-sm">✓ Yes</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{user.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};