import { UserRoles } from '../services/userService';

/**
 * Route permission definitions
 * Maps routes to their required roles
 * Empty array = all authenticated users
 */
export const ROUTE_PERMISSIONS = {
  // Staff routes (Admin, Clinical, Support)
  DASHBOARD: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  PATIENTS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  APPOINTMENTS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  INVENTORY: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],

  // Clinical routes (Admin, Clinical)
  TREATMENTS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],

  // Phase 1 - Clinical Core (Admin + Clinical)
  ODONTOGRAM: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],
  PERIO_CHART: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],
  MEDICAL_HISTORY: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  CLINICAL_NOTES: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],
  CONSENT_FORMS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  PRESCRIPTIONS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],

  // Admin-only routes
  INVOICES: [UserRoles.SuperAdmin, UserRoles.Admin],
  SUBSCRIPTION: [UserRoles.SuperAdmin, UserRoles.Admin],
  USERS: [UserRoles.SuperAdmin, UserRoles.Admin],

  // Phase 2 - Financial (Admin only)
  INSURANCE: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.SupportStaff],
  ESTIMATES: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  CLAIMS: [UserRoles.SuperAdmin, UserRoles.Admin],
  STATEMENTS: [UserRoles.SuperAdmin, UserRoles.Admin],

  // Phase 3 - Portal, Documents & Audit
  DOCUMENTS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  PATIENT_PORTAL: [UserRoles.Patient],
  AUDIT_LOG: [UserRoles.SuperAdmin, UserRoles.Admin],

  // Phase 4 - Reporting, Calendar, Recall, Procedures, Settings
  REPORTS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  CALENDAR: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  RECALL: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  PROCEDURES: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],
  SETTINGS: [UserRoles.SuperAdmin, UserRoles.Admin],

  // Phase 5 - Multi-Branch, Scheduling, Procurement, Lab, Waitlist
  BRANCHES: [UserRoles.SuperAdmin, UserRoles.Admin],
  DENTIST_SCHEDULE: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],
  PURCHASE_ORDERS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.SupportStaff],
  LAB_ORDERS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],
  DIAGNOSTIC_REQUESTS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff],
  WAITLIST: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],

  // Phase 6 - Notifications, Communication, Reminders
  NOTIFICATION_CENTER: [], // all authenticated users
  COMMUNICATION_LOG: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  REMINDERS: [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.SupportStaff],

  // All authenticated users
  PROFILE: [], // Empty = everyone

  // SuperAdmin only
  TENANTS: [UserRoles.SuperAdmin],
};

/**
 * Route paths
 */
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  TREATMENTS: '/treatments',
  INVENTORY: '/inventory',
  INVOICES: '/invoices',
  SUBSCRIPTION: '/subscription',
  USERS: '/users',
  PROFILE: '/profile',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '*',

  // Phase 1 - Clinical Core
  ODONTOGRAM: '/odontogram',
  PERIO_CHART: '/perio-chart',
  MEDICAL_HISTORY: '/medical-history',
  CLINICAL_NOTES: '/clinical-notes',
  CONSENT_FORMS: '/consent-forms',
  PRESCRIPTIONS: '/prescriptions',

  // Phase 2 - Financial
  INSURANCE: '/insurance',
  ESTIMATES: '/estimates',
  CLAIMS: '/claims',
  STATEMENTS: '/statements',

  // Phase 3 - Portal, Documents & Audit
  DOCUMENTS: '/documents',
  PATIENT_PORTAL: '/portal',
  AUDIT_LOG: '/audit-log',

  // Phase 4 - Reporting, Calendar, Recall, Procedures, Settings
  REPORTS: '/reports',
  CALENDAR: '/calendar',
  RECALL: '/recall',
  PROCEDURES: '/procedures',
  SETTINGS: '/settings',

  // Phase 5 - Multi-Branch, Scheduling, Procurement, Lab, Waitlist
  BRANCHES: '/branches',
  DENTIST_SCHEDULE: '/dentist-schedule',
  PURCHASE_ORDERS: '/purchase-orders',
  LAB_ORDERS: '/lab-orders',
  DIAGNOSTIC_REQUESTS: '/diagnostic-requests',
  WAITLIST: '/waitlist',

  // Phase 6 - Notifications, Communication, Reminders
  NOTIFICATION_CENTER: '/notifications',
  COMMUNICATION_LOG: '/communication-log',
  REMINDERS: '/reminders',

  // SuperAdmin
  TENANTS: '/tenants',
};

/**
 * Check if a role has access to a specific route
 * @param {string} role - User role
 * @param {string} routeKey - Route key from ROUTE_PERMISSIONS
 * @returns {boolean} - Whether the role has access
 */
export const hasRouteAccess = (role, routeKey) => {
  const requiredRoles = ROUTE_PERMISSIONS[routeKey];
  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // No restrictions or everyone can access
  }
  return requiredRoles.includes(role);
};
