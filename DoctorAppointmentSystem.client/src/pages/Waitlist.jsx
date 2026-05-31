import React, { useState, useEffect, useCallback } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
import {
  Box, Typography, Button, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, Tooltip, Select, MenuItem, FormControl, InputLabel, Grid,
} from '@mui/material';
import { Add, Delete, CheckCircle, Refresh, PersonSearch, PriorityHigh } from '@mui/icons-material';
import { waitlistService } from '../services/waitlistService';
import { patientService } from '../services/patientService';
import { branchService } from '../services/branchService';

const TIME_OPTIONS = ['Morning', 'Afternoon', 'Any'];

const EMPTY = { patientId: '', preferredDentistId: '', branchId: '', reason: '', preferredDateFrom: '', preferredDateTo: '', preferredTimeOfDay: 'Any', isUrgent: false, notes: '' };

export default function Waitlist() {
  const { tenantVersion } = useSuperAdminTenant();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showScheduled, setShowScheduled] = useState(false);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [scheduleDialog, setScheduleDialog] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sum, brs] = await Promise.all([
        waitlistService.getAll({ pending: showScheduled ? undefined : true }),
        waitlistService.getSummary(),
        branchService.getAll()
      ]);
      setEntries(data);
      setSummary(sum);
      setBranches(brs);
    } catch { setError('Failed to load waitlist.'); }
    finally { setLoading(false); }
  }, [showScheduled, tenantVersion]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY); setFormError(''); setDialogOpen(true); };
  const openEdit = (e) => { setEditTarget(e); setForm({ ...e, preferredDateFrom: e.preferredDateFrom?.split('T')[0] || '', preferredDateTo: e.preferredDateTo?.split('T')[0] || '' }); setFormError(''); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.patientId || !form.reason) { setFormError('Patient and reason are required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        patientId: Number(form.patientId),
        preferredDentistId: form.preferredDentistId ? Number(form.preferredDentistId) : null,
        branchId: form.branchId ? Number(form.branchId) : null,
        preferredDateFrom: form.preferredDateFrom || null,
        preferredDateTo: form.preferredDateTo || null,
      };
      if (editTarget) { await waitlistService.update(editTarget.id, payload); setSuccess('Entry updated.'); }
      else { await waitlistService.create(payload); setSuccess('Patient added to waitlist.'); }
      setDialogOpen(false);
      load();
    } catch (err) { setFormError(err?.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) { setError('Please select a scheduled date.'); return; }
    try {
      await waitlistService.markScheduled(scheduleDialog.id, { appointmentId: null, scheduledDate: scheduleDate });
      setScheduleDialog(null);
      setSuccess('Entry marked as scheduled.');
      load();
    } catch { setError('Failed to mark scheduled.'); }
  };

  const handleDelete = async (id) => {
    try { await waitlistService.delete(id); setSuccess('Entry removed.'); load(); }
    catch { setError('Delete failed.'); }
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Appointment Waitlist</Typography>
          <Typography variant="body2" color="text.secondary">Patients waiting for an available appointment slot</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <FormControlLabel control={<Switch checked={showScheduled} onChange={e => setShowScheduled(e.target.checked)} size="small" />}
            label="Show scheduled" />
          <Tooltip title="Refresh"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add to Waitlist</Button>
        </Box>
      </Box>

      {/* Summary */}
      {summary && (
        <Grid container spacing={2} mb={2}>
          {[
            { label: 'Pending', value: summary.pending, color: 'warning.main' },
            { label: 'Urgent', value: summary.urgent, color: 'error.main' },
            { label: 'Scheduled', value: summary.scheduled, color: 'success.main' },
            { label: 'Total', value: summary.total, color: 'text.primary' },
          ].map(c => (
            <Grid item xs={6} sm={3} key={c.label}>
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

      <Paper variant="outlined">
        {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Preferred Dates</TableCell>
                  <TableCell>Time Pref.</TableCell>
                  <TableCell align="center">Urgency</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center">
                    <Box py={3} color="text.secondary"><PersonSearch sx={{ fontSize: 40, mb: 1 }} /><Typography>Waitlist is empty.</Typography></Box>
                  </TableCell></TableRow>
                ) : entries.map(e => (
                  <TableRow key={e.id} hover sx={e.isScheduled ? { opacity: 0.6 } : undefined}>
                    <TableCell><Typography variant="body2" fontWeight={500}>{e.patientName}</Typography></TableCell>
                    <TableCell>{e.patientPhone}</TableCell>
                    <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{e.reason}</Typography></TableCell>
                    <TableCell>
                      {e.preferredDateFrom ? `${new Date(e.preferredDateFrom).toLocaleDateString()} – ${e.preferredDateTo ? new Date(e.preferredDateTo).toLocaleDateString() : '…'}` : '—'}
                    </TableCell>
                    <TableCell>{e.preferredTimeOfDay || '—'}</TableCell>
                    <TableCell align="center">
                      {e.isUrgent && <Chip icon={<PriorityHigh />} label="Urgent" size="small" color="error" />}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={e.isScheduled ? 'Scheduled' : 'Pending'} size="small"
                        color={e.isScheduled ? 'success' : 'warning'} />
                    </TableCell>
                    <TableCell>{new Date(e.requestedDate).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      {!e.isScheduled && (
                        <Tooltip title="Mark Scheduled">
                          <IconButton size="small" color="success" onClick={() => { setScheduleDialog(e); setScheduleDate(''); }}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Remove">
                        <IconButton size="small" color="error" onClick={() => handleDelete(e.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Edit Waitlist Entry' : 'Add Patient to Waitlist'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Box display="flex" gap={2}>
              <TextField label="Patient ID *" value={form.patientId} onChange={f('patientId')} size="small" sx={{ width: 150 }} helperText="Enter patient ID" />
              <TextField label="Preferred Doctor ID" value={form.preferredDentistId} onChange={f('preferredDentistId')} size="small" sx={{ width: 200 }} />
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>Branch</InputLabel>
              <Select value={form.branchId} onChange={e => setForm(p => ({ ...p, branchId: e.target.value }))} label="Branch">
                <MenuItem value="">Any branch</MenuItem>
                {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Reason *" value={form.reason} onChange={f('reason')} size="small" fullWidth required />
            <Box display="flex" gap={2}>
              <TextField label="Preferred From" type="date" value={form.preferredDateFrom} onChange={f('preferredDateFrom')} size="small" InputLabelProps={{ shrink: true }} />
              <TextField label="Preferred To" type="date" value={form.preferredDateTo} onChange={f('preferredDateTo')} size="small" InputLabelProps={{ shrink: true }} />
            </Box>
            <FormControl size="small" sx={{ width: 180 }}>
              <InputLabel>Preferred Time</InputLabel>
              <Select value={form.preferredTimeOfDay} onChange={e => setForm(p => ({ ...p, preferredTimeOfDay: e.target.value }))} label="Preferred Time">
                {TIME_OPTIONS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={form.isUrgent} onChange={e => setForm(p => ({ ...p, isUrgent: e.target.checked }))} />}
              label="Mark as Urgent" />
            <TextField label="Notes" value={form.notes} onChange={f('notes')} size="small" fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Add />}>
            {saving ? 'Saving…' : editTarget ? 'Update' : 'Add to Waitlist'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Confirm Dialog */}
      <Dialog open={!!scheduleDialog} onClose={() => setScheduleDialog(null)} maxWidth="xs">
        <DialogTitle>Mark as Scheduled</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <Typography mb={1}>Confirm scheduling for <strong>{scheduleDialog?.patientName}</strong>.</Typography>
            <TextField label="Scheduled Date *" type="date" value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(null)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleSchedule}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
