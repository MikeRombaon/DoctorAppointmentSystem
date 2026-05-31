import React, { useState, useEffect, useCallback } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
import {
  Box, Typography, Button, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select,
  MenuItem, FormControl, InputLabel, Tooltip, TablePagination, InputAdornment, Grid,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Search, Science, Print } from '@mui/icons-material';
import { labOrderService } from '../services/labOrderService';
import { patientService } from '../services/patientService';

const STATUS_COLORS = { Ordered: 'info', InProgress: 'warning', Ready: 'success', Delivered: 'primary', Received: 'default', Cancelled: 'error' };
const STATUSES = ['Ordered', 'InProgress', 'Ready', 'Delivered', 'Received', 'Cancelled'];

const EMPTY_FORM = { patientId: '', orderedByDentistId: '', branchId: '', labName: '', workType: '', toothNumbers: '', shade: '', instructions: '', dueDate: '', estimatedCost: '', notes: '' };

export default function LabOrders() {
  const { tenantVersion } = useSuperAdminTenant();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [statusDialog, setStatusDialog] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: '', actualCost: '', trackingNumber: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sum] = await Promise.all([
        labOrderService.getAll({ page: page + 1, pageSize: 20, status: statusFilter || undefined, search: search || undefined }),
        labOrderService.getSummary()
      ]);
      setOrders(data.items || []);
      setTotal(data.totalCount || 0);
      setSummary(sum);
    } catch { setError('Failed to load lab orders.'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search, tenantVersion]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); setDialogOpen(true); };
  const openEdit = (o) => {
    setEditTarget(o);
    setForm({ labName: o.labName, workType: o.workType, toothNumbers: o.toothNumbers || '', shade: o.shade || '', instructions: o.instructions || '', dueDate: o.dueDate ? o.dueDate.split('T')[0] : '', estimatedCost: o.estimatedCost || '', trackingNumber: o.trackingNumber || '', notes: o.notes || '' });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.labName || !form.workType) { setFormError('Lab name and work type are required.'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await labOrderService.update(editTarget.id, { ...form, dueDate: form.dueDate || null, estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null });
        setSuccess('Lab order updated.');
      } else {
        if (!form.patientId) { setFormError('Patient is required.'); setSaving(false); return; }
        await labOrderService.create({ ...form, patientId: Number(form.patientId), orderedByDentistId: Number(form.orderedByDentistId) || 0, dueDate: form.dueDate || null, estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null });
        setSuccess('Lab order created.');
      }
      setDialogOpen(false);
      load();
    } catch (err) { setFormError(err?.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async () => {
    if (!statusForm.status) return;
    try {
      await labOrderService.updateStatus(statusDialog.id, { status: statusForm.status, actualCost: statusForm.actualCost ? Number(statusForm.actualCost) : null, trackingNumber: statusForm.trackingNumber || null });
      setStatusDialog(null);
      setSuccess(`Lab order status updated to ${statusForm.status}.`);
      load();
    } catch { setError('Status update failed.'); }
  };

  const handleDelete = async (id) => {
    try { await labOrderService.delete(id); setSuccess('Lab order deleted.'); load(); }
    catch (err) { setError(err?.response?.data?.message || 'Delete failed.'); }
  };

  const handlePrint = (o) => {
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
      <!DOCTYPE html><html><head><title>Lab Order — ${o.orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .subtitle { font-size: 12px; color: #555; margin-bottom: 24px; }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase;
          color: #555; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
        .row { display: flex; gap: 32px; margin-bottom: 6px; }
        .field { flex: 1; }
        .label { font-size: 11px; color: #777; }
        .value { font-size: 13px; font-weight: 500; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 12px;
          font-size: 11px; font-weight: bold; background: #e3f2fd; color: #1565c0; }
        .footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>Lab Order Request</h1>
      <div class="subtitle">Order No: <strong>${o.orderNumber}</strong> &nbsp;|&nbsp; Printed: ${new Date().toLocaleString()}</div>

      <div class="section">
        <div class="section-title">Patient Information</div>
        <div class="row">
          <div class="field"><div class="label">Patient Name</div><div class="value">${o.patientName || '—'}</div></div>
          <div class="field"><div class="label">Ordered By (Doctor)</div><div class="value">${o.orderedByDentistName || '—'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Lab Details</div>
        <div class="row">
          <div class="field"><div class="label">Lab Name</div><div class="value">${o.labName || '—'}</div></div>
          <div class="field"><div class="label">Work Type</div><div class="value">${o.workType || '—'}</div></div>
        </div>
        <div class="row">
          <div class="field"><div class="label">Tooth Numbers</div><div class="value">${o.toothNumbers || '—'}</div></div>
          <div class="field"><div class="label">Shade</div><div class="value">${o.shade || '—'}</div></div>
        </div>
        <div class="row">
          <div class="field"><div class="label">Due Date</div><div class="value">${o.dueDate ? new Date(o.dueDate).toLocaleDateString() : '—'}</div></div>
          <div class="field"><div class="label">Status</div><div class="value"><span class="badge">${o.status}</span></div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Instructions</div>
        <div class="value">${o.instructions || '—'}</div>
      </div>

      <div class="section">
        <div class="section-title">Cost</div>
        <div class="row">
          <div class="field"><div class="label">Estimated Cost</div><div class="value">${o.estimatedCost ? '₱' + Number(o.estimatedCost).toLocaleString() : '—'}</div></div>
          <div class="field"><div class="label">Actual Cost</div><div class="value">${o.actualCost ? '₱' + Number(o.actualCost).toLocaleString() : '—'}</div></div>
        </div>
      </div>

      ${o.notes ? `<div class="section"><div class="section-title">Notes</div><div class="value">${o.notes}</div></div>` : ''}

      <div class="footer">Generated by Doctor Appointment System &mdash; ${new Date().toLocaleString()}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Lab Orders</Typography>
          <Typography variant="body2" color="text.secondary">Track dental lab work orders from creation to receipt</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>New Lab Order</Button>
        </Box>
      </Box>

      {/* Summary cards */}
      {summary && (
        <Grid container spacing={2} mb={2}>
          {[
            { label: 'Total', value: summary.total, color: 'text.primary' },
            { label: 'Ordered', value: summary.ordered, color: 'info.main' },
            { label: 'In Progress', value: summary.inProgress, color: 'warning.main' },
            { label: 'Ready', value: summary.ready, color: 'success.main' },
            { label: 'Overdue', value: summary.overdue, color: 'error.main' },
          ].map(c => (
            <Grid item xs={6} sm={4} md={2} key={c.label}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField size="small" placeholder="Search…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }} sx={{ width: { xs: '100%', sm: 260 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} label="Status">
            <MenuItem value="">All</MenuItem>
            {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Paper variant="outlined">
        {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order #</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Lab</TableCell>
                    <TableCell>Work Type</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Est. Cost</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center">
                      <Box py={3} color="text.secondary"><Science sx={{ fontSize: 40, mb: 1 }} /><Typography>No lab orders found.</Typography></Box>
                    </TableCell></TableRow>
                  ) : orders.map(o => (
                    <TableRow key={o.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={500}>{o.orderNumber}</Typography></TableCell>
                      <TableCell>{o.patientName}</TableCell>
                      <TableCell>{o.labName}</TableCell>
                      <TableCell>{o.workType}</TableCell>
                      <TableCell>
                        {o.dueDate ? (
                          <Chip label={new Date(o.dueDate).toLocaleDateString()} size="small"
                            color={o.status !== 'Received' && o.status !== 'Cancelled' && new Date(o.dueDate) < new Date() ? 'error' : 'default'} />
                        ) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={o.status} size="small" color={STATUS_COLORS[o.status] || 'default'}
                          onClick={() => { setStatusDialog(o); setStatusForm({ status: o.status, actualCost: '', trackingNumber: o.trackingNumber || '' }); }}
                          sx={{ cursor: 'pointer' }} />
                      </TableCell>
                      <TableCell align="right">{o.estimatedCost ? `₱${Number(o.estimatedCost).toLocaleString()}` : '—'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Print"><IconButton size="small" onClick={() => handlePrint(o)}><Print fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(o)}><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(o.id)}><Delete fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={total} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]} />
          </>
        )}
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Edit Lab Order' : 'New Lab Order'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {!editTarget && (
              <Box display="flex" gap={2}>
                <TextField label="Patient ID *" value={form.patientId} onChange={f('patientId')} size="small" sx={{ width: 150 }} helperText="Enter patient ID" />
                <TextField label="Doctor ID" value={form.orderedByDentistId} onChange={f('orderedByDentistId')} size="small" sx={{ width: 150 }} helperText="Enter doctor ID" />
              </Box>
            )}
            <Box display="flex" gap={2}>
              <TextField label="Lab Name *" value={form.labName} onChange={f('labName')} size="small" fullWidth required />
              <TextField label="Work Type *" value={form.workType} onChange={f('workType')} size="small" fullWidth placeholder="Crown, Bridge…" required />
            </Box>
            <Box display="flex" gap={2}>
              <TextField label="Tooth Numbers" value={form.toothNumbers} onChange={f('toothNumbers')} size="small" fullWidth placeholder="e.g. 11,12" />
              <TextField label="Shade" value={form.shade} onChange={f('shade')} size="small" sx={{ width: 130 }} />
            </Box>
            <TextField label="Instructions" value={form.instructions} onChange={f('instructions')} size="small" multiline rows={2} fullWidth />
            <Box display="flex" gap={2}>
              <TextField label="Due Date" type="date" value={form.dueDate} onChange={f('dueDate')} size="small" InputLabelProps={{ shrink: true }} />
              <TextField label="Estimated Cost" type="number" value={form.estimatedCost} onChange={f('estimatedCost')} size="small" sx={{ width: 160 }} />
            </Box>
            <TextField label="Notes" value={form.notes} onChange={f('notes')} size="small" fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Add />}>
            {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={!!statusDialog} onClose={() => setStatusDialog(null)} maxWidth="xs">
        <DialogTitle>Update Status — {statusDialog?.orderNumber}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusForm.status} onChange={e => setStatusForm(s => ({ ...s, status: e.target.value }))} label="Status">
                {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Actual Cost" type="number" size="small" value={statusForm.actualCost}
              onChange={e => setStatusForm(s => ({ ...s, actualCost: e.target.value }))} fullWidth />
            <TextField label="Tracking Number" size="small" value={statusForm.trackingNumber}
              onChange={e => setStatusForm(s => ({ ...s, trackingNumber: e.target.value }))} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateStatus}>Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
