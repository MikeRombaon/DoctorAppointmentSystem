import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Grid, Paper,
  TextField, Divider, Switch, FormControlLabel, Chip, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, InputLabel, FormControl, LinearProgress,
} from '@mui/material';
import { Save, Add, Delete, Edit, SettingsApplications, Payments, CheckCircle, HourglassTop, Warning } from '@mui/icons-material';
import { settingsService } from '../services/settingsService';
import tenantService from '../services/tenantService';
import { useAuth } from '../contexts/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_HOURS = DAYS.map((day, i) => ({
  dayOfWeek: day,
  openTime: '08:00',
  closeTime: '17:00',
  isClosed: i === 0, // Sunday closed by default
}));

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Subscription renewal state ────────────────────────────────────────────
  const [tenantInfo, setTenantInfo] = useState(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({ amountPaid: '', currency: 'PHP', referenceNumber: '', paymentMethod: 'GCash', tenantNote: '' });
  const [renewFile, setRenewFile] = useState(null);
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');
  const [myPayments, setMyPayments] = useState([]);
  const fileRef = useRef();

  const loadMyPayments = async (tid) => {
    try {
      const all = await tenantService.getPayments('');
      setMyPayments(all.filter(p => p.tenantId === tid));
    } catch { /* silent */ }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await settingsService.get();
        setSettings(data);
        setForm(data);
        if (data.workingHoursJson) {
          try { setHours(JSON.parse(data.workingHoursJson)); } catch { /* use defaults */ }
        }
        // Load tenant subscription info for the current tenant admin
        if (user?.tenantId) {
          try {
            const tenants = await tenantService.getAll();
            const t = tenants.find(x => x.id === user.tenantId);
            setTenantInfo(t || null);
            if (t) loadMyPayments(t.id);
          } catch { /* silent */ }
        }
      } catch {
        setError('Failed to load clinic settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleHours = (idx, field, value) =>
    setHours((h) => h.map((d, i) => i === idx ? { ...d, [field]: value } : d));

  const handleSave = async () => {
    if (!form?.clinicName) { setError('Clinic name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await settingsService.update({
        ...form,
        workingHoursJson: JSON.stringify(hours),
      });
      setSuccess('Settings saved successfully.');
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRenewSubmit = async () => {
    if (!renewForm.amountPaid || !renewForm.referenceNumber) {
      setRenewError('Amount and reference number are required.');
      return;
    }
    setRenewSaving(true);
    setRenewError('');
    try {
      const fd = new FormData();
      fd.append('amountPaid', renewForm.amountPaid);
      fd.append('currency', renewForm.currency);
      fd.append('referenceNumber', renewForm.referenceNumber);
      fd.append('paymentMethod', renewForm.paymentMethod);
      fd.append('tenantNote', renewForm.tenantNote);
      if (renewFile) fd.append('proofFile', renewFile);
      await tenantService.submitPayment(tenantInfo.id, fd);
      setRenewSuccess('Payment submitted! SuperAdmin will review and activate your subscription.');
      setRenewOpen(false);
      setRenewForm({ amountPaid: '', currency: 'PHP', referenceNumber: '', paymentMethod: 'GCash', tenantNote: '' });
      setRenewFile(null);
      loadMyPayments(tenantInfo.id);
    } catch {
      setRenewError('Failed to submit payment. Please try again.');
    } finally {
      setRenewSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Clinic Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure clinic identity, working hours, and system defaults
          </Typography>
        </Box>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={16} /> : <Save />}
          onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* ── Clinic Identity ──────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Clinic Identity</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Clinic Name *" value={form?.clinicName ?? ''} onChange={handleField('clinicName')}
                  size="small" fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Website" value={form?.website ?? ''} onChange={handleField('website')}
                  size="small" fullWidth placeholder="https://…" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone" value={form?.phone ?? ''} onChange={handleField('phone')}
                  size="small" fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email" value={form?.email ?? ''} onChange={handleField('email')}
                  size="small" fullWidth type="email" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Tax ID / TIN" value={form?.taxId ?? ''} onChange={handleField('taxId')}
                  size="small" fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Logo URL" value={form?.logoUrl ?? ''} onChange={handleField('logoUrl')}
                  size="small" fullWidth placeholder="https://…/logo.png" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ── Address ──────────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Address</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label="Street Address" value={form?.address ?? ''} onChange={handleField('address')}
                  size="small" fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="City" value={form?.city ?? ''} onChange={handleField('city')}
                  size="small" fullWidth />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField label="State / Province" value={form?.state ?? ''} onChange={handleField('state')}
                  size="small" fullWidth />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField label="Postal Code" value={form?.postalCode ?? ''} onChange={handleField('postalCode')}
                  size="small" fullWidth />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ── Appointment Defaults ─────────────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Appointment Defaults</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Default Duration (min)" type="number"
                  value={form?.defaultAppointmentDurationMinutes ?? 30}
                  onChange={handleField('defaultAppointmentDurationMinutes')}
                  size="small" fullWidth inputProps={{ min: 5, step: 5 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Slot Interval (min)" type="number"
                  value={form?.slotIntervalMinutes ?? 15}
                  onChange={handleField('slotIntervalMinutes')}
                  size="small" fullWidth inputProps={{ min: 5, step: 5 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Reminder Days Before" type="number"
                  value={form?.reminderDaysBeforeAppointment ?? 1}
                  onChange={handleField('reminderDaysBeforeAppointment')}
                  size="small" fullWidth inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Recall Interval (months)" type="number"
                  value={form?.recallIntervalMonths ?? 6}
                  onChange={handleField('recallIntervalMonths')}
                  size="small" fullWidth inputProps={{ min: 1 }} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ── Locale / Currency ────────────────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Locale & Currency</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Currency Symbol" value={form?.currencySymbol ?? '₱'}
                  onChange={handleField('currencySymbol')} size="small" fullWidth sx={{ maxWidth: 120 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Time Zone" value={form?.timeZone ?? 'Asia/Manila'}
                  onChange={handleField('timeZone')} size="small" fullWidth
                  placeholder="e.g. Asia/Manila" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ── Working Hours ─────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Working Hours</Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    <TableCell>Open</TableCell>
                    <TableCell>Close</TableCell>
                    <TableCell align="center">Closed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hours.map((row, i) => (
                    <TableRow key={row.dayOfWeek} sx={row.isClosed ? { opacity: 0.5 } : undefined}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{row.dayOfWeek}</Typography>
                      </TableCell>
                      <TableCell>
                        <TextField type="time" value={row.openTime}
                          onChange={(e) => handleHours(i, 'openTime', e.target.value)}
                          size="small" disabled={row.isClosed} sx={{ width: 130 }}
                          InputLabelProps={{ shrink: true }} />
                      </TableCell>
                      <TableCell>
                        <TextField type="time" value={row.closeTime}
                          onChange={(e) => handleHours(i, 'closeTime', e.target.value)}
                          size="small" disabled={row.isClosed} sx={{ width: 130 }}
                          InputLabelProps={{ shrink: true }} />
                      </TableCell>
                      <TableCell align="center">
                        <Switch size="small" checked={row.isClosed}
                          onChange={(e) => handleHours(i, 'isClosed', e.target.checked)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* ── Subscription Status (non-SuperAdmin only) ─────────────────── */}
        {tenantInfo && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={600}>Subscription</Typography>
                <Button variant="contained" color="primary" startIcon={<Payments />}
                  onClick={() => { setRenewOpen(true); setRenewError(''); setRenewSuccess(''); }}>
                  Renew Subscription
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {renewSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRenewSuccess('')}>{renewSuccess}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Plan</Typography>
                  <Typography variant="body1" fontWeight={600}>{tenantInfo.subscriptionPlan || 'Trial'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    size="small"
                    label={tenantInfo.subscriptionStatus}
                    color={tenantInfo.subscriptionStatus === 'Active' ? 'success' : tenantInfo.subscriptionStatus === 'ExpiringSoon' ? 'warning' : 'error'}
                    icon={tenantInfo.subscriptionStatus === 'Active' ? <CheckCircle /> : tenantInfo.subscriptionStatus === 'ExpiringSoon' ? <Warning /> : <HourglassTop />}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Expires</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {tenantInfo.subscriptionExpiresAt ? new Date(tenantInfo.subscriptionExpiresAt).toLocaleDateString() : 'No expiry'}
                  </Typography>
                </Grid>
              </Grid>

              {/* My payment history */}
              {myPayments.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>My Payment Submissions</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Note</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {myPayments.map(p => (
                          <TableRow key={p.id}>
                            <TableCell>{new Date(p.submittedAt).toLocaleDateString()}</TableCell>
                            <TableCell>{p.currency} {Number(p.amountPaid).toLocaleString()}</TableCell>
                            <TableCell>{p.referenceNumber}</TableCell>
                            <TableCell>{p.paymentMethod}</TableCell>
                            <TableCell>
                              <Chip size="small"
                                label={p.status}
                                color={p.status === 'Approved' ? 'success' : p.status === 'Rejected' ? 'error' : 'warning'} />
                            </TableCell>
                            <TableCell>{p.rejectionNote || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Save footer */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button variant="contained" size="large"
              startIcon={saving ? <CircularProgress size={18} /> : <Save />}
              onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save All Settings'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* ── Renewal Dialog ────────────────────────────────────────────────── */}
      <Dialog open={renewOpen} onClose={() => setRenewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Subscription Payment</DialogTitle>
        <DialogContent dividers>
          {renewError && <Alert severity="error" sx={{ mb: 2 }}>{renewError}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Transfer your monthly subscription fee and fill in the details below.
            Your subscription will be activated once SuperAdmin confirms your payment.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label="Amount Paid *" type="number" value={renewForm.amountPaid}
                onChange={e => setRenewForm(f => ({ ...f, amountPaid: e.target.value }))}
                size="small" fullWidth inputProps={{ min: 0, step: 0.01 }} />
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select label="Currency" value={renewForm.currency}
                  onChange={e => setRenewForm(f => ({ ...f, currency: e.target.value }))}>
                  <MenuItem value="PHP">PHP</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Reference / Transaction No. *" value={renewForm.referenceNumber}
                onChange={e => setRenewForm(f => ({ ...f, referenceNumber: e.target.value }))}
                size="small" fullWidth placeholder="e.g. 1234567890" />
            </Grid>
            <Grid item xs={12}>
              <FormControl size="small" fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select label="Payment Method" value={renewForm.paymentMethod}
                  onChange={e => setRenewForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  <MenuItem value="GCash">GCash</MenuItem>
                  <MenuItem value="Maya">Maya</MenuItem>
                  <MenuItem value="BPI Transfer">BPI Transfer</MenuItem>
                  <MenuItem value="BDO Transfer">BDO Transfer</MenuItem>
                  <MenuItem value="QR Ph">QR Ph</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Note (optional)" value={renewForm.tenantNote}
                onChange={e => setRenewForm(f => ({ ...f, tenantNote: e.target.value }))}
                size="small" fullWidth multiline rows={2}
                placeholder="e.g. Paying for June 2026" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Proof of Payment (screenshot / receipt)
              </Typography>
              <input ref={fileRef} type="file" accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={e => setRenewFile(e.target.files?.[0] || null)} />
              <Button variant="outlined" size="small" onClick={() => fileRef.current.click()}>
                {renewFile ? renewFile.name : 'Upload Screenshot / PDF'}
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRenewSubmit} disabled={renewSaving}
            startIcon={renewSaving ? <CircularProgress size={16} /> : <Payments />}>
            {renewSaving ? 'Submitting…' : 'Submit Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
