import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAdmin } from "./AdminContext";
import {
  FiGrid, FiShoppingBag, FiPackage, FiUsers, FiTag, FiGift,
  FiMenu, FiBell, FiLogOut, FiChevronRight, FiX, FiTruck,
  FiRotateCcw, FiAward, FiDroplet, FiMaximize2,
  FiChevronDown, FiChevronUp, FiPlus, FiBox, FiNavigation, FiBriefcase,
  FiCheckCircle, FiCreditCard, FiStar, FiImage, FiSettings,
} from "react-icons/fi";

const NAV = [
  { href: "/", label: "Dashboard", icon: FiGrid, exact: true },
  {
    label: "Orders", icon: FiShoppingBag,
    children: [
      { href: "/orders",                label: "All Orders",            icon: FiShoppingBag },
      { href: "/process-orders",        label: "Process Orders",        icon: FiBox },
      { href: "/assigned-for-delivery", label: "Assigned For Delivery", icon: FiNavigation },
      { href: "/shipped-orders",        label: "Shipped Orders",        icon: FiTruck },
      { href: "/delivered-orders",      label: "Delivered Orders",      icon: FiCheckCircle },
      { href: "/return-orders",         label: "Return Orders",         icon: FiRotateCcw },
      { href: "/pending-refunds",       label: "Pending Refunds",       icon: FiRotateCcw },
      { href: "/online-transactions",   label: "Online Transactions",   icon: FiCreditCard },
    ],
  },
  {
    label: "Products", icon: FiPackage,
    children: [
      { href: "/products",        label: "All Products", icon: FiPackage },
      { href: "/products/create", label: "Add Product",  icon: FiPlus },
      { href: "/categories",      label: "Categories",   icon: FiTag },
      { href: "/brands",          label: "Brands",       icon: FiAward },
      { href: "/colors",          label: "Colors",       icon: FiDroplet },
      { href: "/sizes",           label: "Sizes",        icon: FiMaximize2 },
      { href: "/stock",           label: "Stock",        icon: FiBox },
    ],
  },
  {
    label: "Reviews", icon: FiStar,
    children: [
      { href: "/reviews",     label: "Product Reviews", icon: FiStar },
      { href: "/gmb-reviews", label: "Google Reviews",  icon: FiStar },
    ],
  },
  { href: "/customers",    label: "Customers",    icon: FiUsers },
  { href: "/distributors", label: "Distributors", icon: FiBriefcase },
  { href: "/coupons",      label: "Coupons",      icon: FiGift },
  { href: "/homepage-banners", label: "Homepage Banners", icon: FiImage },
  { href: "/settings",         label: "Theme Settings",   icon: FiSettings },
];

function NavGroup({ item, onClose }) {
  const router = useRouter();
  const isChildActive = item.children?.some(
    (c) => router.pathname === c.href || router.pathname.startsWith(c.href + "/")
  );
  const [open, setOpen] = useState(isChildActive);
  const Icon = item.icon;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left
          ${isChildActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/80 hover:text-white"}`}
      >
        <Icon size={17} className={isChildActive ? "text-white" : "text-slate-500 group-hover:text-white transition-colors"} />
        <span className="flex-1">{item.label}</span>
        {open ? <FiChevronUp size={13} className="opacity-60" /> : <FiChevronDown size={13} className="opacity-60" />}
      </button>
      {open && (
        <div className="ml-3 mt-0.5 pl-3 border-l border-slate-700 space-y-0.5">
          {item.children.map((child) => {
            const active =
              router.pathname === child.href ||
              (router.pathname.startsWith(child.href + "/") && child.href !== "/products");
            const CIcon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                  ${active
                    ? "bg-[#203466] text-white shadow-md shadow-[#203466]/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"}`}
              >
                <CIcon size={14} className={active ? "text-white" : "text-slate-500 group-hover:text-white"} />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children, title = "Dashboard" }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { adminUser, logout } = useAdmin();

  const isActive = ({ href, exact }) =>
    exact ? router.pathname === href : router.pathname.startsWith(href);

  const avatar = adminUser?.name?.[0]?.toUpperCase() || "M";
  const handleLogout = () => { logout(); router.replace("/login"); };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-slate-950 border-r border-slate-800
        transition-transform duration-300 lg:static lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Craft & Weft" className="h-9 w-auto shrink-0" />
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide">Admin Dashboard</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-500 hover:text-white">
            <FiX size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest px-3 mb-3">Menu</p>
          {NAV.map((item, idx) => {
            if (item.children) {
              return <NavGroup key={idx} item={item} onClose={() => setOpen(false)} />;
            }
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? "bg-[#203466] text-white shadow-md shadow-[#203466]/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"}`}>
                <Icon size={17} className={active ? "text-white" : "text-slate-500 group-hover:text-white transition-colors"} />
                <span className="flex-1">{item.label}</span>
                {active && <FiChevronRight size={13} className="opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#203466] to-[#152548] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{adminUser?.name || "Admin"}</p>
              <p className="text-slate-500 text-[10px] mt-0.5 capitalize">{adminUser?.role || "admin"}</p>
            </div>
            <span className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all">
            <FiLogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <FiMenu size={20} />
            </button>
            <div>
              <h1 className="text-gray-900 font-bold text-base leading-none">{title}</h1>
              <p className="text-gray-400 text-[11px] mt-0.5">Craft &amp; Weft — Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <FiBell size={18} />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-100 ml-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#203466] to-[#152548] flex items-center justify-center text-white text-xs font-bold">
                {avatar}
              </div>
              <div className="hidden sm:block">
                <p className="text-gray-800 text-sm font-semibold leading-none">{adminUser?.name}</p>
                <p className="text-gray-400 text-[11px] mt-0.5 capitalize">{adminUser?.role}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
