import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Footer() {
    return (
        <footer className="bg-muted/50 border-t">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* About */}
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <Package className="h-6 w-6 text-primary" />
                            <span className="text-xl font-bold">TechStore</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Điểm đến đáng tin cậy dành cho máy tính và linh kiện máy tính. Sản phẩm chất lượng, giá cả cạnh tranh và dịch vụ tuyệt vời.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Facebook className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Twitter className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Instagram className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Youtube className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/products" className="hover:text-primary transition-colors">All Products</Link></li>
                            <li><Link to="/products?category=laptops" className="hover:text-primary transition-colors">Laptops</Link></li>
                            <li><Link to="/products?category=monitors" className="hover:text-primary transition-colors">Monitors</Link></li>
                            <li><Link to="/products?category=components" className="hover:text-primary transition-colors">Components</Link></li>
                            <li><Link to="/orders" className="hover:text-primary transition-colors">Track Order</Link></li>
                        </ul>
                    </div>

                    {/* Customer Service */}
                    <div>
                        <h3 className="font-semibold mb-4">Customer Service</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                            <li><Link to="/shipping" className="hover:text-primary transition-colors">Shipping Info</Link></li>
                            <li><Link to="/returns" className="hover:text-primary transition-colors">Returns</Link></li>
                            <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="font-semibold mb-4">Contact Info</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>123 Tech Street, Ho Chi Minh City, Vietnam</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0" />
                                <span>+84 123 456 789</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4 flex-shrink-0" />
                                <span>support@techstore.com</span>
                            </li>
                        </ul>
                        <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Subscribe to Newsletter</p>
                            <div className="flex gap-2">
                                <Input type="email" placeholder="Your email" className="h-9" />
                                <Button size="sm">Subscribe</Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} TechStore. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
