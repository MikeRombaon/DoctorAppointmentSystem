import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, CircularProgress, Tabs, Tab, Divider,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select,
} from '@mui/material';
import {
  CalendarToday, Receipt, MedicalServices, AttachFile,
  AccountBalance, Add as AddIcon,
} from '@mui/icons-material';
import { portalService } from '../services/portalService';
import userService from '../services/userService';
import { toast } from 'react-toastify';
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

  const emptyBook = { doctorId: '', date: '', startTime: '', endTime: '', purpose: '', notes: '' };
  const [bookDialog, setBookDialog] = useState({ open: false, submitting: false, errors: {}, ...emptyBook });
  const [doctors, setDoctors] = useState([]);

  const loadPortal = async () => {
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

  useEffect(() => { loadPortal(); }, []);

  const openBookDialog = async () => {
    if (doctors.length === 0) {
      try {
        const list = await userService.getClinicalStaff();
        setDoctors(list || []);
      } catch {
        toast.error('Could not load doctors list.');
        return;
      }
    }
    setBookDialog((prev) => ({ ...prev, open: true }));
  };

  const closeBookDialog = () => {
    setBookDialog({ open: false, submitting: false, errors: {}, ...emptyBook });
  };

  const handleDoctorChange = (e) => {
    setBookDialog((prev) => ({ ...prev, doctorId: e.target.value, errors: { ...prev.errors, doctorId: undefined } }));
  };

  const handleDateChange = (e) => {
    setBookDialog((prev) => ({ ...prev, date: e.target.value, errors: { ...prev.errors, date: undefined } }));
  };

  const validateBook = (dialog) => {
    const errs = {};
    if (!dialog.doctorId) errs.doctorId = 'Please select a doctor';
    if (!dialog.date) errs.date = 'Please select a date';
    else if (new Date(dialog.date) < new Date(new Date().toDateString())) errs.date = 'Date cannot be in the past';
    if (!dialog.startTime) errs.startTime = 'Start time is required';
    if (!dialog.endTime) errs.endTime = 'End time is required';
    else if (dialog.startTime && dialog.endTime <= dialog.startTime) errs.endTime = 'End time must be after start time';
    if (!dialog.purpose.trim()) errs.purpose = 'Please enter the reason for your visit';
    return errs;
  };

  const handleBookSubmit = async () => {
    const errs = validateBook(bookDialog);
    if (Object.keys(errs).length > 0) { setBookDialog((prev) => ({ ...prev, errors: errs })); return; }
    setBookDialog((prev) => ({ ...prev, submitting: true }));
    try {
      await portalService.bookAppointment({
        doctorId: Number(bookDialog.doctorId),
        appointmentDate: bookDialog.date,
        startTime: bookDialog.startTime + ':00',
        endTime: bookDialog.endTime + ':00',
        purpose: bookDialog.purpose,
        notes: bookDialog.notes || null,
      });
      toast.success('Appointment booked successfully!');
      closeBookDialog();
      loadPortal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book appointment.');
      setBookDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
      <CircularProgress />
    </Box>
  );

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box maxWidth={1100} mx="auto">
      {/* Welcome banner */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Welcome, {summary?.patient?.fullName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Patient Portal — view your appointments, treatments, invoices, and documents.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openBookDialog}>
          Book Appointment
        </Button>
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

      {/* Book Appointment Dialog */}
      <Dialog open={bookDialog.open} onClose={closeBookDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Schedule New Appointment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Patient — auto-filled, read-only */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Patient *"
                value={summary?.patient?.fullName || ''}
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Doctor */}
            <Grid item xs={12}>
              <FormControl fullWidth error={Boolean(bookDialog.errors.doctorId)}>
                <InputLabel>Doctor *</InputLabel>
                <Select
                  value={bookDialog.doctorId}
                  onChange={handleDoctorChange}
                  label="Doctor *"
                >
                  {doctors.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.fullName}{d.specialization ? ` — ${d.specialization}` : ''}
                    </MenuItem>
                  ))}
                </Select>
                {bookDialog.errors.doctorId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {bookDialog.errors.doctorId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Appointment Date */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Appointment Date *"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                value={bookDialog.date}
                onChange={handleDateChange}
                error={Boolean(bookDialog.errors.date)}
                helperText={bookDialog.errors.date}
              />
            </Grid>

            {/* Start Time / End Time */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="Start Time *"
                InputLabelProps={{ shrink: true }}
                value={bookDialog.startTime}
                onChange={(e) =>
                  setBookDialog((prev) => ({ ...prev, startTime: e.target.value, errors: { ...prev.errors, startTime: undefined } }))
                }
                error={Boolean(bookDialog.errors.startTime)}
                helperText={bookDialog.errors.startTime}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="End Time *"
                InputLabelProps={{ shrink: true }}
                value={bookDialog.endTime}
                onChange={(e) =>
                  setBookDialog((prev) => ({ ...prev, endTime: e.target.value, errors: { ...prev.errors, endTime: undefined } }))
                }
                error={Boolean(bookDialog.errors.endTime)}
                helperText={bookDialog.errors.endTime}
              />
            </Grid>

            {/* Purpose */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Purpose *"
                value={bookDialog.purpose}
                onChange={(e) =>
                  setBookDialog((prev) => ({ ...prev, purpose: e.target.value, errors: { ...prev.errors, purpose: undefined } }))
                }
                error={Boolean(bookDialog.errors.purpose)}
                helperText={bookDialog.errors.purpose}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={bookDialog.notes}
                onChange={(e) => setBookDialog((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeBookDialog} disabled={bookDialog.submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBookSubmit}
            disabled={bookDialog.submitting}
          >
            {bookDialog.submitting ? 'Scheduling…' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
