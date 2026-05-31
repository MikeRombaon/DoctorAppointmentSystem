import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Chip, IconButton, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, CircularProgress, Alert, Stack, InputAdornment,
  Tabs, Tab, Divider,
} from '@mui/material';
import qrphPayment from '../assets/qrph-payment.png';
import EditIcon from '@mui/icons-material/Edit';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BusinessIcon from '@mui/icons-material/Business';
import RefreshIcon from '@mui/icons-material/Refresh';
import { toast } from 'react-toastify';
import tenantService from '../services/tenantService';
import { format, parseISO } from 'date-fns';

// ── constants ──────────────────────────────────────────────────────────────
const PLANS = ['Trial', 'Monthly', 'Annual', 'Enterprise'];

const STATUS_CONFIG = {
  Active:       { label: 'Active',        color: 'success' },
  ExpiringSoon: { label: 'Expiring Soon', color: 'warning' },
  Expired:      { label: 'Expired',       color: 'error'   },
};

// ── helpers ────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'MMM dd, yyyy'); }
  catch { return iso; }
};

const statusOf = (tenant) => {
  if (tenant.subscriptionStatus) return tenant.subscriptionStatus;
  if (!tenant.subscriptionExpiresAt) return 'Active';
  const exp = new Date(tenant.subscriptionExpiresAt);
  const now = new Date();
  if (exp < now) return 'Expired';
  const soon = new Date(); soon.setDate(soon.getDate() + 14);
  return exp < soon ? 'ExpiringSoon' : 'Active';
};

// ── component ──────────────────────────────────────────────────────────────
export default function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  // dialog state
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dialogTab, setDialogTab] = useState('edit');  // 'edit' | 'qr'
  const [qrRef, setQrRef] = useState('');
  const [form, setForm] = useState({
    subscriptionPlan: 'Trial',
    subscriptionExpiresAt: '',
    subscriptionNotes: '',
  });
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await tenantService.getAll();
      setTenants(data);
    } catch {
      setError('Failed to load tenants. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── dialog helpers ──────────────────────────────────────────────────────
  const openDialog = (tenant) => {
    setSelected(tenant);
    setForm({
      subscriptionPlan: tenant.subscriptionPlan || 'Trial',
      subscriptionExpiresAt: tenant.subscriptionExpiresAt
        ? tenant.subscriptionExpiresAt.split('T')[0]
        : '',
      subscriptionNotes: tenant.subscriptionNotes || '',
    });
    setFormError('');
    setDialogTab('edit');
    setQrRef('');
    setOpen(true);
  };

  const closeDialog = () => { setOpen(false); setSelected(null); };

  const handleFormChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleSave = async () => {
    if (!form.subscriptionPlan) { setFormError('Plan is required.'); return; }
    setSaving(true);
    try {
      await tenantService.updateSubscription(selected.id, {
        subscriptionPlan:      form.subscriptionPlan,
        subscriptionExpiresAt: form.subscriptionExpiresAt || null,
        subscriptionNotes:     form.subscriptionNotes || null,
      });
      toast.success(`Subscription updated for ${selected.name}`);
      closeDialog();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tenant) => {
    try {
      await tenantService.toggleActive(tenant.id);
      toast.info(`${tenant.name} ${tenant.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch {
      toast.error('Could not toggle tenant status.');
    }
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon sx={{ color: '#1a5eb8', fontSize: 30 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a202c', lineHeight: 1.2 }}>
              Tenant Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Manage subscriptions and access for all registered clinics
            </Typography>
          </Box>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={load}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          Refresh
        </Button>
      </Stack>

      {/* Summary chips */}
      {!loading && !error && (
        <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap">
          {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => {
            const count = tenants.filter((t) => statusOf(t) === key).length;
            return (
              <Chip
                key={key}
                label={`${label}: ${count}`}
                color={color}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            );
          })}
          <Chip
            label={`Inactive: ${tenants.filter((t) => !t.isActive).length}`}
            color="default"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f8fc' }}>
                {['Clinic', 'Slug', 'Plan', 'Status', 'Expires', 'Active', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#4a5568', py: 1.5 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#a0aec0' }}>
                    No tenants found.
                  </TableCell>
                </TableRow>
              ) : tenants.map((t) => {
                const status = statusOf(t);
                const sc = STATUS_CONFIG[status] || STATUS_CONFIG.Active;
                return (
                  <TableRow
                    key={t.id}
                    sx={{
                      '&:hover': { bgcolor: '#f7f8fc' },
                      opacity: t.isActive ? 1 : 0.5,
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.name}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#718096', fontFamily: 'monospace' }}>
                      {t.slug}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.subscriptionPlan || 'Trial'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sc.label}
                        color={sc.color}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: status === 'Expired' ? '#e53e3e' : '#4a5568' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {t.subscriptionExpiresAt && <CalendarMonthIcon sx={{ fontSize: 14, opacity: 0.6 }} />}
                        {fmtDate(t.subscriptionExpiresAt)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.isActive ? 'Yes' : 'No'}
                        color={t.isActive ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit Subscription">
                          <IconButton size="small" color="primary" onClick={() => openDialog(t)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t.isActive ? 'Deactivate Tenant' : 'Activate Tenant'}>
                          <IconButton
                            size="small"
                            color={t.isActive ? 'error' : 'success'}
                            onClick={() => handleToggleActive(t)}
                          >
                            <PowerSettingsNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Subscription Dialog */}
      <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
          Edit Subscription
          {selected && (
            <Typography variant="body2" sx={{ color: '#718096', fontWeight: 400 }}>
              {selected.name} &nbsp;·&nbsp; <code style={{ fontSize: '0.78rem' }}>{selected.slug}</code>
            </Typography>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5 }}>
          {/* Dialog tabs */}
          <Tabs
            value={dialogTab}
            onChange={(_, v) => { setDialogTab(v); setFormError(''); }}
            sx={{ mb: 2, borderBottom: '1px solid #e2e8f0',
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', minHeight: 40 },
                  '& .Mui-selected': { color: '#1a5eb8' },
                  '& .MuiTabs-indicator': { bgcolor: '#1a5eb8' } }}
          >
            <Tab value="edit" label="✏️  Edit Subscription" />
            <Tab value="qr"   label="📱  Pay via QR" />
          </Tabs>

          {/* ── Edit tab ── */}
          {dialogTab === 'edit' && (
            <Box>
              {formError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{formError}</Alert>}

              <TextField
                select fullWidth label="Subscription Plan" name="subscriptionPlan"
                value={form.subscriptionPlan} onChange={handleFormChange}
                size="small" sx={{ mb: 2.5 }}
              >
                {PLANS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>

              <TextField
                fullWidth label="Expiry Date" name="subscriptionExpiresAt"
                type="date" size="small"
                value={form.subscriptionExpiresAt} onChange={handleFormChange}
                InputLabelProps={{ shrink: true }}
                helperText="Leave blank for no expiry (lifetime / internal)."
                sx={{ mb: 2.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonthIcon sx={{ fontSize: 17, color: '#a0aec0' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth label="Notes" name="subscriptionNotes"
                multiline rows={3} size="small"
                value={form.subscriptionNotes} onChange={handleFormChange}
                placeholder="e.g. Invoice #1234, renewal reminded via email…"
              />
            </Box>
          )}

          {/* ── QR tab ── */}
          {dialogTab === 'qr' && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.85rem', color: '#4a5568', mb: 2 }}>
                Share this QR code with the clinic admin for subscription renewal payment.
              </Typography>

              <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                         p: 2, bgcolor: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px',
                         gap: 1.5, mb: 2.5 }}>
                <img src={qrphPayment} alt="QR Ph Payment" style={{ width: 220, height: 220, objectFit: 'contain' }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#1a202c', fontSize: '0.9rem' }}>
                    {selected?.name}
                  </Typography>
                  <Typography sx={{ color: '#718096', fontSize: '0.75rem' }}>Renewal — ₱1,000.00 / month</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <TextField
                fullWidth size="small" label="Payment Reference Number"
                placeholder="e.g. GCash ref: 1234567890"
                value={qrRef}
                onChange={(e) => setQrRef(e.target.value)}
                helperText="Once the tenant pays, enter the reference and click Record Payment."
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth variant="contained"
                disabled={!qrRef.trim() || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    // Extend by 30 days from today (or from current expiry if still future)
                    const base = selected?.subscriptionExpiresAt
                      ? new Date(selected.subscriptionExpiresAt) > new Date()
                        ? new Date(selected.subscriptionExpiresAt)
                        : new Date()
                      : new Date();
                    base.setDate(base.getDate() + 30);
                    await tenantService.updateSubscription(selected.id, {
                      subscriptionPlan: 'Monthly',
                      subscriptionExpiresAt: base.toISOString().split('T')[0],
                      subscriptionNotes: `QR payment ref: ${qrRef.trim()}`,
                    });
                    toast.success(`Subscription renewed for ${selected.name}`);
                    closeDialog();
                    load();
                  } catch (err) {
                    setFormError(err.response?.data?.message || 'Failed to record payment.');
                    setDialogTab('edit');
                  } finally {
                    setSaving(false);
                  }
                }}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600,
                      bgcolor: '#1a5eb8', '&:hover': { bgcolor: '#134a94' } }}
              >
                {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Record Payment & Renew (+30 days)'}
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={closeDialog} variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#e2e8f0', color: '#4a5568' }}>
            Cancel
          </Button>
          {dialogTab === 'edit' && (
            <Button onClick={handleSave} variant="contained" disabled={saving}
              sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#1a5eb8',
                    '&:hover': { bgcolor: '#134a94' }, minWidth: 110 }}>
              {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save Changes'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
