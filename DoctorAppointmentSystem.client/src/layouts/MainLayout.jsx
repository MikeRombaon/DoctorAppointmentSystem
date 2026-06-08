/* eslint-disable react-hooks/static-components */
import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  Divider,
  Tooltip,
  Badge,
  Button,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  MedicalServices as TreatmentIcon,
  Inventory as InventoryIcon,
  Receipt as InvoiceIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Grain as DiagnosisIcon,
  Timeline as VitalsIcon,
  Assignment as MedHistIcon,
  Note as NoteIcon,
  Approval as ConsentIcon,
  Medication as RxIcon,
  HealthAndSafety as InsuranceIcon,
  RequestQuote as EstimateIcon,
  Article as ClaimIcon,
  AccountBalance as StatementsIcon,
  AttachFile as DocumentsIcon,
  ManageSearch as AuditIcon,
  Home as HomeIcon,
  Analytics as ReportsIcon,
  CalendarViewMonth as CalViewIcon,
  EventRepeat as RecallIcon,
  Tune as ProceduresIcon,
  Settings as SettingsIcon,
  Store as BranchIcon,
  EventAvailable as ScheduleIcon,
  ShoppingCart as POIcon,
  Science as LabIcon,
  Biotech as DiagnosticIcon,
  HourglassTop as WaitlistIcon,
  Notifications as NotificationsIcon,
  Forum as CommsIcon,
  ScheduleSend as RemindersIcon,
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowRight as ChevronRightIcon,
  LocalHospital as LogoIcon,
  Domain as DomainIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRoles, getRoleDisplayName } from '../services/userService';
import TenantSelectorBar from '../components/TenantSelectorBar';

// Nav groups with their items
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
    ],
  },
  {
    label: 'Patients & Appointments',
    items: [
      { text: 'Patients', icon: <PeopleIcon />, path: '/patients', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Appointments', icon: <CalendarIcon />, path: '/appointments', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Calendar', icon: <CalViewIcon />, path: '/calendar', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Waitlist', icon: <WaitlistIcon />, path: '/waitlist', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Recalls', icon: <RecallIcon />, path: '/recall', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { text: 'Treatments', icon: <TreatmentIcon />, path: '/treatments', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Diagnosis', icon: <DiagnosisIcon />, path: '/odontogram', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Vitals Chart', icon: <VitalsIcon />, path: '/perio-chart', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Medical History', icon: <MedHistIcon />, path: '/medical-history', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Clinical Notes', icon: <NoteIcon />, path: '/clinical-notes', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Consent Forms', icon: <ConsentIcon />, path: '/consent-forms', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Prescriptions', icon: <RxIcon />, path: '/prescriptions', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Procedures', icon: <ProceduresIcon />, path: '/procedures', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Diagnostic Requests', icon: <DiagnosticIcon />, path: '/diagnostic-requests', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
    ],
  },
  {
    label: 'Billing',
    items: [
      { text: 'Invoices', icon: <InvoiceIcon />, path: '/invoices', roles: [UserRoles.Admin] },
      { text: 'Subscription', icon: <EstimateIcon />, path: '/subscription', roles: [UserRoles.Admin] },
      { text: 'Insurance', icon: <InsuranceIcon />, path: '/insurance', roles: [UserRoles.Admin, UserRoles.SupportStaff] },
      { text: 'Estimates', icon: <EstimateIcon />, path: '/estimates', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Claims', icon: <ClaimIcon />, path: '/claims', roles: [UserRoles.Admin] },
      { text: 'Statements', icon: <StatementsIcon />, path: '/statements', roles: [UserRoles.Admin] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Purchase Orders', icon: <POIcon />, path: '/purchase-orders', roles: [UserRoles.Admin, UserRoles.SupportStaff] },
      { text: 'Lab Orders', icon: <LabIcon />, path: '/lab-orders', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Dr. Schedule', icon: <ScheduleIcon />, path: '/dentist-schedule', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Branches', icon: <BranchIcon />, path: '/branches', roles: [UserRoles.Admin] },
    ],
  },
  {
    label: 'Communication',
    items: [
      { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff, UserRoles.Patient] },
      { text: 'Comms Log', icon: <CommsIcon />, path: '/communication-log', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Reminders', icon: <RemindersIcon />, path: '/reminders', roles: [UserRoles.Admin, UserRoles.SupportStaff] },
    ],
  },
  {
    label: 'Analytics & Admin',
    items: [
      { text: 'Reports', icon: <ReportsIcon />, path: '/reports', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Documents', icon: <DocumentsIcon />, path: '/documents', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Audit Log', icon: <AuditIcon />, path: '/audit-log', roles: [UserRoles.Admin] },
      { text: 'Users', icon: <AdminIcon />, path: '/users', roles: [UserRoles.Admin] },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings', roles: [UserRoles.Admin] },
    ],
  },
  {
    label: 'Patient',
    items: [
      { text: 'My Portal', icon: <HomeIcon />, path: '/portal', roles: [UserRoles.Patient] },
    ],
  },
  {
    label: 'SuperAdmin',
    items: [
      { text: 'Tenant Management', icon: <DomainIcon />, path: '/tenants', roles: [UserRoles.SuperAdmin] },
      { text: 'Audit Log', icon: <AuditIcon />, path: '/audit-log', roles: [UserRoles.SuperAdmin] },
    ],
  },
];

const ROLE_ACCENT = {
  [UserRoles.SuperAdmin]: '#f87171',
  [UserRoles.Admin]: '#fb923c',
  [UserRoles.ClinicalStaff]: '#60a5fa',
  [UserRoles.SupportStaff]: '#34d399',
  [UserRoles.Patient]: '#c084fc',
};

// ── Top-nav design tokens ────────────────────────────────────────────────────
const NAV_BG = '#0c1a2e';
const NAV_TEXT = 'rgba(255,255,255,0.72)';
const NAV_TEXT_ACTIVE = '#ffffff';
const NAV_HOVER_BG = 'rgba(255,255,255,0.07)';
const NAV_ACTIVE_BG = 'rgba(99,179,237,0.18)';
const NAV_ACTIVE_COLOR = '#63b3ed';

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasAnyRole } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  // Group anchor map: { [groupLabel]: HTMLElement | null }
  const [groupAnchors, setGroupAnchors] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userAnchorEl, setUserAnchorEl] = useState(null);

  const openGroup = (label, el) => setGroupAnchors(prev => ({ ...prev, [label]: el }));
  const closeGroup = (label) => setGroupAnchors(prev => ({ ...prev, [label]: null }));
  const closeAllGroups = () => setGroupAnchors({});

  const handleUserMenuOpen = (e) => setUserAnchorEl(e.currentTarget);
  const handleUserMenuClose = () => setUserAnchorEl(null);
  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  const isSuperAdmin = user?.role === UserRoles.SuperAdmin;
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => isSuperAdmin || !item.roles || hasAnyRole(item.roles)),
  })).filter(group => group.items.length > 0);

  const accentColor = ROLE_ACCENT[user?.role] || '#60a5fa';

  // True if any item in the group is the active page
  const isGroupActive = (group) => group.items.some(i => isActive(i.path));

  // ── Mobile drawer ────────────────────────────────────────────────────────
  const renderMobileDrawer = () => (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileOpen}
      onClose={() => setMobileOpen(false)}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          background: NAV_BG,
          borderRight: 'none',
          boxShadow: '4px 0 24px rgba(0,0,0,0.35)',
        },
      }}
    >
      {/* Brand */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
        }}>
          <LogoIcon sx={{ color: 'white', fontSize: '1.1rem' }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'white', lineHeight: 1.15 }}>
            Doctors Appointment
          </Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            System
          </Typography>
        </Box>
      </Box>

      {/* Nav items */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5 }}>
        {visibleGroups.map((group, gi) => (
          <Box key={group.label}>
            <Typography sx={{
              px: 2.5, pt: gi > 0 ? 2 : 0.5, pb: 0.5,
              fontSize: '0.62rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.28)',
              textTransform: 'uppercase', letterSpacing: '0.09em',
            }}>
              {group.label}
            </Typography>
            <List disablePadding sx={{ px: 1.5 }}>
              {group.items.map(item => {
                const active = isActive(item.path);
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                    <ListItemButton
                      onClick={() => { navigate(item.path); setMobileOpen(false); }}
                      sx={{
                        borderRadius: '8px', py: 0.875, px: 1.25,
                        background: active ? NAV_ACTIVE_BG : 'transparent',
                        '&:hover': { background: active ? NAV_ACTIVE_BG : NAV_HOVER_BG },
                        position: 'relative',
                      }}
                    >
                      {active && (
                        <Box sx={{
                          position: 'absolute', left: 0, top: '15%', height: '70%',
                          width: 3, borderRadius: '0 3px 3px 0',
                          background: NAV_ACTIVE_COLOR, boxShadow: `0 0 8px ${NAV_ACTIVE_COLOR}`,
                        }} />
                      )}
                      <ListItemIcon sx={{ minWidth: 32, color: active ? NAV_ACTIVE_COLOR : NAV_TEXT, '& svg': { fontSize: '1.05rem' } }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} primaryTypographyProps={{
                        fontSize: '0.8375rem', fontWeight: active ? 600 : 400,
                        color: active ? NAV_ACTIVE_COLOR : NAV_TEXT, noWrap: true,
                      }} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Drawer>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f5f9' }}>

      {/* ── Top Nav Bar ── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: NAV_BG,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        {/* ── Row 1: Brand + Nav items + User ── */}
        <Toolbar sx={{ minHeight: { xs: 56, sm: 62 }, px: { xs: 1.5, sm: 2, lg: 3 }, gap: 0 }}>

          {/* Mobile hamburger */}
          {isMobile && (
            <IconButton
              size="small"
              onClick={() => setMobileOpen(true)}
              sx={{ color: NAV_TEXT, mr: 1, borderRadius: '8px', '&:hover': { background: NAV_HOVER_BG } }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Brand */}
          <Box
            onClick={() => navigate('/dashboard')}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.25,
              cursor: 'pointer', mr: { xs: 'auto', lg: 3 },
              userSelect: 'none',
            }}
          >
            <Box sx={{
              width: 32, height: 32, borderRadius: '9px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 3px 10px rgba(59,130,246,0.45)',
            }}>
              <LogoIcon sx={{ color: 'white', fontSize: '1rem' }} />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                Doctors Appointment
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                System
              </Typography>
            </Box>
          </Box>

          {/* ── Desktop nav group buttons ── */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flex: 1 }}>
              {visibleGroups.map(group => {
                const active = isGroupActive(group);
                const anchor = groupAnchors[group.label] || null;
                const open = Boolean(anchor);

                return (
                  <React.Fragment key={group.label}>
                    <Button
                      onClick={(e) => open ? closeGroup(group.label) : openGroup(group.label, e.currentTarget)}
                      endIcon={<ExpandMoreIcon sx={{
                        fontSize: '0.85rem !important',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: active ? NAV_ACTIVE_COLOR : 'rgba(255,255,255,0.45)',
                      }} />}
                      sx={{
                        color: active ? NAV_ACTIVE_COLOR : NAV_TEXT,
                        fontWeight: active ? 700 : 500,
                        fontSize: '0.78rem',
                        textTransform: 'none',
                        borderRadius: '8px',
                        px: 1.25,
                        py: 0.625,
                        minWidth: 0,
                        background: active ? NAV_ACTIVE_BG : open ? NAV_HOVER_BG : 'transparent',
                        '&:hover': { background: NAV_HOVER_BG, color: NAV_TEXT_ACTIVE },
                        whiteSpace: 'nowrap',
                        borderBottom: active ? `2px solid ${NAV_ACTIVE_COLOR}` : '2px solid transparent',
                        borderRadius: '8px 8px 0 0',
                      }}
                    >
                      {group.label}
                    </Button>

                    <Menu
                      anchorEl={anchor}
                      open={open}
                      onClose={() => closeGroup(group.label)}
                      PaperProps={{
                        elevation: 12,
                        sx: {
                          mt: 0.5,
                          minWidth: 210,
                          borderRadius: '12px',
                          background: '#0f2038',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                          overflow: 'hidden',
                        },
                      }}
                      transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                    >
                      {group.items.map(item => {
                        const itemActive = isActive(item.path);
                        return (
                          <MenuItem
                            key={item.text}
                            onClick={() => { navigate(item.path); closeGroup(group.label); }}
                            sx={{
                              gap: 1.5,
                              py: 1,
                              px: 2,
                              mx: 0.75,
                              my: 0.25,
                              borderRadius: '8px',
                              background: itemActive ? NAV_ACTIVE_BG : 'transparent',
                              '&:hover': { background: itemActive ? NAV_ACTIVE_BG : NAV_HOVER_BG },
                            }}
                          >
                            <Box sx={{ color: itemActive ? NAV_ACTIVE_COLOR : NAV_TEXT, display: 'flex', '& svg': { fontSize: '1rem' } }}>
                              {item.icon}
                            </Box>
                            <Typography sx={{
                              fontSize: '0.8375rem',
                              fontWeight: itemActive ? 600 : 400,
                              color: itemActive ? NAV_ACTIVE_COLOR : NAV_TEXT,
                            }}>
                              {item.text}
                            </Typography>
                            {itemActive && (
                              <Box sx={{ ml: 'auto', width: 6, height: 6, borderRadius: '50%', background: NAV_ACTIVE_COLOR }} />
                            )}
                          </MenuItem>
                        );
                      })}
                    </Menu>
                  </React.Fragment>
                );
              })}
            </Box>
          )}

          {/* ── Right actions ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: { xs: 0, lg: 1 } }}>
            <Tooltip title="Notifications">
              <IconButton
                size="small"
                onClick={() => navigate('/notifications')}
                sx={{
                  color: NAV_TEXT,
                  width: 34, height: 34, borderRadius: '8px',
                  '&:hover': { background: NAV_HOVER_BG, color: 'white' },
                }}
              >
                <Badge color="error" variant="dot">
                  <NotificationsIcon sx={{ fontSize: '1.15rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User pill */}
            <Box
              onClick={handleUserMenuOpen}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.875,
                cursor: 'pointer',
                px: 1, py: 0.5,
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.22)' },
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
            >
              <Avatar
                sx={{
                  width: 27, height: 27,
                  bgcolor: alpha(accentColor, 0.25),
                  color: accentColor,
                  fontSize: '0.73rem', fontWeight: 700,
                  border: `1.5px solid ${alpha(accentColor, 0.4)}`,
                }}
              >
                {user?.fullName?.charAt(0)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'white', lineHeight: 1.2 }}>
                  {user?.fullName}
                </Typography>
                <Typography sx={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.2 }}>
                  {getRoleDisplayName(user?.role)}
                </Typography>
              </Box>
              <ExpandMoreIcon sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', ml: 0.25 }} />
            </Box>
          </Box>
        </Toolbar>

        {/* ── SuperAdmin Tenant Selector (inside AppBar, below main toolbar) ── */}
        {isSuperAdmin && <TenantSelectorBar />}
      </AppBar>

      {/* ── User dropdown menu ── */}
      <Menu
        anchorEl={userAnchorEl}
        open={Boolean(userAnchorEl)}
        onClose={handleUserMenuClose}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1, minWidth: 228, borderRadius: '14px',
            border: '1px solid #e2e8f0', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.75, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar sx={{
              width: 38, height: 38,
              bgcolor: alpha(accentColor, 0.15), color: accentColor,
              fontSize: '1rem', fontWeight: 700,
              border: `1.5px solid ${alpha(accentColor, 0.3)}`,
            }}>
              {user?.fullName?.charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }} noWrap>{user?.fullName}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }} noWrap>{user?.email}</Typography>
            </Box>
          </Box>
          <Box mt={1}>
            <Chip
              label={getRoleDisplayName(user?.role)}
              size="small"
              sx={{
                height: 20, fontSize: '0.68rem', fontWeight: 700,
                bgcolor: alpha(accentColor, 0.12), color: accentColor,
                border: `1px solid ${alpha(accentColor, 0.25)}`,
              }}
            />
          </Box>
        </Box>
        <Box sx={{ py: 0.5 }}>
          <MenuItem onClick={() => { navigate('/profile'); handleUserMenuClose(); }}
            sx={{ py: 1.1, px: 2, gap: 1.5, borderRadius: '8px', mx: 0.5, '&:hover': { background: '#f1f5f9' } }}>
            <ListItemIcon sx={{ minWidth: 0, color: '#475569' }}><PersonIcon sx={{ fontSize: '1rem' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8375rem', fontWeight: 500, color: '#334155' }}>Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); handleUserMenuClose(); }}
            sx={{ py: 1.1, px: 2, gap: 1.5, borderRadius: '8px', mx: 0.5, '&:hover': { background: '#f1f5f9' } }}>
            <ListItemIcon sx={{ minWidth: 0, color: '#475569' }}><SettingsIcon sx={{ fontSize: '1rem' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8375rem', fontWeight: 500, color: '#334155' }}>Settings</ListItemText>
          </MenuItem>
        </Box>
        <Divider sx={{ borderColor: '#e2e8f0' }} />
        <Box sx={{ py: 0.5 }}>
          <MenuItem onClick={handleLogout}
            sx={{ py: 1.1, px: 2, gap: 1.5, borderRadius: '8px', mx: 0.5, '&:hover': { background: '#fff1f2' } }}>
            <ListItemIcon sx={{ minWidth: 0, color: '#ef4444' }}><LogoutIcon sx={{ fontSize: '1rem' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8375rem', fontWeight: 500, color: '#ef4444' }}>Sign out</ListItemText>
          </MenuItem>
        </Box>
      </Menu>

      {/* Mobile Drawer */}
      {isMobile && renderMobileDrawer()}

      {/* ── Page Content ── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, sm: 3, md: 3 },
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
