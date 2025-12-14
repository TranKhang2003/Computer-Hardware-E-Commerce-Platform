import { useState, useEffect } from 'react';
import { Search, Ban, UserCheck, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [showBanDialog, setShowBanDialog] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 4,
        total: 0,
        totalPages: 0,
    });



    // Debounce search + reset page
    useEffect(() => {
        const timer = setTimeout(() => {
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch users khi page thay đổi
    useEffect(() => {
        fetchUsers();
    }, [pagination.page]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getAllUsers({
                page: pagination.page,
                limit: pagination.limit,
                search: searchQuery || undefined,
            });

            const data = response.data.data;

            setUsers(data.users || []);
            setPagination(prev => ({
                ...prev,
                total: data.pagination.total,
                totalPages: data.pagination.totalPages,
            }));
        } catch (error) {
            toast.error('Failed to load users');
            console.error('Fetch users error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewUser = (user) => {
        setSelectedUser(user);
        setShowDialog(true);
    };

    const handleBanUser = async () => {
        try {
            await adminAPI.banUser(selectedUser._id);

            const isBanned = selectedUser.status === 'banned';
            toast.success(
                isBanned ? 'User unbanned successfully!' : 'User banned successfully!'
            );

            setShowBanDialog(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update user status');
            console.error('Ban user error:', error);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Users</h1>
                    <p className="text-muted-foreground">Manage user accounts</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary">
                        Total Users: {pagination.total}
                    </Badge>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users by name or email..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Loading users...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No users found
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Orders</TableHead>
                                        <TableHead>Loyalty Points</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={user.avatarUrl} />
                                                        <AvatarFallback>
                                                            {getInitials(user.fullName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{user.fullName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Joined {new Date(user.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                                    {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{user.totalOrders || 0}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{user.loyaltyPoints || 0}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(user.loyaltyPoints * 1000).toLocaleString('vi-VN')} ₫
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {user.status === 'banned' ? (
                                                    <Badge variant="destructive">Banned</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Active</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewUser(user)}
                                                    >
                                                        <UserCheck className="h-4 w-4 mr-2" />
                                                        View
                                                    </Button>
                                                    {user.role !== 'admin' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setShowBanDialog(true);
                                                            }}
                                                        >
                                                            <Ban className="h-4 w-4 mr-2" />
                                                            {user.status === 'banned' ? 'Unban' : 'Ban'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="p-4 border-t">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() =>
                                                        pagination.page > 1 &&
                                                        setPagination(prev => ({
                                                            ...prev,
                                                            page: prev.page - 1,
                                                        }))
                                                    }
                                                    className={
                                                        pagination.page === 1
                                                            ? 'pointer-events-none opacity-50'
                                                            : 'cursor-pointer'
                                                    }
                                                />
                                            </PaginationItem>

                                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map((pageNum) => (
                                                <PaginationItem key={pageNum}>
                                                    <PaginationLink
                                                        onClick={() =>
                                                            setPagination(prev => ({ ...prev, page: pageNum }))
                                                        }
                                                        isActive={pagination.page === pageNum}
                                                        className="cursor-pointer"
                                                    >
                                                        {pageNum}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}

                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() =>
                                                        pagination.page < pagination.totalPages &&
                                                        setPagination(prev => ({
                                                            ...prev,
                                                            page: prev.page + 1,
                                                        }))
                                                    }
                                                    className={
                                                        pagination.page === pagination.totalPages
                                                            ? 'pointer-events-none opacity-50'
                                                            : 'cursor-pointer'
                                                    }
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* User Detail Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-6">
                            {/* Profile */}
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={selectedUser.avatarUrl} />
                                    <AvatarFallback className="text-2xl">
                                        {getInitials(selectedUser.fullName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedUser.fullName}</h3>
                                    <p className="text-muted-foreground flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        {selectedUser.email}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                                            {selectedUser.role}
                                        </Badge>
                                        {selectedUser.status === 'banned' && (
                                            <Badge variant="destructive">Banned</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <p className="text-2xl font-bold">{selectedUser.totalOrders || 0}</p>
                                        <p className="text-sm text-muted-foreground">Total Orders</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <p className="text-2xl font-bold">
                                            {(selectedUser.totalSpent || 0).toLocaleString()}đ
                                        </p>
                                        <p className="text-sm text-muted-foreground">Total Spent</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <p className="text-2xl font-bold">
                                            {selectedUser.loyaltyPoints || 0}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Loyalty Points</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Addresses */}
                            <div>
                                <h3 className="font-semibold mb-3">Shipping Addresses</h3>
                                <div className="space-y-3">
                                    {selectedUser.addresses?.map((address, index) => (
                                        <Card key={index}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium">{address.fullName}</p>
                                                        <p className="text-sm text-muted-foreground">{address.phone}</p>
                                                        <p className="text-sm mt-1">
                                                            {address.addressLine1}
                                                            {address.addressLine2 && `, ${address.addressLine2}`}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {address.ward}, {address.district}, {address.city}
                                                            {address.postalCode && ` - ${address.postalCode}`}
                                                        </p>
                                                    </div>
                                                    {address.isDefault && (
                                                        <Badge variant="secondary">Default</Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {(!selectedUser.addresses || selectedUser.addresses.length === 0) && (
                                        <p className="text-sm text-muted-foreground">No addresses added</p>
                                    )}
                                </div>
                            </div>

                            {/* Account Info */}
                            <div className="text-sm text-muted-foreground space-y-1">
                                <p>Account created: {new Date(selectedUser.createdAt).toLocaleString()}</p>
                                {selectedUser.lastLoginAt && (
                                    <p>Last login: {new Date(selectedUser.lastLoginAt).toLocaleString()}</p>
                                )}
                                {selectedUser.emailVerified && (
                                    <p className="text-green-600">✓ Email verified</p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Ban Confirmation Dialog */}
            <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {selectedUser?.status === 'banned' ? 'Unban User?' : 'Ban User?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedUser?.status === 'banned'
                                ? `Are you sure you want to unban ${selectedUser?.fullName}? They will regain access to their account.`
                                : `Are you sure you want to ban ${selectedUser?.fullName}? They will lose access to their account.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBanUser}
                            className={selectedUser?.status === 'banned' ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
                        >
                            {selectedUser?.status === 'banned' ? 'Unban User' : 'Ban User'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}