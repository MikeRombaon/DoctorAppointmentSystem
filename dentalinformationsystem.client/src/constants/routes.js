import { UserRoles } from '../services/userService';

/**
 * Route permission definitions
 * Maps routes to their required roles
 * Empty array = all authenticated users
 */
export const ROUTE_PERMISSIONS = {
  // Staff routes (Admin, Clinical, Support)
  DASHBOARD: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  PATIENTS: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  APPOINTMENTS: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  INVENTORY: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],

  // Clinical routes (Admin, Clinical)
  TREATMENTS: [UserRoles.Admin, UserRoles.ClinicalStaff],

  // Phase 1 - Clinical Core (Admin + Clinical)
  ODONTOGRAM: [UserRoles.Admin, UserRoles.ClinicalStaff],
  PERIO_CHART: [UserRoles.Admin, UserRoles.ClinicalStaff],
  MEDICAL_HISTORY: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  CLINICAL_NOTES: [UserRoles.Admin, UserRoles.ClinicalStaff],
  CONSENT_FORMS: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  PRESCRIPTIONS: [UserRoles.Admin, UserRoles.ClinicalStaff],

  // Admin-only routes
  INVOICES: [UserRoles.Admin],
  USERS: [UserRoles.Admin],

  // Phase 2 - Financial (Admin only)
  INSURANCE: [UserRoles.Admin, UserRoles.SupportStaff],
  ESTIMATES: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  CLAIMS: [UserRoles.Admin],
  STATEMENTS: [UserRoles.Admin],

  // Phase 3 - Portal, Documents & Audit
  DOCUMENTS: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  PATIENT_PORTAL: [UserRoles.Patient],
  AUDIT_LOG: [UserRoles.Admin],

  // Phase 4 - Reporting, Calendar, Recall, Procedures, Settings
  REPORTS: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  CALENDAR: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  RECALL: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  PROCEDURES: [UserRoles.Admin, UserRoles.ClinicalStaff],
  SETTINGS: [UserRoles.Admin],

  // Phase 5 - Multi-Branch, Scheduling, Procurement, Lab, Waitlist
  BRANCHES: [UserRoles.Admin],
  DENTIST_SCHEDULE: [UserRoles.Admin, UserRoles.ClinicalStaff],
  PURCHASE_ORDERS: [UserRoles.Admin, UserRoles.SupportStaff],
  LAB_ORDERS: [UserRoles.Admin, UserRoles.ClinicalStaff],
  WAITLIST: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],

  // Phase 6 - Notifications, Communication, Reminders
  NOTIFICATION_CENTER: [], // all authenticated users
  COMMUNICATION_LOG: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff],
  REMINDERS: [UserRoles.Admin, UserRoles.SupportStaff],

  // All authenticated users
  PROFILE: [], // Empty = everyone
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
  WAITLIST: '/waitlist',

  // Phase 6 - Notifications, Communication, Reminders
  NOTIFICATION_CENTER: '/notifications',
  COMMUNICATION_LOG: '/communication-log',
  REMINDERS: '/reminders',
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
