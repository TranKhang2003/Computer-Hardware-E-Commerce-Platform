import { useState, useEffect, useRef } from 'react';
import { User, MapPin, Lock, Award, Plus, Trash2, Edit2, CheckCircle, EyeOff, Eye, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/services/api';
import { toast } from 'sonner';

export default function Profile() {
    const { user, updateUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    // Profile state
    const [profileData, setProfileData] = useState({
        fullName: user?.fullName || '',
    });

    // Address states
    const [addresses, setAddresses] = useState(user?.addresses || []);
    const [showAddressDialog, setShowAddressDialog] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [addressData, setAddressData] = useState({
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        ward: '',
        district: '',
        city: '',
        postalCode: '',
        isDefault: false,
    });
    const [deleteAddressId, setDeleteAddressId] = useState(null);

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                fullName: user.fullName || '',
            });
            setAddresses(user.addresses || []);
        }
    }, [user]);

    // Avatar handlers
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        setUploadingAvatar(true);

        try {
            const response = await authAPI.uploadAvatar(file);
            updateUser(response.data.data.user);
            toast.success('Avatar updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteAvatar = async () => {
        if (!user?.avatarUrl) return;

        setUploadingAvatar(true);

        try {
            const response = await authAPI.deleteAvatar();
            updateUser(response.data.data.user);
            toast.success('Avatar deleted successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Profile handlers
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authAPI.updateProfile(profileData);
            updateUser(response.data.data);
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    // Password handlers
    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await authAPI.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            toast.success('Password changed successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    // Address handlers
    const openAddAddressDialog = () => {
        setEditingAddress(null);
        setAddressData({
            fullName: user?.fullName || '',
            phone: '',
            addressLine1: '',
            addressLine2: '',
            ward: '',
            district: '',
            city: '',
            postalCode: '',
            isDefault: addresses.length === 0,
        });
        setShowAddressDialog(true);
    };

    const openEditAddressDialog = (address) => {
        setEditingAddress(address);
        setAddressData({
            fullName: address.fullName || '',
            phone: address.phone || '',
            addressLine1: address.addressLine1 || '',
            addressLine2: address.addressLine2 || '',
            ward: address.ward || '',
            district: address.district || '',
            city: address.city || '',
            postalCode: address.postalCode || '',
            isDefault: address.isDefault || false,
        });
        setShowAddressDialog(true);
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let response;
            if (editingAddress) {
                response = await authAPI.updateAddress(editingAddress._id, addressData);
                toast.success('Address updated successfully!');
            } else {
                response = await authAPI.addAddress(addressData);
                toast.success('Address added successfully!');
            }

            setAddresses(response.data.data);
            updateUser({ ...user, addresses: response.data.data });
            setShowAddressDialog(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save address');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAddress = async () => {
        if (!deleteAddressId) return;

        setLoading(true);

        try {
            const response = await authAPI.deleteAddress(deleteAddressId);
            setAddresses(response.data.data);
            updateUser({ ...user, addresses: response.data.data });
            toast.success('Address deleted successfully!');
            setDeleteAddressId(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete address');
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefaultAddress = async (addressId) => {
        setLoading(true);

        try {
            const response = await authAPI.setDefaultAddress(addressId);
            setAddresses(response.data.data);
            updateUser({ ...user, addresses: response.data.data });
            toast.success('Default address updated!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to set default address');
        } finally {
            setLoading(false);
        }
    };

    const getUserInitials = () => {
        if (!user?.fullName) return 'U';
        return user.fullName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">My Account</h1>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="addresses">Addresses</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Update your personal details
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center gap-4 pb-6">
                                    <div className="relative">
                                        <Avatar className="h-24 w-24">
                                            <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                                            <AvatarFallback className="text-2xl">
                                                {getUserInitials()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {uploadingAvatar && (
                                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAvatarClick}
                                            disabled={uploadingAvatar}
                                        >
                                            <Camera className="h-4 w-4 mr-2" />
                                            Change Avatar
                                        </Button>
                                        {user?.avatarUrl && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDeleteAvatar}
                                                disabled={uploadingAvatar}
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                    <p className="text-xs text-muted-foreground text-center">
                                        JPG, PNG, GIF or WebP. Max size 5MB
                                    </p>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        value={profileData.fullName}
                                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                                        required
                                    />
                                </div>

                                <Separator />

                                <div className="bg-muted p-4 rounded-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Award className="h-5 w-5 text-primary" />
                                        <span className="font-semibold">Loyalty Points</span>
                                    </div>
                                    <p className="text-2xl font-bold text-primary">
                                        {user?.loyaltyPoints || 0} points
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        ≈ {((user?.loyaltyPoints || 0) * 1000).toLocaleString('vi-VN')} ₫
                                    </p>
                                </div>

                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Updating...' : 'Update Profile'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Addresses Tab */}
                <TabsContent value="addresses">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Shipping Addresses
                                    </CardTitle>
                                    <CardDescription>
                                        Manage your delivery addresses
                                    </CardDescription>
                                </div>
                                <Button onClick={openAddAddressDialog}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Address
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {addresses.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No addresses added yet</p>
                                    <Button onClick={openAddAddressDialog} variant="outline" className="mt-4">
                                        Add Your First Address
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {addresses.map((address) => (
                                        <div
                                            key={address._id}
                                            className="p-4 border rounded-lg hover:border-primary transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="font-semibold">{address.fullName}</p>
                                                        {address.isDefault && (
                                                            <Badge variant="default" className="flex items-center gap-1">
                                                                <CheckCircle className="h-3 w-3" />
                                                                Default
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-1">{address.phone}</p>
                                                    <p className="text-sm">
                                                        {address.addressLine1}
                                                        {address.addressLine2 && `, ${address.addressLine2}`}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {address.ward}, {address.district}, {address.city}
                                                        {address.postalCode && ` - ${address.postalCode}`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!address.isDefault && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSetDefaultAddress(address._id)}
                                                            disabled={loading}
                                                        >
                                                            Set Default
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditAddressDialog(address)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteAddressId(address._id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Change Password
                            </CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="space-y-2 relative">
                                    <Label htmlFor="currentPassword">Current Password</Label>
                                    <Input
                                        id="currentPassword"
                                        type={showPassword.current ? 'text' : 'password'}
                                        value={passwordData.currentPassword}
                                        onChange={(e) =>
                                            setPasswordData({ ...passwordData, currentPassword: e.target.value })
                                        }
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword({ ...showPassword, current: !showPassword.current })
                                        }
                                        className="absolute right-3 top-[35px] p-1"
                                    >
                                        {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>

                                <div className="space-y-2 relative">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                        id="newPassword"
                                        type={showPassword.new ? 'text' : 'password'}
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                        className="absolute right-3 top-[35px] p-1"
                                    >
                                        {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                                </div>

                                <div className="space-y-2 relative">
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword.confirm ? 'text' : 'password'}
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                        className="absolute right-3 top-[35px] p-1"
                                    >
                                        {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>

                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Changing...' : 'Change Password'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Address Dialog */}
            <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingAddress
                                ? 'Update your delivery address information'
                                : 'Add a new delivery address to your account'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveAddress} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="addressFullName">Full Name *</Label>
                                <Input
                                    id="addressFullName"
                                    value={addressData.fullName}
                                    onChange={(e) => setAddressData({ ...addressData, fullName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="addressPhone">Phone *</Label>
                                <Input
                                    id="addressPhone"
                                    type="tel"
                                    value={addressData.phone}
                                    onChange={(e) => setAddressData({ ...addressData, phone: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="addressLine1">Address Line 1 *</Label>
                            <Input
                                id="addressLine1"
                                placeholder="Street address, P.O. box, company name"
                                value={addressData.addressLine1}
                                onChange={(e) => setAddressData({ ...addressData, addressLine1: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="addressLine2">Address Line 2</Label>
                            <Input
                                id="addressLine2"
                                placeholder="Apartment, suite, unit, building, floor"
                                value={addressData.addressLine2}
                                onChange={(e) => setAddressData({ ...addressData, addressLine2: e.target.value })}
                            />
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ward">Ward *</Label>
                                <Input
                                    id="ward"
                                    value={addressData.ward}
                                    onChange={(e) => setAddressData({ ...addressData, ward: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="district">District *</Label>
                                <Input
                                    id="district"
                                    value={addressData.district}
                                    onChange={(e) => setAddressData({ ...addressData, district: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City *</Label>
                                <Input
                                    id="city"
                                    value={addressData.city}
                                    onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="postalCode">Postal Code</Label>
                            <Input
                                id="postalCode"
                                value={addressData.postalCode}
                                onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={addressData.isDefault}
                                onChange={(e) => setAddressData({ ...addressData, isDefault: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="isDefault" className="cursor-pointer">
                                Set as default address
                            </Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAddressDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteAddressId} onOpenChange={() => setDeleteAddressId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Address?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this address? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAddress}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}