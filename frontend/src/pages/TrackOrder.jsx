// pages/TrackOrder.jsx hoặc pages/orders/TrackOrder.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { orderAPI } from '@/services/api';
import { toast } from 'sonner';

export default function TrackOrder() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    orderNumber: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await orderAPI.trackOrder(
        formData.orderNumber,
        formData.email
      );

      toast.success('Order found!');
      const orderId = response.data.data._id;
      navigate(`/orders/${orderId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to track order');
      toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Track Your Order</CardTitle>
            <CardDescription>
              Enter your order number and email to view order details
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="ORD-20251118-001"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Found in your confirmation email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Email used when placing the order
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Track Order
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Have an account?
              </p>
              <Button
                variant="link"
                onClick={() => navigate('/login')}
                className="text-primary"
              >
                Sign in to view all your orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}