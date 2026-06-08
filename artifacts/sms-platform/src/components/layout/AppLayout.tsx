import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Contact, 
  MessageSquare, 
  Send,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resellers", label: "Resellers", icon: Users, role: "admin" },
  { href: "/clients", label: "Clients", icon: Contact },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/send", label: "Send SMS", icon: Send },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.role || item.role === user?.role
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col hidden md:flex shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2 font-mono font-bold text-sidebar-foreground">
            <div className="w-6 h-6 bg-sidebar-primary rounded flex items-center justify-center text-sidebar-primary-foreground">
              <Send className="w-3.5 h-3.5" />
            </div>
            <span>SmartSupport</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 mt-4 px-3">
            Menu
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-3 mt-auto border-t border-sidebar-border shrink-0">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-sidebar-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.username}
                </span>
                <span className="text-xs text-sidebar-foreground/50 capitalize truncate flex items-center gap-1.5">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    user.role === "admin" ? "bg-red-500" : "bg-blue-500"
                  )} />
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-destructive hover:bg-destructive/20 hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Nav (Mobile mostly, plus some global actions) */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
          <div className="md:hidden font-mono font-bold">SmartSupport</div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              API Operational
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
