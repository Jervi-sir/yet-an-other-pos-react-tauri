import { Link, useLocation } from 'react-router-dom';
// import { useStore } from '@/context/StoreContext'; // Removed
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Package, Users, FileText, Settings, LogOut, LayoutDashboard, TrendingUp
} from 'lucide-react';

import { useAuth, removeUser, getSession, removeSession } from '@/lib/auth';

export function Sidebar() {
  const currentUser = useAuth();
  const logout = async () => {
    const currentSession = getSession();
    if (currentSession?.id) {
      try {
        await fetch(`http://localhost:3000/api/sessions/${currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            end_time: new Date().toISOString(),
            status: 'closed'
          })
        });
        removeSession();
      } catch (err) {
        console.error("Failed to close session", err);
      }
    }
    removeUser();
    window.location.href = '/login';
  };
  const location = useLocation();

  if (!currentUser) return null;

  // Cashier has limited access

  const links = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'sub_admin'] },
    { label: 'POS', path: '/pos', icon: ShoppingCart, roles: ['admin', 'sub_admin', 'cashier'] },
    { label: 'Products', path: '/products', icon: Package, roles: ['admin', 'sub_admin'] },
    { label: 'Categories', path: '/categories', icon: Package, roles: ['admin'] },
    { label: 'Units', path: '/units', icon: Package, roles: ['admin'] },
    { label: 'Sales History', path: '/sales', icon: FileText, roles: ['admin', 'sub_admin', 'cashier'] }, // maybe limited for cashier
    { label: 'Sold Products', path: '/product-sales', icon: FileText, roles: ['admin', 'sub_admin', 'cashier'] },
    { label: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'sub_admin'] },
    { label: 'Users', path: '/users', icon: Settings, roles: ['admin'] },
    { label: 'Cashier Stats', path: '/user-stats', icon: TrendingUp, roles: ['admin', 'sub_admin'] },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-muted/20">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6" />
          <span>POS System</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {links.map((link) => (
            shouldShow(link.roles, currentUser.role) && (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  location.pathname === link.path
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div className="truncate">
            <p className="text-sm font-medium leading-none">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{currentUser.role.replace('_', ' ')}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

function shouldShow(allowedRoles: string[], userRole: string) {
  return allowedRoles.includes(userRole);
}
