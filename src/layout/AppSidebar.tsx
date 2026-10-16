import BrandLogo from "@/components/common/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import {
  BoxIconLine,
  ChatIcon,
  DashboardAltIcon,
  HorizontaLDots,
  SettingsAltIcon,
  ShootingStarIcon,
  TruckDelivery,
  UserCircleIcon,
} from "../icons";
import { cn } from "../utils";

const customerItems = [
  { labelKey: "sidebar.rewardsCenter", path: "/", icon: <DashboardAltIcon fontSize={24} /> },
  { labelKey: "sidebar.pointsExchange", path: "/points-exchange", icon: <ShootingStarIcon fontSize={24} /> },
  { labelKey: "sidebar.myRedemptions", path: "/redemptions", icon: <TruckDelivery fontSize={24} /> },
  { labelKey: "sidebar.myProfile", path: "/profile", icon: <UserCircleIcon fontSize={24} /> },
  { labelKey: "contact.title", path: "/contact", icon: <ChatIcon fontSize={24} /> },
];

const adminItems = [
  { labelKey: "contact.adminTitle", path: "/admin/messages", icon: <ChatIcon fontSize={24} /> },
  { labelKey: "customerManager.title", path: "/admin/customers", icon: <UserCircleIcon fontSize={24} /> },
  { labelKey: "sidebar.orderPointsReview", path: "/admin/order-points", icon: <ShootingStarIcon fontSize={24} /> },
  { labelKey: "sidebar.rewardCatalog", path: "/admin/products", icon: <BoxIconLine fontSize={24} /> },
  { labelKey: "sidebar.productCategories", path: "/admin/categories", icon: <DashboardAltIcon fontSize={24} /> },
  { labelKey: "sidebar.redemptionRequests", path: "/admin/redemptions", icon: <SettingsAltIcon fontSize={24} /> },
];

const AppSidebar: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setIsMobileOpen } = useSidebar();
  const location = useLocation();
  const isOpen = isExpanded || isHovered || isMobileOpen;

  const renderItems = (items: typeof customerItems) => (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = location.pathname === item.path || (item.path === "/" && location.pathname === "/rewards");
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              aria-label={t(item.labelKey)}
              aria-current={active ? "page" : undefined}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "group menu-item",
                active ? "menu-item-active" : "menu-item-inactive",
                !isExpanded && !isHovered ? "xl:justify-center" : "xl:justify-start",
              )}
            >
              <span className={cn("menu-item-icon-size", active ? "menu-item-icon-active" : "menu-item-icon-inactive")}>{item.icon}</span>
              {isOpen && <span className="menu-item-text">{t(item.labelKey)}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={cn(
        "fixed inset-s-0 top-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white px-5 pt-24 text-gray-900 transition-all duration-300 ease-in-out xl:translate-x-0 xl:pt-0 xl:rtl:translate-x-0 dark:border-gray-800 dark:bg-gray-900",
        isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5",
        isMobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn("hidden py-8 xl:flex", !isExpanded && !isHovered ? "xl:justify-center" : "justify-start")}>
        <a href="https://www.bags-star.com" aria-label={t("brand.officialWebsite")} onClick={() => setIsMobileOpen(false)}>
          <BrandLogo compact={!isOpen} />
        </a>
      </div>

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6"><div className="flex flex-col gap-6">
          <div><h2 className={cn("mb-3 flex text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400", !isOpen ? "justify-center" : "justify-start")}>{isOpen ? t("sidebar.customerPortal") : <HorizontaLDots className="size-6" />}</h2>{renderItems(customerItems)}</div>
          {user?.role === "admin" && <div><h2 className={cn("mb-3 flex text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400", !isOpen ? "justify-center" : "justify-start")}>{isOpen ? t("sidebar.adminPreview") : <HorizontaLDots className="size-6" />}</h2>{renderItems(adminItems)}</div>}
        </div></nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
