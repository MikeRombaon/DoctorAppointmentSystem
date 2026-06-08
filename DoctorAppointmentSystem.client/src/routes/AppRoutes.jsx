import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PrivateRoute from '../components/PrivateRoute';
import { ROUTE_PERMISSIONS, ROUTES } from '../constants/routes';
import Login from '../pages/Login';
import RegisterTenant from '../pages/RegisterTenant';
import RenewSubscription from '../pages/RenewSubscription';
import TenantManagement from '../pages/TenantManagement';
import Dashboard from '../pages/Dashboard';
import Patients from '../pages/Patients';
import Appointments from '../pages/Appointments';
import Treatments from '../pages/Treatments';
import Inventory from '../pages/Inventory';
import Invoices from '../pages/Invoices';
import Users from '../pages/Users';
import Profile from '../pages/Profile';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';
// Phase 1 - Clinical Core
import Odontogram from '../pages/Odontogram';
import PerioChart from '../pages/PerioChart';
import MedicalHistory from '../pages/MedicalHistory';
import ClinicalNotes from '../pages/ClinicalNotes';
import ConsentForms from '../pages/ConsentForms';
import Prescriptions from '../pages/Prescriptions';
// Phase 2 - Financial
import Insurance from '../pages/Insurance';
import Subscription from '../pages/Subscription';
import Estimates from '../pages/Estimates';
import Claims from '../pages/Claims';
import Statements from '../pages/Statements';
// Phase 3 - Portal, Documents & Audit
import Documents from '../pages/Documents';
import PatientPortal from '../pages/PatientPortal';
import AuditLogPage from '../pages/AuditLog';
// Phase 4 - Reports, Calendar, Recall, Procedures, Settings
import Reports from '../pages/Reports';
import Calendar from '../pages/Calendar';
import Recall from '../pages/Recall';
import Procedures from '../pages/Procedures';
import SettingsPage from '../pages/Settings';
// Phase 5 - Branches, Scheduling, Procurement, Lab, Waitlist
import Branches from '../pages/Branches';
import DentistSchedule from '../pages/DentistSchedule';
import PurchaseOrders from '../pages/PurchaseOrders';
import LabOrders from '../pages/LabOrders';
import DiagnosticRequests from '../pages/DiagnosticRequests';
import Waitlist from '../pages/Waitlist';
// Phase 6 - Notifications, Communication, Reminders
import NotificationCenter from '../pages/NotificationCenter';
import CommunicationLog from '../pages/CommunicationLog';
import Reminders from '../pages/Reminders';

const AppRoutes = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route 
        path={ROUTES.LOGIN}
        element={isAuthenticated ? <Navigate to={user?.role === 'Patient' ? ROUTES.PATIENT_PORTAL : ROUTES.DASHBOARD} replace /> : <Login />} 
      />
      <Route path="/register-tenant" element={<RegisterTenant />} />
      <Route path="/renew-subscription" element={<RenewSubscription />} />

      {/* Staff-accessible routes (Admin, Clinical, Support) */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.DASHBOARD} />}>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.PATIENTS} />}>
        <Route path={ROUTES.PATIENTS} element={<Patients />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.APPOINTMENTS} />}>
        <Route path={ROUTES.APPOINTMENTS} element={<Appointments />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.INVENTORY} />}>
        <Route path={ROUTES.INVENTORY} element={<Inventory />} />
      </Route>

      {/* Clinical staff routes (Admin, Clinical) */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.TREATMENTS} />}>
        <Route path={ROUTES.TREATMENTS} element={<Treatments />} />
      </Route>

      {/* Phase 1 - Clinical Core */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.ODONTOGRAM} />}>
        <Route path={ROUTES.ODONTOGRAM} element={<Odontogram />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.PERIO_CHART} />}>
        <Route path={ROUTES.PERIO_CHART} element={<PerioChart />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.MEDICAL_HISTORY} />}>
        <Route path={ROUTES.MEDICAL_HISTORY} element={<MedicalHistory />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.CLINICAL_NOTES} />}>
        <Route path={ROUTES.CLINICAL_NOTES} element={<ClinicalNotes />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.CONSENT_FORMS} />}>
        <Route path={ROUTES.CONSENT_FORMS} element={<ConsentForms />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.PRESCRIPTIONS} />}>
        <Route path={ROUTES.PRESCRIPTIONS} element={<Prescriptions />} />
      </Route>

      {/* Phase 2 - Financial */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.SUBSCRIPTION} />}>
        <Route path={ROUTES.SUBSCRIPTION} element={<Subscription />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.INSURANCE} />}>
        <Route path={ROUTES.INSURANCE} element={<Insurance />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.ESTIMATES} />}>
        <Route path={ROUTES.ESTIMATES} element={<Estimates />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.CLAIMS} />}>
        <Route path={ROUTES.CLAIMS} element={<Claims />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.STATEMENTS} />}>
        <Route path={ROUTES.STATEMENTS} element={<Statements />} />
      </Route>

      {/* Admin-only routes */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.INVOICES} />}>
        <Route path={ROUTES.INVOICES} element={<Invoices />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.USERS} />}>
        <Route path={ROUTES.USERS} element={<Users />} />
      </Route>

      {/* All authenticated users (including patients) */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.PROFILE} />}>
        <Route path={ROUTES.PROFILE} element={<Profile />} />
      </Route>

      {/* Phase 3 - Patient Portal (Patient role only) */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.PATIENT_PORTAL} />}>
        <Route path={ROUTES.PATIENT_PORTAL} element={<PatientPortal />} />
      </Route>

      {/* Phase 3 - Documents (staff) */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.DOCUMENTS} />}>
        <Route path={ROUTES.DOCUMENTS} element={<Documents />} />
      </Route>

      {/* Phase 3 - Audit Log (admin only) */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.AUDIT_LOG} />}>
        <Route path={ROUTES.AUDIT_LOG} element={<AuditLogPage />} />
      </Route>

      {/* Phase 4 - Reports, Calendar, Recall, Procedures, Settings */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.REPORTS} />}>
        <Route path={ROUTES.REPORTS} element={<Reports />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.CALENDAR} />}>
        <Route path={ROUTES.CALENDAR} element={<Calendar />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.RECALL} />}>
        <Route path={ROUTES.RECALL} element={<Recall />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.PROCEDURES} />}>
        <Route path={ROUTES.PROCEDURES} element={<Procedures />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.SETTINGS} />}>
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
      </Route>

      {/* Phase 5 - Branches, Scheduling, Procurement, Lab, Waitlist */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.BRANCHES} />}>
        <Route path={ROUTES.BRANCHES} element={<Branches />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.DENTIST_SCHEDULE} />}>
        <Route path={ROUTES.DENTIST_SCHEDULE} element={<DentistSchedule />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.PURCHASE_ORDERS} />}>
        <Route path={ROUTES.PURCHASE_ORDERS} element={<PurchaseOrders />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.LAB_ORDERS} />}>
        <Route path={ROUTES.LAB_ORDERS} element={<LabOrders />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.DIAGNOSTIC_REQUESTS} />}>
        <Route path={ROUTES.DIAGNOSTIC_REQUESTS} element={<DiagnosticRequests />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.WAITLIST} />}>
        <Route path={ROUTES.WAITLIST} element={<Waitlist />} />
      </Route>

      {/* Phase 6 - Notifications, Communication, Reminders */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.NOTIFICATION_CENTER} />}>
        <Route path={ROUTES.NOTIFICATION_CENTER} element={<NotificationCenter />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.COMMUNICATION_LOG} />}>
        <Route path={ROUTES.COMMUNICATION_LOG} element={<CommunicationLog />} />
      </Route>

      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.REMINDERS} />}>
        <Route path={ROUTES.REMINDERS} element={<Reminders />} />
      </Route>

      {/* All authenticated users (including patients) */}
      <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />

      {/* SuperAdmin */}
      <Route element={<PrivateRoute roles={ROUTE_PERMISSIONS.TENANTS} />}>
        <Route path={ROUTES.TENANTS} element={<TenantManagement />} />
      </Route>

      <Route path="/" element={<Navigate to={user?.role === 'Patient' ? ROUTES.PATIENT_PORTAL : ROUTES.DASHBOARD} />} />
      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
