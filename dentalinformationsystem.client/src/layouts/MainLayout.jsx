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
  Grain as OdontogramIcon,
  Timeline as PerioIcon,
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
  HourglassTop as WaitlistIcon,
  Notifications as NotificationsIcon,
  Forum as CommsIcon,
  ScheduleSend as RemindersIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRoles, getRoleDisplayName } from '../services/userService';

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 68;

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
      { text: 'Odontogram', icon: <OdontogramIcon />, path: '/odontogram', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Perio Chart', icon: <PerioIcon />, path: '/perio-chart', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Medical History', icon: <MedHistIcon />, path: '/medical-history', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Clinical Notes', icon: <NoteIcon />, path: '/clinical-notes', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Consent Forms', icon: <ConsentIcon />, path: '/consent-forms', roles: [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff] },
      { text: 'Prescriptions', icon: <RxIcon />, path: '/prescriptions', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
      { text: 'Procedures', icon: <ProceduresIcon />, path: '/procedures', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
    ],
  },
  {
    label: 'Billing',
    items: [
      { text: 'Invoices', icon: <InvoiceIcon />, path: '/invoices', roles: [UserRoles.Admin] },
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
      { text: 'Dent. Schedule', icon: <ScheduleIcon />, path: '/dentist-schedule', roles: [UserRoles.Admin, UserRoles.ClinicalStaff] },
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
];

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasAnyRole } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const collapsed = !isMobile && !sidebarOpen;

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => location.pathname === path;

  const roleColor = {
    [UserRoles.Admin]: '#c62828',
    [UserRoles.ClinicalStaff]: '#0f6cbd',
    [UserRoles.SupportStaff]: '#2e7d32',
    [UserRoles.Patient]: '#6a1b9a',
  };

  // Filtered nav groups
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => !item.roles || hasAnyRole(item.roles)),
  })).filter(group => group.items.length > 0);

  const SidebarContent = ({ mobile = false }) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo / Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: collapsed && !mobile ? 1.5 : 2.5,
          py: 2.5,
          minHeight: 64,
          justifyContent: collapsed && !mobile ? 'center' : 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          🦷
        </Box>
        {(!collapsed || mobile) && (
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'white',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              Dental Clinic
            </Typography>
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Management System
            </Typography>
          </Box>
        )}
      </Box>

      {/* Nav Items */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.15)', borderRadius: 2 },
        }}
      >
        {visibleGroups.map((group, gi) => (
          <Box key={group.label} sx={{ mb: 0.5 }}>
            {(!collapsed || mobile) && (
              <Typography
                sx={{
                  px: 2.5,
                  py: 0.75,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  mt: gi > 0 ? 1.5 : 0,
                }}
              >
                {group.label}
              </Typography>
            )}
            {gi > 0 && collapsed && !mobile && (
              <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)', mx: 1.5 }} />
            )}
            <List disablePadding>
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <ListItem key={item.text} disablePadding sx={{ px: collapsed && !mobile ? 1 : 1.5, mb: 0.25 }}>
                    <Tooltip
                      title={collapsed && !mobile ? item.text : ''}
                      placement="right"
                      arrow
                    >
                      <ListItemButton
                        onClick={() => {
                          navigate(item.path);
                          if (mobile) setMobileOpen(false);
                        }}
                        sx={{
                          borderRadius: '8px',
                          py: 1,
                          px: collapsed && !mobile ? 1.25 : 1.5,
                          justifyContent: collapsed && !mobile ? 'center' : 'flex-start',
                          minHeight: 40,
                          background: active
                            ? 'rgba(255,255,255,0.15)'
                            : 'transparent',
                          backdropFilter: active ? 'blur(10px)' : 'none',
                          '&:hover': {
                            background: active
                              ? 'rgba(255,255,255,0.2)'
                              : 'rgba(255,255,255,0.08)',
                          },
                          transition: 'all 0.15s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': active ? {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: '20%',
                            height: '60%',
                            width: 3,
                            borderRadius: '0 2px 2px 0',
                            background: 'white',
                          } : {},
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: collapsed && !mobile ? 0 : 36,
                            color: active ? 'white' : 'rgba(255,255,255,0.65)',
                            '& svg': { fontSize: '1.15rem' },
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {(!collapsed || mobile) && (
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: active ? 600 : 400,
                              color: active ? 'white' : 'rgba(255,255,255,0.75)',
                              noWrap: true,
                            }}
                          />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* User info at bottom */}
      {(!collapsed || mobile) && user && (
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user?.fullName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', noWrap: true, lineHeight: 1.2 }} noWrap>
              {user?.fullName}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }} noWrap>
              {getRoleDisplayName(user?.role)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  const sidebarSx = {
    width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shorter,
    }),
    '& .MuiDrawer-paper': {
      width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
      overflowX: 'hidden',
      background: 'linear-gradient(180deg, #0f4c8a 0%, #0f6cbd 60%, #1a7fd4 100%)',
      borderRight: 'none',
      boxShadow: '4px 0 20px rgba(15,76,138,0.15)',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.shorter,
      }),
    },
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8' }}>
      {/* Permanent Sidebar (desktop) */}
      {!isMobile && (
        <Drawer variant="permanent" sx={sidebarSx} open>
          <SidebarContent />
        </Drawer>
      )}

      {/* Temporary Drawer (mobile) */}
      {isMobile && (
        <Drawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              background: 'linear-gradient(180deg, #0f4c8a 0%, #0f6cbd 60%, #1a7fd4 100%)',
              borderRight: 'none',
              boxShadow: '4px 0 20px rgba(15,76,138,0.2)',
            },
          }}
        >
          <SidebarContent mobile />
        </Drawer>
      )}

      {/* Main Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        {/* Top Header */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: '#ffffff',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            color: 'text.primary',
            zIndex: theme.zIndex.drawer - 1,
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 }, gap: 1 }}>
            {/* Sidebar toggle */}
            <Tooltip title={isMobile ? 'Open menu' : sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
              <IconButton
                size="small"
                onClick={() => isMobile ? setMobileOpen(true) : setSidebarOpen(!sidebarOpen)}
                sx={{
                  color: 'text.secondary',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  '&:hover': { background: 'rgba(0,0,0,0.04)' },
                }}
              >
                {sidebarOpen && !isMobile ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Page title derived from current path */}
            <Box sx={{ flex: 1, ml: 1.5 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  color: 'text.primary',
                  letterSpacing: '-0.02em',
                }}
              >
                {(() => {
                  const all = NAV_GROUPS.flatMap(g => g.items);
                  const found = all.find(i => i.path === location.pathname);
                  return found ? found.text : 'Dental Clinic';
                })()}
              </Typography>
            </Box>

            {/* Right side */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Notifications shortcut */}
              <Tooltip title="Notifications">
                <IconButton
                  size="small"
                  onClick={() => navigate('/notifications')}
                  sx={{
                    color: 'text.secondary',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    '&:hover': { background: 'rgba(0,0,0,0.04)' },
                  }}
                >
                  <Badge color="error" variant="dot">
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* User avatar */}
              <Box
                onClick={handleMenuOpen}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  pl: 1,
                  pr: 1.5,
                  py: 0.75,
                  borderRadius: '10px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  '&:hover': { background: 'rgba(0,0,0,0.04)' },
                  transition: 'background 0.15s ease',
                }}
              >
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: '#0f6cbd',
                    color: 'white',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.fullName?.charAt(0)}
                </Avatar>
                {!isMobile && (
                  <Box>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }}>
                      {user?.fullName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.2 }}>
                      {getRoleDisplayName(user?.role)}
                    </Typography>
                  </Box>
                )}
                <ExpandMoreIcon sx={{ fontSize: '1rem', color: 'text.secondary', ml: 0.25 }} />
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* User dropdown menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1,
              minWidth: 220,
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.08)',
              overflow: 'visible',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{user?.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            <Box mt={0.75}>
              <Chip
                label={getRoleDisplayName(user?.role)}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: user ? (roleColor[user.role] || '#0f6cbd') + '18' : '#0f6cbd18',
                  color: user ? (roleColor[user.role] || '#0f6cbd') : '#0f6cbd',
                  border: `1px solid ${user ? (roleColor[user.role] || '#0f6cbd') + '30' : '#0f6cbd30'}`,
                }}
              />
            </Box>
          </Box>
          <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }} sx={{ py: 1.25, gap: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 0 }}><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }} sx={{ py: 1.25, gap: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 0 }}><SettingsIcon fontSize="small" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Settings</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ py: 1.25, gap: 1.5, color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 0 }}><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, color: 'error.main' }}>Logout</ListItemText>
          </MenuItem>
        </Menu>

        {/* Page Content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 3.5 },
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
