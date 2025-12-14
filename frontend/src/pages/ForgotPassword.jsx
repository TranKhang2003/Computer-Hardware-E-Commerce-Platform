// src/pages/auth/ForgotPassword.jsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authAPI } from '@/services/api'; // giả sử bạn đã có api service

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return toast.error('Email is required');
        setLoading(true);

        try {
            await authAPI.forgotPassword({ email }); // 🔹 gửi email vào body
            toast.success('Check your email for reset link');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send email');
            console.error(err); // 🔹 in ra lỗi thật sự
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="container mx-auto px-4 py-16 max-w-md">
            <h1 className="text-2xl font-bold mb-6">Reset Password</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
            </form>
        </div>
    );
}
