import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getMediaItems } from '@/data/media';
import { MediaItem } from '@/types/media';
import { formatFileSize } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CircleDashed as FileDashed, FileType2, Users, HardDrive, ActivitySquare, ShieldCheck } from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastActive: string;
  storageUsed: number;
  filesCount: number;
};

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'user@example.com',
    role: 'user',
    status: 'active',
    lastActive: '2025-04-12T15:30:00Z',
    storageUsed: 1024 * 1024 * 250, // 250 MB
    filesCount: 7,
  },
  {
    id: '2',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    lastActive: '2025-04-15T09:45:00Z',
    storageUsed: 1024 * 1024 * 120, // 120 MB
    filesCount: 4,
  },
  {
    id: '3',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'user',
    status: 'active',
    lastActive: '2025-04-14T11:20:00Z',
    storageUsed: 1024 * 1024 * 550, // 550 MB
    filesCount: 12,
  },
  {
    id: '4',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'user',
    status: 'inactive',
    lastActive: '2025-03-20T08:15:00Z',
    storageUsed: 1024 * 1024 * 75, // 75 MB
    filesCount: 3,
  },
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AdminPage() {
  const { user } = useAuth();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState(mockUsers);
  
  useEffect(() => {
    // Get all media items
    const items = getMediaItems();
    setMediaItems(items);
    
    // Filter users based on search query
    const filtered = mockUsers.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery]);
  
  // Calculate stats
  const totalStorage = mockUsers.reduce((sum, user) => sum + user.storageUsed, 0);
  const totalFiles = mockUsers.reduce((sum, user) => sum + user.filesCount, 0);
  const activeUsers = mockUsers.filter(user => user.status === 'active').length;
  
  // Prepare chart data
  const storageByTypeData = [
    { name: 'Images', value: 450 },
    { name: 'Videos', value: 850 },
    { name: 'Audio', value: 200 },
    { name: 'Documents', value: 300 },
  ];
  
  const activityData = [
    { name: 'Mon', uploads: 5, downloads: 8 },
    { name: 'Tue', uploads: 7, downloads: 12 },
    { name: 'Wed', uploads: 10, downloads: 15 },
    { name: 'Thu', uploads: 8, downloads: 10 },
    { name: 'Fri', uploads: 12, downloads: 18 },
    { name: 'Sat', uploads: 4, downloads: 6 },
    { name: 'Sun', uploads: 3, downloads: 5 },
  ];

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-destructive/10 rounded-full">
                <ShieldCheck className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href="/dashboard">Return to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor system metrics and manage users.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Storage Used
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(totalStorage)}</div>
            <p className="text-xs text-muted-foreground">
              Across all users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Files
            </CardTitle>
            <FileDashed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              Media files stored
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Out of {mockUsers.length} total users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              File Types
            </CardTitle>
            <FileType2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              Supported file formats
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage user accounts.
              </CardDescription>
              <div className="pt-4">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Storage Used</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? "default" : "outline"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? "success" : "secondary"} className={user.status === 'active' ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(user.storageUsed)}</TableCell>
                      <TableCell>{user.filesCount}</TableCell>
                      <TableCell>{format(new Date(user.lastActive), 'PP')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>File Management</CardTitle>
              <CardDescription>
                View and manage all files in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mediaItems.slice(0, 6).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {mockUsers.find(u => u.id === item.userId)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{formatFileSize(item.size)}</TableCell>
                      <TableCell>{format(new Date(item.createdAt), 'PP')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Storage Distribution</CardTitle>
                <CardDescription>
                  Storage used by file type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={storageByTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {storageByTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${formatFileSize(value as number)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription>
                  Upload and download trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="uploads" fill="hsl(var(--chart-1))" name="Uploads" />
                      <Bar dataKey="downloads" fill="hsl(var(--chart-2))" name="Downloads" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}