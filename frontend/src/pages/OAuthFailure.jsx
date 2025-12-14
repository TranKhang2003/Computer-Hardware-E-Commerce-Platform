import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OAuthFailure() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const error = searchParams.get('error');
    const message = searchParams.get('message');

    useEffect(() => {
        // Show error toast
        const errorMessage = message || getErrorMessage(error);
        toast.error(errorMessage);
    }, [error, message]);

    const getErrorMessage = (errorCode) => {
        const errorMessages = {
            'authentication_failed': 'Unable to authenticate with OAuth provider',
            'account_inactive': 'Your account is not active',
            'google_auth_failed': 'Google authentication failed',
            'facebook_auth_failed': 'Facebook authentication failed',
            'server_error': 'An unexpected error occurred',
        };
        return errorMessages[errorCode] || 'Authentication failed';
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Authentication Failed
                    </h1>
                    <p className="text-gray-600">
                        {message || getErrorMessage(error)}
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={() => navigate('/login')}
                        className="w-full"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Button>

                    <Button
                        onClick={() => navigate('/')}
                        variant="outline"
                        className="w-full"
                    >
                        Go to Home
                    </Button>
                </div>

                <p className="text-sm text-gray-500 mt-6">
                    Need help? <a href="/contact" className="text-blue-600 hover:underline">Contact Support</a>
                </p>
            </div>
        </div>
    );
}
