import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, Menu, LogOut, Package, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { clearCart, setMode } = useCartStore();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    setMode('guest');
    clearCart();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      {/* Top Bar with Gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(210,100%,45%)] via-[hsl(195,100%,50%)] to-[hsl(210,100%,45%)] animate-gradient-x"></div>
        <div className="container relative mx-auto px-4 py-2.5 text-center text-sm font-medium text-white">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 animate-pulse" />
            <span>Miễn phí vận chuyển đơn từ 500k | Hỗ trợ 24/7</span>
            <Zap className="h-4 w-4 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo with Gradient */}
          <Link to="/" className="group flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] rounded-lg blur-sm opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] p-1.5 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] bg-clip-text text-transparent">
              TechStore
            </span>
          </Link>

          {/* Search Bar with Enhanced Style */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full group">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(210,100%,45%)]/20 to-[hsl(195,100%,50%)]/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="search"
                  placeholder="Tìm laptop, màn hình, linh kiện..."
                  className="w-full pl-10 pr-4 h-10 bg-muted/50 border-muted-foreground/20 focus:border-[hsl(210,100%,45%)] focus:ring-[hsl(210,100%,45%)]/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Track Order icon button - guest & user */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/track-order')}
              className="hover:bg-gradient-to-br hover:from-[hsl(210,100%,45%)]/10 hover:to-[hsl(195,100%,50%)]/10 transition-all"
              aria-label="Track Order"
            >
              <Package className="h-5 w-5" />
            </Button>

            {/* Cart with Gradient Badge */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-gradient-to-br hover:from-[hsl(210,100%,45%)]/10 hover:to-[hsl(195,100%,50%)]/10 transition-all"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="h-5 w-5" />
              {getTotalItems() > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-gradient-to-br from-[hsl(25,95%,53%)] to-[hsl(340,100%,60%)] border-0 text-white animate-pulse">
                  {getTotalItems()}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-gradient-to-br hover:from-[hsl(210,100%,45%)]/10 hover:to-[hsl(195,100%,50%)]/10 transition-all">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Tài khoản
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/orders')}>
                    <Package className="mr-2 h-4 w-4" />
                    Đơn hàng
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Menu className="mr-2 h-4 w-4" />
                        Quản trị
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                size="sm"
                className="bg-gradient-to-r from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] hover:opacity-90 transition-opacity text-white border-0"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-10 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Navigation with Hover Effects */}
      <nav className="border-t border-border/50">
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-6 overflow-x-auto py-3 text-sm font-medium">
            <li>
              <Link
                to="/products?category=laptops"
                className="relative group hover:text-[hsl(210,100%,45%)] transition-colors whitespace-nowrap py-1"
              >
                Laptop
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] group-hover:w-full transition-all duration-300"></span>
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=monitors"
                className="relative group hover:text-[hsl(210,100%,45%)] transition-colors whitespace-nowrap py-1"
              >
                Màn hình
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] group-hover:w-full transition-all duration-300"></span>
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=components"
                className="relative group hover:text-[hsl(210,100%,45%)] transition-colors whitespace-nowrap py-1"
              >
                Linh kiện
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] group-hover:w-full transition-all duration-300"></span>
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=accessories"
                className="relative group hover:text-[hsl(210,100%,45%)] transition-colors whitespace-nowrap py-1"
              >
                Phụ kiện
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] group-hover:w-full transition-all duration-300"></span>
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=storage"
                className="relative group hover:text-[hsl(210,100%,45%)] transition-colors whitespace-nowrap py-1"
              >
                Ổ cứng
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[hsl(210,100%,45%)] to-[hsl(195,100%,50%)] group-hover:w-full transition-all duration-300"></span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <style>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </header>
  );
}