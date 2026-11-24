import { ChevronLeft, LogOut, UserRound } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from '../components/shared/AppSidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '../components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import useAuthStore from '../store/useAuthStore';

const pageTitles = [
  { path: '/profile', title: 'Profile' },
  { path: '/orders/:id', title: 'Order details' },
  { path: '/orders', title: 'Orders' },
  { path: '/delivery-men', title: 'Delivery Man' },
  { path: '/drivers', title: 'Delivery Man' },
  { path: '/zones', title: 'Zones' },
  { path: '/restaurants', title: 'Restaurants' },
  { path: '/users', title: 'Users' },
  { path: '/customers', title: 'Customers' },
  { path: '/reports', title: 'Reports' },
  { path: '/profile', title: 'Profile' },
];

/**
 * DashboardLayout — shared wrapper for all protected pages.
 */
const DashboardLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setLogout = useAuthStore((state) => state.setLogout);
  const currentPage =
    pageTitles.find(
      ({ path }) =>
        path === '/orders/:id'
          ? pathname.startsWith('/orders/')
          : pathname.startsWith(path)
    )?.title || 'Home';
  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate(pathname.startsWith('/orders/') ? '/orders' : '/');
  };

  const handleLogout = () => {
    setLogout();
    navigate('/login', { replace: true });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* h-svh + min-w-0: fixes the page height/width so only the content area scrolls */}
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 shadow-[0_1px_8px_rgba(28,25,23,0.03)] backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <SidebarTrigger className="shrink-0" />
              {pathname !== '/' && (
                <>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="group/back shrink-0 rounded-md p-1.5 transition-colors hover:bg-accent"
                    title="Go back"
                    aria-label="Go back"
                  >
                    <ChevronLeft
                      size={19}
                      className="text-muted-foreground transition group-hover/back:-translate-x-0.5 group-hover/back:text-primary"
                    />
                  </button>
                  <span className="h-5 w-px shrink-0 bg-border" />
                </>
              )}
              <h2 className="m-0 truncate text-base font-semibold tracking-tight sm:text-lg">
                {currentPage}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Go to dashboard"
              className="absolute left-1/2 hidden h-12 w-32 -translate-x-1/2 items-center justify-center rounded-md px-2 py-1.5 transition-colors hover:bg-accent md:flex"
            >
              <img
                src="/logo.webp"
                alt="Keeto Delivery"
                className="max-h-full max-w-full object-contain"
              />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-muted-foreground transition-all hover:border-primary/60 hover:bg-accent hover:text-primary"
                aria-label="Open profile menu"
              >
                {user?.logo ? (
                  <img
                    src={user.logo}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound size={22} />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="truncate px-1.5 py-1 text-xs font-medium text-muted-foreground">
                  {user?.name || user?.email || 'My account'}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer"
                >
                  <UserRound />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <div className="min-h-0 flex-1 overflow-auto bg-muted/20">
            <div className="min-h-full p-4 sm:p-6">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;