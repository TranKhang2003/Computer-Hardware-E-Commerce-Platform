import { useState, useEffect } from 'react';
import { DollarSign, Users, Package, ShoppingBag, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';
import BestSellersCard from '@/components/admin/BestSellersCard';

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('year');
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalProducts: 0,
        revenueChange: 0,
        ordersChange: 0,
        usersChange: 0,

    });
    const [chartData, setChartData] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);


    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardRes, statsRes] = await Promise.all([
                    adminAPI.getDashboard(),
                    adminAPI.getStatistics({ timeRange }),
                ]);

                setStats(dashboardRes.data.data);


                setChartData(statsRes.data.data.chartData || []);
                setBestSellers(statsRes.data.data.bestSellers || []);
            } catch (error) {
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [timeRange]);

    const statCards = [
        {
            title: 'Total Revenue',
            value: `${(stats.totalRevenue ?? 0).toLocaleString()}`,
            change: stats.revenueChange,
            icon: DollarSign,
            color: 'text-green-600',
        },
        {
            title: 'Total Orders',
            value: `${(stats.totalOrders ?? 0).toLocaleString()}`,
            change: stats.ordersChange,
            icon: ShoppingBag,
            color: 'text-blue-600',
        },
        {
            title: 'Total Users',
            value: `${(stats.totalUsers ?? 0).toLocaleString()}`,
            change: stats.usersChange,
            icon: Users,
            color: 'text-purple-600',
        },
        {
            title: 'Total Products',
            value: `${(stats.totalProducts ?? 0).toLocaleString()}`,
            icon: Package,
            color: 'text-orange-600',
        },
    ];



    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    const isPositive = stat.change >= 0;

                    return (
                        <Card key={index}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <Icon className={`h-4 w-4 ${stat.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                {stat.change !== undefined && (
                                    <p className={`text-xs flex items-center gap-1 mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        {Math.abs(stat.change)}% from last period
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                                <Line type="monotone" dataKey="profit" stroke="#82ca9d" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Orders by Period</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="orders" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Best Sellers */}
            <BestSellersCard bestSellers={bestSellers} loading={loading} />
        </div>
    );
}
