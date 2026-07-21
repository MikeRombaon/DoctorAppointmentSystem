import { UserRoles } from '../services/userService';

// Role shorthand arrays (mirrors MainLayout.jsx NAV_GROUPS)
const ALL_STAFF   = [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff];
const ADMIN_UP    = [UserRoles.SuperAdmin, UserRoles.Admin];
const CLINICAL_UP = [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff];
const OPS_UP      = [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.SupportStaff];

/**
 * Route permission definitions.
 * SuperAdmin is explicitly included in every staff/admin route.
 * Patient-exclusive routes list ONLY UserRoles.Patient.
 * Empty array = all authenticated users.
 */
export const ROUTE_PERMISSIONS = {

  // Overview
  DASHBOARD:       ALL_STAFF,
  ADMIN_DASHBOARD: ADMIN_UP,

  // Patients & Appointments
  PATIENTS:     ALL_STAFF,
  APPOINTMENTS: ALL_STAFF,
  CALENDAR:     ALL_STAFF,
  WAITLIST:     ALL_STAFF,
  RECALL:       ALL_STAFF,

  // Clinical
  TREATMENTS:          CLINICAL_UP,
  DIAGNOSIS:           CLINICAL_UP,
  VITALS:              CLINICAL_UP,
  MEDICAL_HISTORY:     ALL_STAFF,
  CLINICAL_NOTES:      CLINICAL_UP,
  CONSENT_FORMS:       ALL_STAFF,
  PRESCRIPTIONS:       CLINICAL_UP,
  PROCEDURES:          CLINICAL_UP,
  DIAGNOSTIC_REQUESTS: CLINICAL_UP,
  LAB_ORDERS:          CLINICAL_UP,

  // Billing
  INVOICES:     ADMIN_UP,
  ESTIMATES:    ALL_STAFF,
  INSURANCE:    OPS_UP,
  CLAIMS:       ADMIN_UP,
  STATEMENTS:   ADMIN_UP,
  SUBSCRIPTION: ADMIN_UP,

  // Operations
  INVENTORY:        ALL_STAFF,
  PURCHASE_ORDERS:  OPS_UP,
  DENTIST_SCHEDULE: CLINICAL_UP,

  // Clinic Management
  BRANCHES: ADMIN_UP,
  USERS:    ADMIN_UP,

  // Communication — Notifications accessible to all roles including Patient
  NOTIFICATION_CENTER: [...ALL_STAFF, UserRoles.Patient],
  COMMUNICATION_LOG:   ALL_STAFF,
  REMINDERS:           OPS_UP,

  // Reports & Analytics
  REPORTS:   ALL_STAFF,
  DOCUMENTS: ALL_STAFF,
  AUDIT_LOG: ADMIN_UP,
  SETTINGS:  ADMIN_UP,

  // Patient Portal (Patient role ONLY)
  PATIENT_PORTAL: [UserRoles.Patient],

  // SuperAdmin only
  TENANTS: [UserRoles.SuperAdmin],

  // All authenticated users
  PROFILE: [],
};

/**
 * Route paths
 */
export const ROUTES = {
  LOGIN:        '/login',
  DASHBOARD:    '/dashboard',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND:    '*',
  PROFILE:      '/profile',

  // Overview
  ADMIN_DASHBOARD: '/admin-dashboard',

  // Patients & Appointments
  PATIENTS:     '/patients',
  APPOINTMENTS: '/appointments',
  CALENDAR:     '/calendar',
  WAITLIST:     '/waitlist',
  RECALL:       '/recall',

  // Clinical
  TREATMENTS:          '/treatments',
  DIAGNOSIS:           '/diagnosis',
  VITALS:              '/vitals',
  MEDICAL_HISTORY:     '/medical-history',
  CLINICAL_NOTES:      '/clinical-notes',
  CONSENT_FORMS:       '/consent-forms',
  PRESCRIPTIONS:       '/prescriptions',
  PROCEDURES:          '/procedures',
  DIAGNOSTIC_REQUESTS: '/diagnostic-requests',
  LAB_ORDERS:          '/lab-orders',

  // Billing
  INVOICES:     '/invoices',
  ESTIMATES:    '/estimates',
  INSURANCE:    '/insurance',
  CLAIMS:       '/claims',
  STATEMENTS:   '/statements',
  SUBSCRIPTION: '/subscription',

  // Operations
  INVENTORY:        '/inventory',
  PURCHASE_ORDERS:  '/purchase-orders',
  DENTIST_SCHEDULE: '/dentist-schedule',

  // Clinic Management
  BRANCHES: '/branches',
  USERS:    '/users',

  // Communication
  NOTIFICATION_CENTER: '/notifications',
  COMMUNICATION_LOG:   '/communication-log',
  REMINDERS:           '/reminders',

  // Reports & Analytics
  REPORTS:   '/reports',
  DOCUMENTS: '/documents',
  AUDIT_LOG: '/audit-log',
  SETTINGS:  '/settings',

  // Patient Portal
  PATIENT_PORTAL: '/portal',

  // SuperAdmin
  TENANTS: '/tenants',
};

/**
 * Check if a role has access to a specific route.
 * @param {string} role     - User role string
 * @param {string} routeKey - Key from ROUTE_PERMISSIONS
 * @returns {boolean}
 */
export const hasRouteAccess = (role, routeKey) => {
  const requiredRoles = ROUTE_PERMISSIONS[routeKey];
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(role);
};
