import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function MainLayout() {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Purchase Bills", path: "/purchase-bills" },
    { label: "Products", path: "/products" },
    { label: "Suppliers", path: "/suppliers" },
    { label: "Customers", path: "/customers" },
    { label: "Stock", path: "/stock" },
    { label: "Production", path: "/production" },
    { label: "Sales", path: "/sales" },
    { label: "GST", path: "/gst" },
    { label: "Financial", path: "/financial" },
    { label: "Settings", path: "/settings" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "250px",
          background: "#1f2937",
          color: "#ffffff",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          Glisen ERP
        </h2>

        <hr />

        <nav
          style={{
            marginTop: "20px",
          }}
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: "block",
                padding: "10px 12px",
                marginBottom: "4px",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "6px",
                background: isActive ? "#374151" : "transparent",
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: "100%",
            marginTop: "30px",
            padding: "10px",
            border: "none",
            borderRadius: "6px",
            background: "#dc2626",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          padding: "20px",
          background: "#f5f5f5",
          boxSizing: "border-box",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}