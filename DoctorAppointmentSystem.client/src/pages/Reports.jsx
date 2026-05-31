import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, Tabs, Tab,
  TextField, MenuItem, Select, FormControl, InputLabel, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, CircularProgress, Chip, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  Download, Refresh, TrendingUp, People, CalendarMonth, MedicalServices,
} from '@mui/icons-material';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts';
import { reportService } from '../services/reportService';

const COLORS = ['#667eea', '#764ba2', '#43e97b', '#f093fb', '#4facfe', '#fa709a', '#f5576c'];

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().split('T')[0];
const defaultTo = today.toISOString().split('T')[0];

function StatCard({ icon, label, value, color = 'primary.main', sub }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box color={color}>{icon}</Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>{value ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [tab, setTab] = useState(0);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [groupBy, setGroupBy] = useState('month');

  const [revenue, setRevenue] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [treatments, setTreatments] = useState(null);
  const [providers, setProviders] = useState(null);
  const [patients, setPatients] = useState(null);
  const [clinicalPerf, setClinicalPerf] = useState(null);
  const [procedureFreq, setProcedureFreq] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rev, appts, treats, provs, pats, clinPerf, procFreq] = await Promise.all([
        reportService.getRevenue({ from, to, groupBy }),
        reportService.getAppointments({ from, to }),
        reportService.getTreatments({ from, to }),
        reportService.getProviders({ from, to }),
        reportService.getPatientStats(),
        reportService.getDentistPerformance({ from, to }),
        reportService.getProcedureFrequency({ from, to }),
      ]);
      setRevenue(rev);
      setAppointments(appts);
      setTreatments(treats);
      setProviders(provs);
      setPatients(pats);
      setClinicalPerf(clinPerf);
      setProcedureFreq(procFreq);
    } catch {
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n) => `₱${(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Reports & Analytics</Typography>
          <Typography variant="body2" color="text.secondary">
            Insights across revenue, appointments, treatments, and providers
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <TextField size="small" label="From" type="date" value={from}
            onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
          <TextField size="small" label="To" type="date" value={to}
            onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
          <FormControl size="small" sx={{ width: 110 }}>
            <InputLabel>Group By</InputLabel>
            <Select value={groupBy} label="Group By" onChange={(e) => setGroupBy(e.target.value)}>
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <>
          {/* Summary KPI Row */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} md={3}>
              <StatCard icon={<TrendingUp />} label="Total Billed" value={fmt(revenue?.totalBilled)} color="primary.main" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard icon={<TrendingUp />} label="Total Collected" value={fmt(revenue?.totalCollected)} color="success.main" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard icon={<TrendingUp />} label="Outstanding Balance" value={fmt(revenue?.outstandingBalance)} color="error.main" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard icon={<CalendarMonth />} label="Appointments" value={appointments?.total}
                color="info.main" sub={`${appointments?.completed ?? 0} completed`} />
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper variant="outlined">
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Revenue" />
              <Tab label="Appointments" />
              <Tab label="Treatments" />
              <Tab label="Providers" />
              <Tab label="Patients" />
              <Tab label="Clinical Performance" />
            </Tabs>

            <Box p={2}>
              {/* Revenue Tab */}
              {tab === 0 && revenue && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Billed vs Collected — by {groupBy}
                    </Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={revenue.byPeriod}>
                        <defs>
                          <linearGradient id="billed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#43e97b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#43e97b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RTooltip formatter={(v) => fmt(v)} />
                        <Legend />
                        <Area type="monotone" dataKey="billed" stroke="#667eea" fill="url(#billed)" name="Billed" />
                        <Area type="monotone" dataKey="collected" stroke="#43e97b" fill="url(#collected)" name="Collected" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Payments by Method</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={revenue.paymentsByMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={80} label>
                          {revenue.paymentsByMethod?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <RTooltip formatter={(v) => fmt(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6} display="flex" alignItems="center" justifyContent="center">
                    <Button variant="outlined" startIcon={<Download />}
                      onClick={() => reportService.exportRevenueCsv({ from, to })}>
                      Export Revenue CSV
                    </Button>
                  </Grid>
                </Grid>
              )}

              {/* Appointments Tab */}
              {tab === 1 && appointments && (
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<CalendarMonth />} label="Walk-in" value={appointments.walkIn} color="warning.main" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<CalendarMonth />} label="Scheduled" value={appointments.scheduled} color="primary.main" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<CalendarMonth />} label="No-Show" value={appointments.noShow} color="error.main" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<CalendarMonth />} label="Cancelled" value={appointments.cancelled} color="default" />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>Appointments by Month</Typography>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={appointments.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RTooltip />
                        <Legend />
                        <Bar dataKey="scheduled" fill="#667eea" name="Scheduled" stackId="a" />
                        <Bar dataKey="walkIn" fill="#f093fb" name="Walk-In" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>By Day of Week</Typography>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={appointments.byDayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RTooltip />
                        <Bar dataKey="count" fill="#4facfe" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6} display="flex" alignItems="center" justifyContent="center">
                    <Button variant="outlined" startIcon={<Download />}
                      onClick={() => reportService.exportAppointmentsCsv({ from, to })}>
                      Export Appointments CSV
                    </Button>
                  </Grid>
                </Grid>
              )}

              {/* Treatments Tab */}
              {tab === 2 && treatments && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>Top Procedures by Volume</Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={treatments.byProcedure} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="procedure" tick={{ fontSize: 10 }} width={130} />
                        <RTooltip />
                        <Bar dataKey="count" fill="#764ba2" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>Revenue by Month</Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={treatments.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RTooltip formatter={(v) => fmt(v)} />
                        <Area type="monotone" dataKey="revenue" stroke="#43e97b" fill="#43e97b33" name="Revenue" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Grid>
                </Grid>
              )}

              {/* Providers Tab */}
              {tab === 3 && providers && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell>Specialization</TableCell>
                        <TableCell align="right">Appointments</TableCell>
                        <TableCell align="right">Completed</TableCell>
                        <TableCell align="right">Treatments</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {providers.map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.specialization || '—'}</TableCell>
                          <TableCell align="right">{p.appointmentCount}</TableCell>
                          <TableCell align="right">{p.completedAppointments}</TableCell>
                          <TableCell align="right">{p.treatmentCount}</TableCell>
                          <TableCell align="right">{fmt(p.revenue)}</TableCell>
                        </TableRow>
                      ))}
                      {providers.length === 0 && (
                        <TableRow><TableCell colSpan={6} align="center">No providers found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Patients Tab */}
              {tab === 4 && patients && (
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <StatCard icon={<People />} label="Active Patients" value={patients.total} color="primary.main" />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <StatCard icon={<People />} label="With Portal Access" value={patients.withPortalAccess} color="success.main" />
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>New Patients by Month</Typography>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={patients.newByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RTooltip />
                        <Bar dataKey="count" fill="#667eea" name="New Patients" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                </Grid>
              )}

              {/* Clinical Performance Tab */}
              {tab === 5 && (
                <Grid container spacing={3}>
                  {/* Dentist Performance Table */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Dentist Performance
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>Doctor</TableCell>
                            <TableCell align="right">Completed</TableCell>
                            <TableCell align="right">Planned</TableCell>
                            <TableCell align="right">Appointments</TableCell>
                            <TableCell align="right">Avg Duration (min)</TableCell>
                            <TableCell align="right">Revenue</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(clinicalPerf?.dentists ?? []).map(d => (
                            <TableRow key={d.dentistId} hover>
                              <TableCell>{d.dentistName}</TableCell>
                              <TableCell align="right">{d.treatmentsCompleted}</TableCell>
                              <TableCell align="right">{d.treatmentsPlanned}</TableCell>
                              <TableCell align="right">{d.appointmentCount}</TableCell>
                              <TableCell align="right">{d.avgAppointmentDurationMinutes}</TableCell>
                              <TableCell align="right">{fmt(d.totalRevenue)}</TableCell>
                            </TableRow>
                          ))}
                          {(clinicalPerf?.dentists ?? []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                No data for selected period
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>

                  {/* Procedure Frequency */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Top Procedures by Frequency
                    </Typography>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={(procedureFreq?.procedures ?? []).slice(0, 10)}
                        layout="vertical"
                        margin={{ left: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="procedureName" type="category" tick={{ fontSize: 10 }} width={100} />
                        <RTooltip />
                        <Bar dataKey="count" fill="#667eea" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>

                  {/* Procedure Revenue */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Top Procedures by Revenue
                    </Typography>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={(procedureFreq?.procedures ?? []).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10)}
                        layout="vertical"
                        margin={{ left: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="procedureName" type="category" tick={{ fontSize: 10 }} width={100} />
                        <RTooltip formatter={(v) => fmt(v)} />
                        <Bar dataKey="totalRevenue" fill="#43e97b" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
