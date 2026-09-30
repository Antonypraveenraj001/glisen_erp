import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute
  from "./ProtectedRoute";

import PermissionRoute
  from "./PermissionRoute";

import MainLayout
  from "../layouts/MainLayout";

import {
  useAuth,
} from "../context/AuthContext";

import Login
  from "../pages/auth/Login";

import DashboardPage
  from "../pages/dashboard/DashboardPage";

import PurchaseBillList
  from "../pages/PurchaseBills/PurchaseBillList";

import PurchaseBillScanner
  from "../pages/PurchaseBills/PurchaseBillScanner";

import PurchaseBillReview
  from "../pages/PurchaseBills/PurchaseBillReview";

import PurchaseBillDetails
  from "../pages/PurchaseBills/PurchaseBillDetails";

import EnquiryList
  from "../pages/Enquiries/EnquiryList";

import ProformaPage
  from "../pages/Proformas/ProformaPage";

import ProformaCreatePage
  from "../pages/Proformas/ProformaCreatePage";

import ProductPage
  from "../pages/products/ProductPage";

import SupplierPage
  from "../pages/suppliers/SupplierPage";

import CustomerPage
  from "../pages/customers/CustomerPage";

import StockPage
  from "../pages/stock/StockPage";

import ProductionPage
  from "../pages/production/ProductionPage";

import FinishedProductsPage
  from "../pages/finishedProducts/FinishedProductsPage";

import FinishedProductDetailPage
  from "../pages/finishedProducts/FinishedProductDetailPage";

import FinalBillingPage
  from "../pages/finalBilling/FinalBillingPage";

import GSTReportPage
  from "../pages/gst/GSTReportPage";

import ExpensePage
  from "../pages/expenses/ExpensePage";

import FinancialAnalyzerPage
  from "../pages/financial/FinancialAnalyzerPage";

import SettingsPage
  from "../pages/settings/SettingsPage";


/* ================================================================
   DEFAULT MODULE ORDER
================================================================ */

const DEFAULT_MODULE_ROUTES = [

  {
    permission:
      "dashboard.view",

    path:
      "/dashboard",
  },

  {
    permission:
      "enquiries.view",

    path:
      "/enquiries",
  },

  {
    permission:
      "proformas.view",

    path:
      "/proformas",
  },

  {
    permission:
      "purchase_bills.view",

    path:
      "/purchase-bills",
  },

  {
    permission:
      "products.view",

    path:
      "/products",
  },

  {
    permission:
      "suppliers.view",

    path:
      "/suppliers",
  },

  {
    permission:
      "customers.view",

    path:
      "/customers",
  },

  {
    permission:
      "stock.view",

    path:
      "/stock",
  },

  {
    permission:
      "production.view",

    path:
      "/production",
  },

  {
    permission:
      "finished_products.view",

    path:
      "/finished-products",
  },

  {
    permission:
      "final_billing.view",

    path:
      "/final-billing",
  },

  {
    permission:
      "gst.view",

    path:
      "/gst",
  },

  {
    permission:
      "expenses.view",

    path:
      "/expenses",
  },

  {
    permission:
      "financial.view",

    path:
      "/financial",
  },

  {
    permission:
      "settings.view",

    path:
      "/settings",
  },

];


/* ================================================================
   DEFAULT LANDING ROUTE
================================================================ */

function DefaultLandingRoute() {

  const {
    user,
  } =
    useAuth();


  if (
    !user
  ) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  if (
    user.role
    ===
    "Boss"
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );

  }


  const permissionSet =
    new Set(
      user.permissions
      ??
      []
    );


  const firstAllowedRoute =
    DEFAULT_MODULE_ROUTES.find(
      module =>
        permissionSet.has(
          module.permission
        )
    );


  if (
    firstAllowedRoute
  ) {

    return (
      <Navigate
        to={
          firstAllowedRoute.path
        }
        replace
      />
    );

  }


  return (
    <div
      style={{
        minHeight:
          "360px",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          "30px",
      }}
    >

      <div
        style={{
          width:
            "100%",

          maxWidth:
            "520px",

          padding:
            "30px",

          border:
            "1px solid #dce5f0",

          borderRadius:
            "16px",

          background:
            "#ffffff",

          textAlign:
            "center",

          boxShadow:
            "0 8px 24px rgba(31, 57, 101, 0.05)",
        }}
      >

        <h2
          style={{
            margin:
              0,

            color:
              "#233d61",

            fontSize:
              "18px",
          }}
        >
          No Module Access
        </h2>


        <p
          style={{
            margin:
              "9px 0 0",

            color:
              "#8191a8",

            fontSize:
              "11px",

            lineHeight:
              1.6,
          }}
        >
          Your role is currently not assigned to any ERP module.
          Please contact the Boss administrator.
        </p>

      </div>

    </div>
  );
}


/* ================================================================
   ROUTER
================================================================ */

export default function AppRouter() {

  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/login"
          element={
            <Login />
          }
        />


        <Route
          element={
            <ProtectedRoute>

              <MainLayout />

            </ProtectedRoute>
          }
        >

          <Route
            path="/"
            element={
              <DefaultLandingRoute />
            }
          />


          {/* DASHBOARD */}

          <Route
            path="/dashboard"
            element={
              <PermissionRoute
                permission="dashboard.view"
              >

                <DashboardPage />

              </PermissionRoute>
            }
          />


          {/* ENQUIRIES */}

          <Route
            path="/enquiries"
            element={
              <PermissionRoute
                permission="enquiries.view"
              >

                <EnquiryList />

              </PermissionRoute>
            }
          />


          {/* PROFORMAS */}

          <Route
            path="/proformas"
            element={
              <PermissionRoute
                permission="proformas.view"
              >

                <ProformaPage
                  key="proforma-list"
                />

              </PermissionRoute>
            }
          />


          <Route
            path="/proformas/new"
            element={
              <PermissionRoute
                permission="proformas.create"
              >

                <ProformaCreatePage />

              </PermissionRoute>
            }
          />


          <Route
            path="/proformas/:id"
            element={
              <PermissionRoute
                permission="proformas.view"
              >

                <ProformaPage
                  key="proforma-details"
                />

              </PermissionRoute>
            }
          />


          {/* PURCHASE BILLS */}

          <Route
            path="/purchase-bills"
            element={
              <PermissionRoute
                permission="purchase_bills.view"
              >

                <PurchaseBillList />

              </PermissionRoute>
            }
          />


          <Route
            path="/purchase-bills/scan"
            element={
              <PermissionRoute
                permission="purchase_bills.ai_scan"
              >

                <PurchaseBillScanner />

              </PermissionRoute>
            }
          />


          <Route
            path="/purchase-bills/review"
            element={
              <PermissionRoute
                permission="purchase_bills.create"
              >

                <PurchaseBillReview />

              </PermissionRoute>
            }
          />


          <Route
            path="/purchase-bills/:id"
            element={
              <PermissionRoute
                permission="purchase_bills.view"
              >

                <PurchaseBillDetails />

              </PermissionRoute>
            }
          />


          {/* PRODUCTS */}

          <Route
            path="/products"
            element={
              <PermissionRoute
                permission="products.view"
              >

                <ProductPage />

              </PermissionRoute>
            }
          />


          {/* SUPPLIERS */}

          <Route
            path="/suppliers"
            element={
              <PermissionRoute
                permission="suppliers.view"
              >

                <SupplierPage />

              </PermissionRoute>
            }
          />


          {/* CUSTOMERS */}

          <Route
            path="/customers"
            element={
              <PermissionRoute
                permission="customers.view"
              >

                <CustomerPage />

              </PermissionRoute>
            }
          />


          {/* STOCK */}

          <Route
            path="/stock"
            element={
              <PermissionRoute
                permission="stock.view"
              >

                <StockPage />

              </PermissionRoute>
            }
          />


          {/* PRODUCTION */}

          <Route
            path="/production"
            element={
              <PermissionRoute
                permission="production.view"
              >

                <ProductionPage />

              </PermissionRoute>
            }
          />


          {/* FINISHED PRODUCTS */}

          <Route
            path="/finished-products"
            element={
              <FinishedProductsPage />
            }
          />


          <Route
            path="/finished-products/:id"
            element={
              <FinishedProductDetailPage />
            }
          />


          {/* FINAL BILLING */}

          <Route
            path="/final-billing"
            element={
              <FinalBillingPage />
            }
          />


          {/* GST */}

          <Route
            path="/gst"
            element={
              <GSTReportPage />
            }
          />


          {/* EXPENSES */}

          <Route
            path="/expenses"
            element={
              <ExpensePage />
            }
          />


          {/* FINANCIAL */}

          <Route
            path="/financial"
            element={
              <FinancialAnalyzerPage />
            }
          />


          {/* SETTINGS */}

          <Route
            path="/settings"
            element={
              <SettingsPage />
            }
          />

        </Route>


        <Route
          path="*"
          element={
            <div>

              <h1>
                404
              </h1>

              <p>
                Page Not Found
              </p>

            </div>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}