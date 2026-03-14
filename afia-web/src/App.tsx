import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { ToastContainer } from './components/ui'

// ── Auth Pages ──
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'

// ── Dashboard Pages ──
import BuyerDashboard from './pages/dashboard/BuyerDashboard'
import BuyerOrdersPage from './pages/dashboard/BuyerOrdersPage'
import VendorDashboard from './pages/dashboard/VendorDashboard'
import OrderDetailPage from './pages/dashboard/OrderDetailPage'

// ── Catalog Pages (Public) ──
import CatalogPage from './pages/catalog/CatalogPage'
import ProductDetailPage from './pages/catalog/ProductDetailPage'

// ── Checkout Pages ──
import CheckoutPage from './pages/checkout/CheckoutPage'

// ── Vendor Pages ──
import VendorProductsPage from './pages/vendor/VendorProductsPage'
import VendorOrdersPage from './pages/vendor/VendorOrdersPage'
import VendorSettingsPage from './pages/vendor/VendorSettingsPage'

// ── Existing Pages ──
import DesignShowcase from './pages/DesignShowcase'
import AdminDashboard from './components/admin/AdminDashboard'
import MfaSetup from './pages/auth/MfaSetup'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ══════ PUBLIC ROUTES ══════ */}
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="/showcase" element={<DesignShowcase />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/:productId" element={<ProductDetailPage />} />

            {/* ══════ AUTH ROUTES (Guest Only) ══════ */}
            <Route
              path="/login"
              element={
                <ProtectedRoute guestOnly>
                  <LoginPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <ProtectedRoute guestOnly>
                  <SignupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <ProtectedRoute guestOnly>
                  <ForgotPasswordPage />
                </ProtectedRoute>
              }
            />
            <Route path="/auth/verify" element={<VerifyEmailPage />} />

            {/* ══════ BUYER ROUTES ══════ */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['BUYER']}>
                  <BuyerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute allowedRoles={['BUYER']}>
                  <BuyerOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/order/:orderId"
              element={
                <ProtectedRoute allowedRoles={['BUYER']}>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout/:productId"
              element={
                <ProtectedRoute allowedRoles={['BUYER']}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />

            {/* ══════ VENDOR ROUTES ══════ */}
            <Route
              path="/vendor"
              element={
                <ProtectedRoute allowedRoles={['VENDOR']}>
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/products"
              element={
                <ProtectedRoute allowedRoles={['VENDOR']}>
                  <VendorProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/orders"
              element={
                <ProtectedRoute allowedRoles={['VENDOR']}>
                  <VendorOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/settings"
              element={
                <ProtectedRoute allowedRoles={['VENDOR']}>
                  <VendorSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* ══════ ADMIN ROUTES ══════ */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/mfa-setup"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                  <MfaSetup />
                </ProtectedRoute>
              }
            />

            {/* ══════ CATCH-ALL ══════ */}
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Routes>

          {/* Global Toast Notifications */}
          <ToastContainer />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
