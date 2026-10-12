import { useSidebar } from "@/context/SidebarContext";
import { Link, useLocation } from "react-router";
import {
  BoxIconLine,
  DashboardAltIcon,
  HorizontaLDots,
  SettingsAltIcon,
  TruckDelivery,
  UserCircleIcon,
} from "../icons";
import { cn } from "../utils";
import SidebarWidget from "./SidebarWidget";

const customerItems = [
  { label: "Rewards Center", path: "/", icon: <DashboardAltIcon fontSize={24} /> },
  { label: "My Redemptions", path: "/redemptions", icon: <TruckDelivery fontSize={24} /> },
  { label: "My Profile", path: "/profile", icon: <UserCircleIcon fontSize={24} /> },
];

const adminItems = [
  { label: "Reward Catalog", path: "/admin/products", icon: <BoxIconLine fontSize={24} /> },
  { label: "Redemption Requests", path: "/admin/redemptions", icon: <SettingsAltIcon fontSize={24} /> },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setIsMobileOpen } = useSidebar();
  const location = useLocation();
  const isOpen = isExpanded || isHovered || isMobileOpen;

  const renderItems = (items: typeof customerItems) => (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "group menu-item",
                active ? "menu-item-active" : "menu-item-inactive",
                !isExpanded && !isHovered ? "xl:justify-center" : "xl:justify-start",
              )}
            >
              <span className={cn("menu-item-icon-size", active ? "menu-item-icon-active" : "menu-item-icon-inactive")}>{item.icon}</span>
              {isOpen && <span className="menu-item-text">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={cn(
        "fixed inset-s-0 top-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:translate-x-0 xl:rtl:translate-x-0 dark:border-gray-800 dark:bg-gray-900",
        isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5",
        isMobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn("flex py-8", !isExpanded && !isHovered ? "xl:justify-center" : "justify-start")}>
        <Link to="/" aria-label="Bags Star Rewards">
          {isOpen ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-theme-xs"><DashboardAltIcon className="h-5 w-5" /></div>
              <div><p className="text-sm font-bold tracking-wide text-gray-900 dark:text-white">BAGS STAR</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-brand-500">Rewards hub</p></div>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-theme-xs"><DashboardAltIcon className="h-5 w-5" /></div>
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6"><div className="flex flex-col gap-6"><div><h2 className={cn("mb-3 flex text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400", !isOpen ? "justify-center" : "justify-start")}>{isOpen ? "Customer portal" : <HorizontaLDots className="size-6" />}</h2>{renderItems(customerItems)}</div><div><h2 className={cn("mb-3 flex text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400", !isOpen ? "justify-center" : "justify-start")}>{isOpen ? "Admin preview" : <HorizontaLDots className="size-6" />}</h2>{renderItems(adminItems)}</div></div></nav>
        {isOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
