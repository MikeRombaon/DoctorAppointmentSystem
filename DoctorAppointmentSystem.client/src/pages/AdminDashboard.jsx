import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Skeleton,
  Divider,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Zoom,
  Fade,
  Tooltip,
  Button,
  Stack,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  DirectionsWalk as WalkInIcon,
  CheckCircle as CheckCircleIcon,
  Science as LabIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  MedicalServices as DoctorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  AccessTime as TimeIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import dashboardService from '../services/dashboardService';
import { toast } from 'react-toastify';

const AUTO_REFRESH_SECONDS = 60;

const GRADIENTS = {
  appointments: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  walkin:       'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  completed:    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  lab:          'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  inventory:    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  sales:        'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
};

const STATUS_COLORS = {
  Completed:  'success',
  Scheduled:  'primary',
  Confirmed:  'info',
  InProgress: 'warning',
  Cancelled:  'error',
  NoShow:     'default',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, gradient, subtitle, index, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Zoom in timeout={300} style={{ transitionDelay: `${index * 70}ms` }}>
      <Card
        elevation={0}
        onClick={onClick}
        sx={{
          height: '100%',
          background: gradient,
          position: 'relative',
          overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': onClick
            ? { transform: 'translateY(-5px)', boxShadow: '0 14px 30px rgba(0,0,0,0.2)' }
            : {},
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, right: 0,
            width: '80px', height: '80px',
            background: 'rgba(255,255,255,0.13)',
            borderRadius: '50%',
            transform: 'translate(30%,-30%)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-20px', left: '-20px',
            width: '100px', height: '100px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '50%',
          },
        }}
      >
        <CardContent sx={{ position: 'relative', zIndex: 1, py: 2.5, px: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: isMobile ? '0.68rem' : '0.76rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.9,
                  mb: 0.5,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant={isMobile ? 'h4' : 'h3'}
                component="div"
                sx={{
                  fontWeight: 800,
                  color: 'white',
                  textShadow: '1px 2px 6px rgba(0,0,0,0.18)',
                  lineHeight: 1,
                  mb: 0.5,
                }}
              >
                {value}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.76rem' }}>
                {subtitle}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  bgcolor: 'rgba(255,255,255,0.22)',
                  backdropFilter: 'blur(8px)',
                  width: isMobile ? 42 : 50,
                  height: isMobile ? 42 : 50,
                }}
              >
                {React.cloneElement(icon, { sx: { fontSize: isMobile ? 24 : 28, color: 'white' } })}
              </Avatar>
              {onClick && (
                <OpenInNewIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }} />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );
};

// ─── Doctor Schedule Row ──────────────────────────────────────────────────────
const DoctorRow = ({ doctor }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        hover
        onClick={() => setOpen(!open)}
        sx={{ cursor: 'pointer', '& > td': { borderBottom: open ? 0 : undefined } }}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#667eea', fontSize: '0.88rem', fontWeight: 700 }}>
              {doctor.doctorName?.charAt(0) ?? 'D'}
            </Avatar>
            <Typography fontWeight={600} fontSize="0.88rem">{doctor.doctorName}</Typography>
          </Box>
        </TableCell>
        <TableCell align="center">
          <Chip label={doctor.totalAppointments} color="primary" size="small" sx={{ fontWeight: 700, minWidth: 32 }} />
        </TableCell>
        <TableCell align="center">
          <Chip label={doctor.completed}         color="success" size="small" sx={{ fontWeight: 700, minWidth: 32 }} />
        </TableCell>
        <TableCell align="center">
          <Chip label={doctor.pending}           color="info"    size="small" sx={{ fontWeight: 700, minWidth: 32 }} />
        </TableCell>
        <TableCell align="center">
          <Chip label={doctor.walkIns}           color="warning" size="small" sx={{ fontWeight: 700, minWidth: 32 }} />
        </TableCell>
        <TableCell align="right" sx={{ pr: 2 }}>
          <IconButton size="small" tabIndex={-1}>
            {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, bgcolor: 'rgba(102,126,234,0.03)' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ px: 3, py: 1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Patient', 'Time', 'Purpose', 'Status', 'Type'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', py: 0.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {doctor.appointments?.map((appt) => (
                    <TableRow key={appt.appointmentId} hover>
                      <TableCell sx={{ fontSize: '0.81rem' }}>{appt.patientName}</TableCell>
                      <TableCell sx={{ fontSize: '0.81rem', whiteSpace: 'nowrap' }}>
                        {appt.startTime} – {appt.endTime}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.81rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {appt.purpose || '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appt.status}
                          color={STATUS_COLORS[appt.status] ?? 'default'}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </TableCell>
                      <TableCell>
                        {appt.isWalkIn && (
                          <Chip label="Walk-in" color="warning" variant="outlined" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
  const countdownRef = useRef(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const summary = await dashboardService.getAdminSummary();
      setData(summary);
      setLastUpdated(new Date());
      setCountdown(AUTO_REFRESH_SECONDS);
    } catch (err) {
      console.error('Admin dashboard load error:', err);
      if (!silent) toast.error('Failed to load administrator dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Auto-refresh countdown ticker
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadData(true);
          return AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [loadData]);

  const fmt = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount ?? 0);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={108} sx={{ borderRadius: 0, mb: 3 }} />
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <Skeleton variant="rectangular" height={138} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  // ── Stat cards config ───────────────────────────────────────────────────────
  const cards = [
    {
      title: "Today's Appointments",
      value: data?.todayAppointments ?? 0,
      icon: <CalendarIcon />,
      gradient: GRADIENTS.appointments,
      subtitle: 'Total scheduled today',
      onClick: () => navigate('/appointments'),
    },
    {
      title: 'Walk-in Patients',
      value: data?.walkInPatients ?? 0,
      icon: <WalkInIcon />,
      gradient: GRADIENTS.walkin,
      subtitle: 'Unscheduled today',
      onClick: () => navigate('/appointments'),
    },
    {
      title: 'Completed Consultations',
      value: data?.completedConsultations ?? 0,
      icon: <CheckCircleIcon />,
      gradient: GRADIENTS.completed,
      subtitle: 'Finished today',
      onClick: () => navigate('/appointments'),
    },
    {
      title: 'Pending Laboratory',
      value: data?.pendingLaboratory ?? 0,
      icon: <LabIcon />,
      gradient: GRADIENTS.lab,
      subtitle: 'Ordered or in progress',
      onClick: () => navigate('/lab-orders'),
    },
    {
      title: 'Inventory Alerts',
      value: data?.inventoryAlerts ?? 0,
      icon: <WarningIcon />,
      gradient: GRADIENTS.inventory,
      subtitle: 'Low / out of stock',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Sales Today',
      value: fmt(data?.salesToday),
      icon: <MoneyIcon />,
      gradient: GRADIENTS.sales,
      subtitle: 'Collected payments',
      onClick: () => navigate('/invoices'),
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>

      {/* ── Auto-refresh progress bar ─────────────────────────────────────── */}
      {refreshing && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}

      {/* ── Header Banner ────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 0,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute', top: 0, right: 0,
            width: '45%', height: '100%',
            background: 'rgba(255,255,255,0.05)',
            clipPath: 'polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%)',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={800} sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)', mb: 0.5 }}>
              🏥 Administrator Dashboard
            </Typography>
            <Typography sx={{ opacity: 0.88, fontSize: isMobile ? '0.82rem' : '0.95rem' }}>
              {todayLabel}
            </Typography>
          </Box>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            {lastUpdated && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TimeIcon sx={{ fontSize: '0.85rem' }} />
                  Updated {lastUpdated.toLocaleTimeString()}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>
                  Refreshing in {countdown}s
                </Typography>
              </Box>
            )}
            <Tooltip title="Refresh now">
              <IconButton
                onClick={() => loadData(false)}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ px: { xs: 2, md: 3 } }}>

        {/* ── 6 Summary Cards ──────────────────────────────────────────────── */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {cards.map((card, idx) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={card.title}>
              <StatCard {...card} index={idx} />
            </Grid>
          ))}
        </Grid>

        {/* ── Doctor Schedule ───────────────────────────────────────────────── */}
        <Fade in timeout={600}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f9f9ff 100%)',
            }}
          >
            {/* Section header */}
            <Box
              sx={{
                px: 3, py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(102,126,234,0.12)',
                background: 'rgba(102,126,234,0.04)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: '#667eea', width: 38, height: 38 }}>
                  <DoctorIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography
                    fontWeight={700}
                    fontSize="1rem"
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Doctor Schedule — Today
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click any row to view individual appointments
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  icon={<CircleIcon sx={{ fontSize: '0.55rem !important', color: '#43e97b !important' }} />}
                  label={`${data?.doctorSchedule?.length ?? 0} doctor${data?.doctorSchedule?.length !== 1 ? 's' : ''} on duty`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', borderColor: 'rgba(102,126,234,0.3)', color: 'text.secondary' }}
                />
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  onClick={() => navigate('/dentist-schedule')}
                  sx={{ textTransform: 'none', fontSize: '0.78rem', color: '#667eea' }}
                >
                  Full Schedule
                </Button>
              </Stack>
            </Box>

            {/* Table */}
            {!data?.doctorSchedule?.length ? (
              <Box sx={{ py: 7, textAlign: 'center' }}>
                <Typography color="text.secondary" fontSize="0.9rem">No appointments scheduled for today.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(102,126,234,0.06)' }}>
                      {[
                        { label: 'Doctor',    align: 'left'   },
                        { label: 'Total',     align: 'center' },
                        { label: 'Completed', align: 'center' },
                        { label: 'Pending',   align: 'center' },
                        { label: 'Walk-ins',  align: 'center' },
                        { label: '',          align: 'right'  },
                      ].map(({ label, align }) => (
                        <TableCell key={label} align={align} sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.77rem', py: 1.5 }}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.doctorSchedule.map((doc) => (
                      <DoctorRow key={doc.doctorId} doctor={doc} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Divider />
            <Box sx={{ px: 3, py: 1.2, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="caption" color="text.disabled">
                Data reflects today's schedule only · Auto-refreshes every {AUTO_REFRESH_SECONDS}s
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
