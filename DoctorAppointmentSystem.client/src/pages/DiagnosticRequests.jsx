import React, { useState, useEffect, useCallback } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
import {
  Box, Typography, Button, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select,
  MenuItem, FormControl, InputLabel, Tooltip, TablePagination, InputAdornment,
  Grid, Divider,
} from '@mui/material';
import {
  Add, Edit, Delete, Refresh, Search, Science as ScienceIcon, CheckCircle,
} from '@mui/icons-material';
import { diagnosticRequestService } from '../services/diagnosticRequestService';
import { patientService } from '../services/patientService';
import { userService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const TEST_TYPES = [
  'Blood Chemistry', 'CBC', 'Urinalysis', 'Fecalysis', 'ECG',
  'X-Ray', '2D Echo', 'CT Scan', 'MRI', 'Ultrasound',
  'Thyroid Function', 'Lipid Profile', 'HbA1c', 'Blood Glucose', 'Other',
];

const URGENCY_OPTIONS = ['Routine', 'Urgent', 'Stat'];

const STATUSES = ['Pending', 'Collected', 'Processing', 'Resulted', 'Cancelled'];
const STATUS_COLORS = {
  Pending: 'warning',
  Collected: 'info',
  Processing: 'primary',
  Resulted: 'success',
  Cancelled: 'error',
};

const EMPTY_FORM = {
  patientId: '',
  orderedByDoctorId: '',
  testType: '',
  testName: '',
  urgency: 'Routine',
  clinicalIndication: '',
  specialInstructions: '',
  notes: '',
};

const EMPTY_RESULT_FORM = {
  status: '',
  resultsSummary: '',
  resultDate: '',
  performedByLab: '',
};

export default function DiagnosticRequests() {
  const { tenantVersion } = useSuperAdminTenant();
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Result dialog
  const [resultDialog, setResultDialog] = useState(null);
  const [resultForm, setResultForm] = useState(EMPTY_RESULT_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, sum] = await Promise.all([
        diagnosticRequestService.getAll({
          page: page + 1,
          pageSize,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        diagnosticRequestService.getSummary(),
      ]);
      setRequests(data.items || []);
      setTotal(data.totalCount || 0);
      setSummary(sum);
    } catch {
      setError('Failed to load diagnostic requests.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search, tenantVersion]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [p, d] = await Promise.all([
          patientService.getAll(1, 200),
          userService.getAll ? userService.getAll(1, 200) : Promise.resolve({ items: [] }),
        ]);
        setPatients(p.items || []);
        setDoctors((d.items || []).filter(u => u.role === 'ClinicalStaff' || u.role === 'Admin'));
      } catch { /* non-critical */ }
    };
    fetchLookups();
  }, [tenantVersion]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, orderedByDoctorId: user?.id || '' });
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (r) => {
    setEditTarget(r);
    setForm({
      patientId: r.patientId,
      orderedByDoctorId: r.orderedByDoctorId,
      testType: r.testType,
      testName: r.testName,
      urgency: r.urgency,
      clinicalIndication: r.clinicalIndication || '',
      specialInstructions: r.specialInstructions || '',
      notes: r.notes || '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.patientId || !form.orderedByDoctorId || !form.testType || !form.testName) {
      setFormError('Patient, Doctor, Test Type, and Test Name are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editTarget) {
        await diagnosticRequestService.update(editTarget.id, form);
        toast.success('Diagnostic request updated.');
      } else {
        await diagnosticRequestService.create(form);
        toast.success('Diagnostic request created.');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this diagnostic request?')) return;
    try {
      await diagnosticRequestService.delete(id);
      toast.success('Deleted.');
      load();
    } catch {
      toast.error('Failed to delete.');
    }
  };

  const openResultDialog = (r) => {
    setResultDialog(r);
    setResultForm({
      status: r.status,
      resultsSummary: r.resultsSummary || '',
      resultDate: r.resultDate ? r.resultDate.split('T')[0] : new Date().toISOString().split('T')[0],
      performedByLab: r.performedByLab || '',
    });
  };

  const handleSaveResult = async () => {
    try {
      await diagnosticRequestService.update(resultDialog.id, resultForm);
      toast.success('Results recorded.');
      setResultDialog(null);
      load();
    } catch {
      toast.error('Failed to save results.');
    }
  };

  const patientName = (r) =>
    r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : `Patient #${r.patientId}`;

  const doctorName = (r) =>
    r.orderedByDoctor
      ? `Dr. ${r.orderedByDoctor.firstName} ${r.orderedByDoctor.lastName}`
      : `Doctor #${r.orderedByDoctorId}`;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight={700}>Diagnostic Requests</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          New Request
        </Button>
      </Box>

      {/* Summary chips */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Pending', value: summary.pending, color: 'warning' },
            { label: 'Collected', value: summary.collected, color: 'info' },
            { label: 'Processing', value: summary.processing, color: 'primary' },
            { label: 'Resulted', value: summary.resulted, color: 'success' },
          ].map(({ label, value, color }) => (
            <Paper key={label} elevation={1} sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={value} color={color} size="small" />
              <Typography variant="body2">{label}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search patient, test…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <Tooltip title="Refresh">
          <IconButton onClick={load}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Request #</strong></TableCell>
              <TableCell><strong>Patient</strong></TableCell>
              <TableCell><strong>Test Type</strong></TableCell>
              <TableCell><strong>Test Name</strong></TableCell>
              <TableCell><strong>Urgency</strong></TableCell>
              <TableCell><strong>Ordered By</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No diagnostic requests found.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.requestNumber}</TableCell>
                  <TableCell>{patientName(r)}</TableCell>
                  <TableCell>{r.testType}</TableCell>
                  <TableCell>{r.testName}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.urgency}
                      size="small"
                      color={r.urgency === 'Stat' ? 'error' : r.urgency === 'Urgent' ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{doctorName(r)}</TableCell>
                  <TableCell>{new Date(r.requestDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={r.status} size="small" color={STATUS_COLORS[r.status] || 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Record Results">
                      <IconButton size="small" color="success" onClick={() => openResultDialog(r)}>
                        <CheckCircle fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(r)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[pageSize]}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Edit Diagnostic Request' : 'New Diagnostic Request'}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Patient</InputLabel>
                <Select
                  value={form.patientId}
                  label="Patient"
                  onChange={(e) => setForm(f => ({ ...f, patientId: e.target.value }))}
                >
                  {patients.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Ordering Doctor</InputLabel>
                <Select
                  value={form.orderedByDoctorId}
                  label="Ordering Doctor"
                  onChange={(e) => setForm(f => ({ ...f, orderedByDoctorId: e.target.value }))}
                >
                  {doctors.map(d => (
                    <MenuItem key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Test Type</InputLabel>
                <Select
                  value={form.testType}
                  label="Test Type"
                  onChange={(e) => setForm(f => ({ ...f, testType: e.target.value }))}
                >
                  {TEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Urgency</InputLabel>
                <Select
                  value={form.urgency}
                  label="Urgency"
                  onChange={(e) => setForm(f => ({ ...f, urgency: e.target.value }))}
                >
                  {URGENCY_OPTIONS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Test / Exam Name"
                size="small"
                fullWidth
                required
                value={form.testName}
                onChange={(e) => setForm(f => ({ ...f, testName: e.target.value }))}
                placeholder="e.g. Complete Blood Count, 12-Lead ECG, Chest PA"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Clinical Indication"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={form.clinicalIndication}
                onChange={(e) => setForm(f => ({ ...f, clinicalIndication: e.target.value }))}
                placeholder="Reason for ordering this test"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Special Instructions"
                size="small"
                fullWidth
                value={form.specialInstructions}
                onChange={(e) => setForm(f => ({ ...f, specialInstructions: e.target.value }))}
                placeholder="e.g. Fasting required, NPO after midnight"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Results Dialog */}
      <Dialog open={!!resultDialog} onClose={() => setResultDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Results — {resultDialog?.testName}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={resultForm.status}
                  label="Status"
                  onChange={(e) => setResultForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Result Date"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={resultForm.resultDate}
                onChange={(e) => setResultForm(f => ({ ...f, resultDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Performed By (Lab / Facility)"
                size="small"
                fullWidth
                value={resultForm.performedByLab}
                onChange={(e) => setResultForm(f => ({ ...f, performedByLab: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>Results Summary</Typography>
              <TextField
                multiline
                rows={5}
                fullWidth
                size="small"
                placeholder="Enter key findings, values, or paste the results summary…"
                value={resultForm.resultsSummary}
                onChange={(e) => setResultForm(f => ({ ...f, resultsSummary: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultDialog(null)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleSaveResult}>
            Save Results
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
