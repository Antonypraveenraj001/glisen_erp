import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";

import Login from "../pages/auth/Login";

import DashboardPage from "../pages/dashboard/DashboardPage";

import PurchaseBillList from "../pages/PurchaseBills/PurchaseBillList";
import PurchaseBillScanner from "../pages/PurchaseBills/PurchaseBillScanner";
import PurchaseBillReview from "../pages/PurchaseBills/PurchaseBillReview";
import PurchaseBillDetails from "../pages/PurchaseBills/PurchaseBillDetails";

import EnquiryList from "../pages/Enquiries/EnquiryList";

import ProformaPage from "../pages/Proformas/ProformaPage";
import ProformaCreatePage from "../pages/Proformas/ProformaCreatePage";

import ProductPage from "../pages/products/ProductPage";
import SupplierPage from "../pages/suppliers/SupplierPage";
import CustomerPage from "../pages/customers/CustomerPage";
import StockPage from "../pages/stock/StockPage";

import ProductionPage from "../pages/production/ProductionPage";

import FinishedProductsPage from "../pages/finishedProducts/FinishedProductsPage";
import FinishedProductDetailPage from "../pages/finishedProducts/FinishedProductDetailPage";

import FinalBillingPage from "../pages/finalBilling/FinalBillingPage";

import GSTReportPage from "../pages/gst/GSTReportPage";
import ExpensePage from "../pages/expenses/ExpensePage";
import FinancialAnalyzerPage from "../pages/financial/FinancialAnalyzerPage";


export default function AppRouter() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =====================================================
            PUBLIC
        ====================================================== */}

        <Route
          path="/login"
          element={
            <Login />
          }
        />


        {/* =====================================================
            PROTECTED
        ====================================================== */}

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


          {/* DASHBOARD */}

          <Route
            path="/dashboard"
            element={
              <DashboardPage />
            }
          />


          {/* ENQUIRIES */}

          <Route
            path="/enquiries"
            element={
              <EnquiryList />
            }
          />


          {/* PROFORMAS */}

          <Route
            path="/proformas"
            element={
              <ProformaPage
                key="proforma-list"
              />
            }
          />


          <Route
            path="/proformas/new"
            element={
              <ProformaCreatePage />
            }
          />


          <Route
            path="/proformas/:id"
            element={
              <ProformaPage
                key="proforma-details"
              />
            }
          />


          {/* PURCHASE BILLS */}

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


          {/* PRODUCTS */}

          <Route
            path="/products"
            element={
              <ProductPage />
            }
          />


          {/* SUPPLIERS */}

          <Route
            path="/suppliers"
            element={
              <SupplierPage />
            }
          />


          {/* CUSTOMERS */}

          <Route
            path="/customers"
            element={
              <CustomerPage />
            }
          />


          {/* STOCK */}

          <Route
            path="/stock"
            element={
              <StockPage />
            }
          />


          {/* PRODUCTION */}

          <Route
            path="/production"
            element={
              <ProductionPage />
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

        </Route>


        {/* 404 */}

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