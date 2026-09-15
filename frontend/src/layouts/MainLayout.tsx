import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileBarChart,
  FileText,
  Gauge,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
  WalletCards,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";


interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}


function getInitials(
  fullName?: string,
  username?: string
) {
  const source =
    fullName?.trim() ||
    username?.trim() ||
    "User";

  const parts = source
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


export default function MainLayout() {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();


  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <Gauge size={17} />,
    },
    {
      label: "Enquiries",
      path: "/enquiries",
      icon: <ClipboardList size={17} />,
    },
    {
      label: "Purchase Bills",
      path: "/purchase-bills",
      icon: <ReceiptText size={17} />,
    },
    {
      label: "Products",
      path: "/products",
      icon: <Package size={17} />,
    },
    {
      label: "Suppliers",
      path: "/suppliers",
      icon: <ShoppingCart size={17} />,
    },
    {
      label: "Customers",
      path: "/customers",
      icon: <Users size={17} />,
    },
    {
      label: "Stock",
      path: "/stock",
      icon: <Boxes size={17} />,
    },
    {
      label: "Production",
      path: "/production",
      icon: <BarChart3 size={17} />,
    },
    {
      label: "Proformas",
      path: "/proformas",
      icon: <FileText size={17} />,
    },
    {
      label: "GST",
      path: "/gst",
      icon: <FileBarChart size={17} />,
    },
    {
      label: "Financial",
      path: "/financial",
      icon: <WalletCards size={17} />,
    },
    {
      label: "Settings",
      path: "/settings",
      icon: <Settings size={17} />,
    },
  ];


  const handleLogout = () => {
    logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };


  const displayName =
    user?.full_name?.trim() ||
    user?.username ||
    "ERP User";

  const displayRole =
    user?.role ||
    "Authenticated User";

  const initials =
    getInitials(
      user?.full_name,
      user?.username
    );


  return (
    <div className="erp-shell">

      {/* =========================
          SIDEBAR
      ========================== */}

      <aside className="erp-sidebar">

        <div className="erp-brand">
          <div className="erp-brand-mark">
            G
          </div>

          <div>
            <div className="erp-brand-name">
              Glisen
            </div>

            <div className="erp-brand-subtitle">
              ERP SYSTEM
            </div>
          </div>
        </div>


        <div className="erp-sidebar-section">

          <div className="erp-sidebar-label">
            WORKSPACE
          </div>

          <nav className="erp-navigation">

            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `erp-nav-link ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <span className="erp-nav-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </NavLink>
            ))}

          </nav>
        </div>


        <div className="erp-sidebar-bottom">

          <button
            type="button"
            onClick={handleLogout}
            className="erp-logout-button"
          >
            <LogOut size={17} />

            Logout
          </button>

        </div>
      </aside>


      {/* =========================
          CONTENT
      ========================== */}

      <div className="erp-content-shell">

        <header className="erp-topbar">

          <div>
            <div className="erp-topbar-title">
              Glisen ERP
            </div>

            <div className="erp-topbar-subtitle">
              Manufacturing Management System
            </div>
          </div>


          <div className="erp-user-area">

            <div className="erp-user-avatar">
              {initials}
            </div>

            <div className="erp-user-details">

              <div className="erp-user-name">
                {displayName}
              </div>

              <div className="erp-user-role">
                {displayRole}
              </div>

            </div>
          </div>

        </header>


        <main className="erp-main-content">
          <Outlet />
        </main>

      </div>
    </div>
  );
}