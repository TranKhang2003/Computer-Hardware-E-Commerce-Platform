import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    Ticket,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { clearCart, setMode } = useCartStore();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Package, label: 'Products', path: '/admin/products' },
        { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: Ticket, label: 'Discounts', path: '/admin/discounts' },
    ];

    const handleLogout = () => {
        logout();
        setMode('guest');
        clearCart();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <X /> : <Menu />}
                </Button>
            </div>

            {/* Sidebar */}
            <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-background border-r transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b">
                        <Link to="/" className="flex items-center space-x-2">
                            <Package className="h-6 w-6 text-primary" />
                            <span className="text-xl font-bold">Admin Panel</span>
                        </Link>
                    </div>

                    {/* Menu */}
                    <nav className="flex-1 p-4 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                        }
                  `}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t">
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-5 w-5 mr-3" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                <main className="p-6">
                    <Outlet />
                </main>
            </div>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
