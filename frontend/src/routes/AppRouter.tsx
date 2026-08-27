import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";

import Login from "../pages/auth/Login";

import PurchaseBillList from "../pages/PurchaseBills/PurchaseBillList";
import PurchaseBillScanner from "../pages/PurchaseBills/PurchaseBillScanner";
import PurchaseBillReview from "../pages/PurchaseBills/PurchaseBillReview";
import PurchaseBillDetails from "../pages/PurchaseBills/PurchaseBillDetails";

import EnquiryList from "../pages/Enquiries/EnquiryList";

import ProformaPage from "../pages/Proformas/ProformaPage";

function DashboardPage() {
  return (
    <div>
      <h1>Glisen ERP Dashboard</h1>
      <p>
        Dashboard coming soon.
      </p>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            PUBLIC ROUTES
        ========================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* =========================
            PROTECTED ROUTES
        ========================== */}

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >

          {/* ROOT */}

          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          {/* DASHBOARD */}

          <Route
            path="/dashboard"
            element={
              <DashboardPage />
            }
          />

          {/* =========================
              ENQUIRIES
          ========================== */}

          <Route
            path="/enquiries"
            element={
              <EnquiryList />
            }
          />

          {/* =========================
              PROFORMAS
          ========================== */}

          <Route
            path="/proformas"
            element={
              <ProformaPage />
            }
          />

          <Route
            path="/proformas/new"
            element={
              <ProformaPage />
            }
          />

          <Route
            path="/proformas/:id"
            element={
              <ProformaPage />
            }
          />

          {/* =========================
              PURCHASE BILLS
          ========================== */}

          <Route
            path="/purchase-bills"
            element={
              <PurchaseBillList />
            }
          />

          <Route
            path="/purchase-bills/scan"
            element={
              <PurchaseBillScanner />
            }
          />

          <Route
            path="/purchase-bills/review"
            element={
              <PurchaseBillReview />
            }
          />

          <Route
            path="/purchase-bills/:id"
            element={
              <PurchaseBillDetails />
            }
          />

        </Route>

        {/* =========================
            404
        ========================== */}

        <Route
          path="*"
          element={
            <div>
              <h1>404</h1>
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