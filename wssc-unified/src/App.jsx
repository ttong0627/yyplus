import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import Toast from './components/common/Toast';
import ConfirmModal from './components/common/ConfirmModal';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// ERP
import ClientsPage from './pages/erp/ClientsPage';
import UsersPage from './pages/erp/UsersPage';
import ItemsPage from './pages/erp/ItemsPage';
import SuppliersPage from './pages/erp/SuppliersPage';
import ContractsPage from './pages/erp/ContractsPage';
import PriceMappingPage from './pages/erp/PriceMappingPage';
import SchedulePage from './pages/erp/SchedulePage';
import RosterPage from './pages/erp/RosterPage';
import ItemMappingPage from './pages/erp/ItemMappingPage';
import OrderPage from './pages/erp/OrderPage';
import OrderSummaryPage from './pages/erp/OrderSummaryPage';
import PurchasePage from './pages/erp/PurchasePage';
import ReceiptPage from './pages/erp/ReceiptPage';
import WorkOrderPage from './pages/erp/WorkOrderPage';
import SettlementPage from './pages/erp/SettlementPage';
import PaymentPage from './pages/erp/PaymentPage';
import ClinicBillingPage from './pages/erp/ClinicBillingPage';
import SystemPage from './pages/erp/SystemPage';

// 패키지
import PkgCalendarPage from './pages/package/PkgCalendarPage';
import PkgRegisterPage from './pages/package/PkgRegisterPage';
import PkgMatrixPage from './pages/package/PkgMatrixPage';
import PkgPickingPage from './pages/package/PkgPickingPage';
import PkgPrintPage from './pages/package/PkgPrintPage';

// 배송
import DeliveryBlocksPage from './pages/delivery/DeliveryBlocksPage';
import DeliveryLoadingPage from './pages/delivery/DeliveryLoadingPage';
import DeliveryStatusPage from './pages/delivery/DeliveryStatusPage';
import DeliveryPortalPage from './pages/delivery/DeliveryPortalPage';
import DriverAppPage from './pages/delivery/DriverAppPage';

function ProtectedRoute({ children, roles }) {
  const { cUser } = useApp();
  if (!cUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(cUser.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { cUser } = useApp();
  if (!cUser) return <Navigate to="/login" replace />;
  if (cUser.role === 'driver') return <Navigate to="/delivery/driver" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppInner() {
  const { toast, confirm, showToast, hideConfirm } = useApp();
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RoleRedirect />} />

        <Route element={<ProtectedRoute roles={['admin','office','logistics','driver']}><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* ERP */}
          <Route path="/erp/clients"      element={<ProtectedRoute roles={['admin','office']}><ClientsPage /></ProtectedRoute>} />
          <Route path="/erp/users"        element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="/erp/items"        element={<ProtectedRoute roles={['admin','office']}><ItemsPage /></ProtectedRoute>} />
          <Route path="/erp/suppliers"    element={<ProtectedRoute roles={['admin','office']}><SuppliersPage /></ProtectedRoute>} />
          <Route path="/erp/contracts"    element={<ProtectedRoute roles={['admin','office']}><ContractsPage /></ProtectedRoute>} />
          <Route path="/erp/price-mapping" element={<ProtectedRoute roles={['admin','office']}><PriceMappingPage /></ProtectedRoute>} />
          <Route path="/erp/schedule"     element={<ProtectedRoute roles={['admin','office','logistics']}><SchedulePage /></ProtectedRoute>} />
          <Route path="/erp/roster"       element={<ProtectedRoute roles={['admin','office']}><RosterPage /></ProtectedRoute>} />
          <Route path="/erp/item-mapping" element={<ProtectedRoute roles={['admin','office']}><ItemMappingPage /></ProtectedRoute>} />
          <Route path="/erp/orders"       element={<ProtectedRoute roles={['admin','office']}><OrderPage /></ProtectedRoute>} />
          <Route path="/erp/order-summary" element={<ProtectedRoute roles={['admin','office']}><OrderSummaryPage /></ProtectedRoute>} />
          <Route path="/erp/purchase"     element={<ProtectedRoute roles={['admin','office']}><PurchasePage /></ProtectedRoute>} />
          <Route path="/erp/receipt"      element={<ProtectedRoute roles={['admin','logistics']}><ReceiptPage /></ProtectedRoute>} />
          <Route path="/erp/work-order"   element={<ProtectedRoute roles={['admin','office']}><WorkOrderPage /></ProtectedRoute>} />
          <Route path="/erp/settlement"   element={<ProtectedRoute roles={['admin','office']}><SettlementPage /></ProtectedRoute>} />
          <Route path="/erp/payment"         element={<ProtectedRoute roles={['admin','office']}><PaymentPage /></ProtectedRoute>} />
          <Route path="/erp/clinic-billing" element={<ProtectedRoute roles={['admin','office']}><ClinicBillingPage /></ProtectedRoute>} />
          <Route path="/erp/system"          element={<ProtectedRoute roles={['admin']}><SystemPage /></ProtectedRoute>} />

          {/* 패키지 */}
          <Route path="/package/calendar" element={<ProtectedRoute roles={['admin','office','logistics']}><PkgCalendarPage /></ProtectedRoute>} />
          <Route path="/package/register" element={<ProtectedRoute roles={['admin','office']}><PkgRegisterPage /></ProtectedRoute>} />
          <Route path="/package/matrix"   element={<ProtectedRoute roles={['admin','office','logistics']}><PkgMatrixPage /></ProtectedRoute>} />
          <Route path="/package/picking"  element={<ProtectedRoute roles={['admin','office','logistics']}><PkgPickingPage /></ProtectedRoute>} />
          <Route path="/package/print"    element={<ProtectedRoute roles={['admin','office','logistics']}><PkgPrintPage /></ProtectedRoute>} />

          {/* 배송 */}
          <Route path="/delivery/blocks"  element={<ProtectedRoute roles={['admin','logistics']}><DeliveryBlocksPage /></ProtectedRoute>} />
          <Route path="/delivery/loading" element={<ProtectedRoute roles={['admin','office','logistics']}><DeliveryLoadingPage /></ProtectedRoute>} />
          <Route path="/delivery/status"  element={<ProtectedRoute roles={['admin','office','logistics']}><DeliveryStatusPage /></ProtectedRoute>} />
          <Route path="/delivery/portal"  element={<ProtectedRoute roles={['admin','office']}><DeliveryPortalPage /></ProtectedRoute>} />
          <Route path="/delivery/driver"  element={<DriverAppPage />} />
        </Route>
      </Routes>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm.is && <ConfirmModal msg={confirm.msg} onOk={() => { confirm.onOk?.(); hideConfirm(); }} onCancel={hideConfirm} />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AppProvider>
  );
}
