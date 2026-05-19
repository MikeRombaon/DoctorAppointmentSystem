import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, CircularProgress, Tabs, Tab, Divider,
} from '@mui/material';
import {
  CalendarToday, Receipt, MedicalServices, AttachFile,
  AccountBalance,
} from '@mui/icons-material';
import { portalService } from '../services/portalService';
import Documents from './Documents';

const statusColor = {
  Scheduled: 'primary', Confirmed: 'success', Completed: 'default',
  Cancelled: 'error', WalkIn: 'warning', NoShow: 'error',
  Pending: 'warning', PartiallyPaid: 'info', Paid: 'success', Overdue: 'error',
};

function SummaryCard({ icon, title, value, color = 'primary' }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box color={`${color}.main`}>{icon}</Box>
          <Box>
            <Typography variant="h5" fontWeight={600}>{value ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function PatientPortal() {
  const [summary, setSummary] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sum, appts, invs, treats] = await Promise.all([
          portalService.getSummary(),
          portalService.getAppointments(null, 1, 20),
          portalService.getInvoices(1, 20),
          portalService.getTreatments(1, 20),
        ]);
        setSummary(sum);
        setAppointments(appts.items || []);
        setInvoices(invs.items || []);
        setTreatments(treats.items || []);
      } catch {
        setError('Failed to load your portal data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
      <CircularProgress />
    </Box>
  );

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box maxWidth={1100} mx="auto">
      {/* Welcome banner */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Welcome, {summary?.patient?.fullName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Patient Portal — view your appointments, treatments, invoices, and documents.
        </Typography>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={<CalendarToday />} title="Total Appointments"
            value={summary?.totalAppointments} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={<MedicalServices />} title="Total Treatments"
            value={summary?.totalTreatments} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={<Receipt />} title="Total Invoices"
            value={summary?.totalInvoices} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={<AccountBalance />} title="Outstanding Balance"
            value={`₱${(summary?.outstandingBalance ?? 0).toFixed(2)}`}
            color={summary?.outstandingBalance > 0 ? 'error' : 'success'} />
        </Grid>
      </Grid>

      {/* Upcoming appointments quick view */}
      {summary?.upcomingAppointments?.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader title="Upcoming Appointments" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
          <Divider />
          <CardContent sx={{ pt: 0 }}>
            {summary.upcomingAppointments.map((a) => (
              <Box key={a.id} display="flex" justifyContent="space-between" alignItems="center"
                py={1} borderBottom="1px solid" borderColor="divider">
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {new Date(a.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{a.purpose}</Typography>
                </Box>
                <Chip label={a.status} size="small" color={statusColor[a.status] || 'default'} />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabbed detail view */}
      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Appointments" icon={<CalendarToday />} iconPosition="start" />
          <Tab label="Invoices" icon={<Receipt />} iconPosition="start" />
          <Tab label="Treatments" icon={<MedicalServices />} iconPosition="start" />
          <Tab label="Documents" icon={<AttachFile />} iconPosition="start" />
        </Tabs>

        <Box p={2}>
          {/* Appointments tab */}
          {tab === 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">No appointments found.</TableCell></TableRow>
                  ) : appointments.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>{new Date(a.appointmentDate).toLocaleDateString()}</TableCell>
                      <TableCell>{a.startTime ? a.startTime.substring(0, 5) : '—'}</TableCell>
                      <TableCell>{a.purpose}</TableCell>
                      <TableCell>
                        <Chip label={a.status} size="small" color={statusColor[a.status] || 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Invoices tab */}
          {tab === 1 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center">No invoices found.</TableCell></TableRow>
                  ) : invoices.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell>{inv.invoiceNumber}</TableCell>
                      <TableCell>{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">₱{inv.totalAmount.toFixed(2)}</TableCell>
                      <TableCell align="right">₱{inv.paidAmount.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Typography color={inv.balanceAmount > 0 ? 'error.main' : 'success.main'} variant="body2" fontWeight={500}>
                          ₱{inv.balanceAmount.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={inv.status} size="small" color={statusColor[inv.status] || 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Treatments tab */}
          {tab === 2 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Diagnosis</TableCell>
                    <TableCell align="right">Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {treatments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">No treatments found.</TableCell></TableRow>
                  ) : treatments.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>{new Date(t.treatmentDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={t.status} size="small" />
                      </TableCell>
                      <TableCell>{t.diagnosis || '—'}</TableCell>
                      <TableCell align="right">₱{t.cost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Documents tab */}
          {tab === 3 && (
            <Documents readOnly />
          )}
        </Box>
      </Paper>
    </Box>
  );
}
