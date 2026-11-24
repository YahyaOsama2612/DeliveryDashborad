import {
  navigationItems,
} from '../../config/modules';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MapPin,
  LayoutDashboard,
  Truck,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar';

const AppSidebar = () => {
  const { isMobile, setOpenMobile } = useSidebar();
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <div className="flex h-9 items-center gap-3 overflow-hidden">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm group-data-[collapsible=icon]:size-8">
            <Truck size={19} strokeWidth={2} />
          </span>
          <span className="truncate text-[15px] font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Keeto Delivery
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-5 group-data-[collapsible=icon]:px-2">
          <SidebarGroupLabel className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/" end />}
                  isActive={pathname === '/'}
                  tooltip="Overview"
                  size="lg"
                  className="rounded-xl px-3 text-[13px] font-medium transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground hover:translate-x-0.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:hover:translate-x-0"
                  onClick={() => {
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  <LayoutDashboard />
                  <span className="group-data-[collapsible=icon]:hidden">Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {navigationItems.map(({ title, url, icon: Icon, end }) => {
                const isActive = end
                  ? pathname === url
                  : pathname === url || pathname.startsWith(`${url}/`);

                return (
                  <SidebarMenuItem key={url}>
                    <SidebarMenuButton
                      render={<NavLink to={url} end={end} />}
                      isActive={isActive}
                      tooltip={title}
                      size="lg"
                      className="rounded-xl px-3 text-[13px] font-medium transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground hover:translate-x-0.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:hover:translate-x-0"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <Icon />
                      <span className="group-data-[collapsible=icon]:hidden">{title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="m-3 mt-auto flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 group-data-[collapsible=icon]:hidden">
        <MapPin className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-sidebar-foreground">Delivery operations</p>
          <p className="mt-0.5 truncate text-[10px] text-sidebar-foreground/60">Your workspace</p>
        </div>
      </div>
    </Sidebar>
  );
};

export default AppSidebar;
