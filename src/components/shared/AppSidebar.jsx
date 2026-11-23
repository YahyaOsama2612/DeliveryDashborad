import {
  navigationItems,
} from '../../config/modules';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex h-8 items-center gap-3 overflow-hidden">
          
          <span className="truncate text-base font-semibold text-sidebar-foreground">
           Keeto Delivery
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
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
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <Icon />
                      <span>{title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
