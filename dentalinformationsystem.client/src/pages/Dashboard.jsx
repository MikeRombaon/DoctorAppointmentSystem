import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fade,
  Zoom,
  Skeleton,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  MedicalServices as TreatmentIcon,
  ArrowUpward,
  ArrowDownward,
  Assessment,
  LocalHospital,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import dashboardService from '../services/dashboardService';
import { toast } from 'react-toastify';

// Modern color palette
const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a'];
const GRADIENT_COLORS = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
};

const ModernStatCard = ({ title, value, icon, gradient, trend, index }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          background: gradient,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: `0 12px 24px rgba(102, 126, 234, 0.25)`,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            transform: 'translate(30%, -30%)',
          },
        }}
      >
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: 500,
                  mb: 1,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {title}
              </Typography>
              <Typography 
                variant={isMobile ? 'h5' : 'h4'} 
                component="div" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 1,
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {value}
              </Typography>
              {trend !== undefined && (
                <Chip
                  icon={trend > 0 ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                  label={`${Math.abs(trend)}% from last month`}
                  size="small"
                  sx={{
                    backgroundColor: trend > 0 
                      ? 'rgba(76, 175, 80, 0.2)' 
                      : 'rgba(244, 67, 54, 0.2)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    '& .MuiChip-icon': {
                      color: 'white',
                      fontSize: '1rem',
                    },
                  }}
                />
              )}
            </Box>
            <Avatar
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                width: isMobile ? 48 : 56,
                height: isMobile ? 48 : 56,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {React.cloneElement(icon, { 
                sx: { fontSize: isMobile ? 28 : 32, color: 'white' } 
              })}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Generate last 5 years dynamically (sorted descending)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years; // Already in descending order
  };

  // State for all analytics
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [genderDistribution, setGenderDistribution] = useState([]);
  const [appointmentTypeDistribution, setAppointmentTypeDistribution] = useState(null);
  const [treatmentsByProcedure, setTreatmentsByProcedure] = useState(null);
  const [treatmentTrend, setTreatmentTrend] = useState([]);
  const [inventoryByCategory, setInventoryByCategory] = useState([]);
  const [mostUsedInventory, setMostUsedInventory] = useState(null);
  const [appointmentPattern, setAppointmentPattern] = useState(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState(null);

  useEffect(() => {
    loadAllDashboardData();
  }, [selectedYear, selectedPeriod]);

  const loadAllDashboardData = async () => {
    try {
      setLoading(true);
      const [
        overviewData,
        revenueYearly,
        ageDist,
        genderDist,
        apptTypes,
        treatmentProc,
        treatmentMon,
        inventoryCat,
        mostUsed,
        apptPattern,
        revBreakdown,
      ] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getYearlyRevenue(selectedYear),
        dashboardService.getAgeDistribution(),
        dashboardService.getGenderDistribution(),
        dashboardService.getAppointmentTypeDistribution(selectedPeriod),
        dashboardService.getTreatmentsByProcedure(),
        dashboardService.getTreatmentMonthlyTrend(selectedYear),
        dashboardService.getInventoryByCategory(),
        dashboardService.getMostUsedInventory(),
        dashboardService.getAppointmentPattern(),
        dashboardService.getRevenueBreakdown(),
      ]);

      setOverview(overviewData);
      setRevenueData(revenueYearly);
      setAgeDistribution(ageDist);
      setGenderDistribution(genderDist);
      setAppointmentTypeDistribution(apptTypes);
      setTreatmentsByProcedure(treatmentProc);
      setTreatmentTrend(treatmentMon);
      setInventoryByCategory(inventoryCat);
      setMostUsedInventory(mostUsed);
      setAppointmentPattern(apptPattern);
      setRevenueBreakdown(revBreakdown);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Modern Welcome Banner */}
      <Paper
        elevation={0}
        sx={{
          background: GRADIENT_COLORS.primary,
          color: 'white',
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 0,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography 
                variant={isMobile ? 'h5' : 'h4'}
                sx={{ 
                  fontWeight: 700,
                  mb: 1,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                Welcome back, {user?.fullName}! 🦷
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  opacity: 0.95,
                  fontSize: isMobile ? '0.875rem' : '1rem',
                }}
              >
                Here's what's happening with your clinic today
              </Typography>
            </Box>
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 120,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: 1,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '& .MuiSelect-select': {
                  color: 'white',
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.9)',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
            >
              <InputLabel sx={{ color: 'white' }}>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(e.target.value)}
                sx={{ color: 'white' }}
              >
                {generateYearOptions().map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ px: { xs: 2, md: 3 } }}>
        {/* Modern Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <ModernStatCard
              title="Total Patients"
              value={overview?.statistics?.totalPatients || 0}
              icon={<PeopleIcon />}
              gradient={GRADIENT_COLORS.primary}
              index={0}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ModernStatCard
              title="Today's Appointments"
              value={overview?.statistics?.totalAppointmentsToday || 0}
              icon={<CalendarIcon />}
              gradient={GRADIENT_COLORS.info}
              index={1}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ModernStatCard
              title="Monthly Revenue"
              value={`$${overview?.revenue?.thisMonth?.toLocaleString() || 0}`}
              icon={<MoneyIcon />}
              gradient={GRADIENT_COLORS.success}
              index={2}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ModernStatCard
              title="Low Stock Items"
              value={overview?.statistics?.lowStockItems || 0}
              icon={<InventoryIcon />}
              gradient={GRADIENT_COLORS.warning}
              index={3}
            />
          </Grid>
        </Grid>

      {/* Modern Tabs Navigation */}
        <Paper 
          elevation={0} 
          sx={{ 
            mb: 4, 
            borderRadius: 2,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
            sx={{
              '& .MuiTab-root': {
                py: 2,
                px: 3,
                fontSize: '0.95rem',
                fontWeight: 600,
                textTransform: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.08)',
                },
                '&.Mui-selected': {
                  color: '#667eea',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: GRADIENT_COLORS.primary,
              },
            }}
          >
            <Tab icon={<Assessment />} iconPosition="start" label="Overview" />
            <Tab icon={<PeopleIcon />} iconPosition="start" label="Demographics" />
            <Tab icon={<TreatmentIcon />} iconPosition="start" label="Treatments" />
            <Tab icon={<InventoryIcon />} iconPosition="start" label="Inventory" />
            <Tab icon={<MoneyIcon />} iconPosition="start" label="Revenue" />
          </Tabs>
        </Paper>

        {/* Tab Panel 0: Overview */}
        {tabValue === 0 && (
          <Fade in={true}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    height: { xs: 350, md: 420 },
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 6px 25px rgba(0,0,0,0.12)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      fontWeight: 700,
                      background: GRADIENT_COLORS.primary,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 3,
                    }}
                  >
                    📈 Yearly Revenue Trend
                  </Typography>
                  <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={revenueData?.monthlyBreakdown || []}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#666', fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                      />
                      <YAxis 
                        tick={{ fill: '#666', fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#667eea" 
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        name="Revenue ($)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    height: { xs: 350, md: 420 },
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 6px 25px rgba(0,0,0,0.12)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 700,
                      background: GRADIENT_COLORS.info,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 3,
                    }}
                  >
                    📅 Appointment Status
                  </Typography>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={appointmentPattern?.byStatus || []}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 80}
                        label={!isMobile}
                        labelLine={!isMobile}
                      >
                        {(appointmentPattern?.byStatus || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px' }}
                        iconSize={isMobile ? 10 : 12}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </Fade>
        )}

      {/* Tab Panel 1: Demographics */}
      {tabValue === 1 && (
        <Fade in={true}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  height: 400,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 25px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 700,
                    background: GRADIENT_COLORS.primary,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 3,
                  }}
                >
                  👥 Age Distribution
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={ageDistribution}>
                    <defs>
                      <linearGradient id="colorAge" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#764ba2" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="ageGroup" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      style={{ fontSize: isMobile ? '10px' : '12px' }}
                    />
                    <YAxis style={{ fontSize: isMobile ? '10px' : '12px' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar 
                      dataKey="count" 
                      fill="url(#colorAge)" 
                      name="Patients"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  height: 400,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 25px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 700,
                    background: GRADIENT_COLORS.info,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 3,
                  }}
                >
                  🚻 Gender Distribution
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={genderDistribution}
                      dataKey="count"
                      nameKey="gender"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 70 : 90}
                      label={(entry) => `${entry.gender}: ${entry.percentage}%`}
                      labelLine={!isMobile}
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* NEW: Walk-in vs Scheduled Chart */}
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  height: 400,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 25px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography 
                    variant="h6"
                    sx={{ 
                      fontWeight: 700,
                      background: GRADIENT_COLORS.warning,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    📊 Walk-in vs Scheduled
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      sx={{
                        fontSize: '0.875rem',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0,0,0,0.15)',
                        },
                      }}
                    >
                      <MenuItem value="week">Last 7 Days</MenuItem>
                      <MenuItem value="month">Last Month</MenuItem>
                      <MenuItem value="quarter">Last 3 Months</MenuItem>
                      <MenuItem value="year">Last Year</MenuItem>
                      <MenuItem value="ytd">Year to Date</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={appointmentTypeDistribution?.distribution || []}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 70 : 90}
                      label={(entry) => `${entry.type}: ${entry.count} (${entry.percentage}%)`}
                      labelLine={!isMobile}
                    >
                      {(appointmentTypeDistribution?.distribution || []).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.type === 'Walk-in' ? '#FF9800' : '#667eea'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                      formatter={(value, name, props) => [
                        `${value} appointments (${props.payload.percentage}%)`,
                        `${props.payload.icon} ${props.payload.type}`
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconSize={isMobile ? 10 : 12}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Box 
                  sx={{ 
                    mt: 2, 
                    pt: 2, 
                    borderTop: '1px solid rgba(0,0,0,0.1)',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Total: {appointmentTypeDistribution?.totalAppointments || 0} appointments ({appointmentTypeDistribution?.period?.label || 'Loading...'})
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Treatments Done Chart */}
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  height: 400,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 25px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 700,
                    background: GRADIENT_COLORS.success,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 3,
                  }}
                >
                  🦷 Treatments Done by Procedure
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart 
                    data={treatmentsByProcedure?.treatmentStatistics?.slice(0, 8) || []}
                    layout="horizontal"
                  >
                    <defs>
                      <linearGradient id="colorTreatment" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="#11998e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#38ef7d" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="procedureName" 
                      angle={-45} 
                      textAnchor="end" 
                      height={120}
                      style={{ fontSize: isMobile ? '10px' : '12px' }}
                    />
                    <YAxis style={{ fontSize: isMobile ? '10px' : '12px' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                      formatter={(value) => [`${value} treatments`, 'Count']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar 
                      dataKey="count" 
                      fill="url(#colorTreatment)" 
                      name="Treatments Completed"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* Tab Panel 2: Treatments */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Top Procedures</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={treatmentsByProcedure?.treatmentStatistics?.slice(0, 5) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="procedureName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" name="Treatments" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Monthly Treatment Trend</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={treatmentTrend?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="treatmentCount" stroke="#8884d8" name="Treatments" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab Panel 3: Inventory */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Inventory by Category</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={inventoryByCategory}
                    dataKey="totalValue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.category}`}
                  >
                    {inventoryByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Most Used Items</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={mostUsedInventory?.mostUsedItems || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="itemName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="timesUsed" fill="#ffc658" name="Times Used" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab Panel 4: Revenue */}
      {tabValue === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Revenue Breakdown</Typography>
              <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
                      <CardContent>
                        <Typography variant="h6">${revenueBreakdown?.totalRevenue?.toLocaleString() || 0}</Typography>
                        <Typography variant="body2">Total Revenue</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                      <CardContent>
                        <Typography variant="h6">${revenueBreakdown?.paidRevenue?.toLocaleString() || 0}</Typography>
                        <Typography variant="body2">Collected</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
                      <CardContent>
                        <Typography variant="h6">${revenueBreakdown?.outstandingRevenue?.toLocaleString() || 0}</Typography>
                        <Typography variant="body2">Outstanding</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Collection Rate: {revenueBreakdown?.collectionRate || 0}%
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Payment Methods</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={revenueBreakdown?.byPaymentMethod || []}
                    dataKey="amount"
                    nameKey="paymentMethod"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {(revenueBreakdown?.byPaymentMethod || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
      </Box>
    </Box>
  );
};

export default Dashboard;
