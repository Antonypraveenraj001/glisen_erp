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

import ProductPage from "../pages/products/ProductPage";
import SupplierPage from "../pages/suppliers/SupplierPage";
import CustomerPage from "../pages/customers/CustomerPage";
import StockPage from "../pages/stock/StockPage";
import ProductionPage from "../pages/production/ProductionPage";
import FinalBillingPage from "../pages/finalBilling/FinalBillingPage";

import GSTReportPage from "../pages/gst/GSTReportPage";
import FinancialAnalyzerPage from "../pages/financial/FinancialAnalyzerPage";


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

        {/* PUBLIC ROUTES */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* PROTECTED ROUTES */}

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
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />


          <Route
            path="/dashboard"
            element={
              <DashboardPage />
            }
          />


          <Route
            path="/enquiries"
            element={
              <EnquiryList />
            }
          />


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


          <Route
            path="/products"
            element={
              <ProductPage />
            }
          />


          <Route
            path="/suppliers"
            element={
              <SupplierPage />
            }
          />


          <Route
            path="/customers"
            element={
              <CustomerPage />
            }
          />


          <Route
            path="/stock"
            element={
              <StockPage />
            }
          />


          <Route
            path="/production"
            element={
              <ProductionPage />
            }
          />


          <Route
            path="/final-billing"
            element={
              <FinalBillingPage />
            }
          />


          <Route
            path="/gst"
            element={
              <GSTReportPage />
            }
          />


          <Route
            path="/financial"
            element={
              <FinancialAnalyzerPage />
            }
          />

        </Route>


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