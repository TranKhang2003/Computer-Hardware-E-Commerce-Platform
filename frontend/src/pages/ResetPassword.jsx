// src/pages/auth/ResetPassword.jsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authAPI } from '@/services/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password) return toast.error('Password is required');
        if (!token) return toast.error('Token missing');

        setLoading(true);
        try {
            await authAPI.resetPassword({ token, newPassword: password });
            toast.success('Password reset successfully');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 max-w-md">
            <h1 className="text-2xl font-bold mb-6">Set New Password</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
            </form>
        </div>
    );
}
