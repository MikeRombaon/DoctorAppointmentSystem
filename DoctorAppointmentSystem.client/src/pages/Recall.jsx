import React, { useState, useEffect, useCallback } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
import {
  Box, Typography, Button, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Tooltip, Grid, Card, CardContent,
  TablePagination, Autocomplete,
} from '@mui/material';
import {
  Add, Check, Notifications, Delete, Refresh, EventRepeat,
} from '@mui/icons-material';
import { recallService } from '../services/recallService';
import { patientService } from '../services/patientService';

const RECALL_REASONS = ['Routine Checkup', 'Follow-Up', 'Treatment Review', 'Scaling', 'Post-Op', 'Other'];
const STATUS_TABS = [
  { value: 'due', label: 'Due This Week', color: 'warning' },
  { value: 'upcoming', label: 'Upcoming (30d)', color: 'info' },
  { value: 'overdue', label: 'Overdue', color: 'error' },
  { value: 'completed', label: 'Completed', color: 'success' },
];

export default function Recall() {
  const { tenantVersion } = useSuperAdminTenant();
  const [status, setStatus] = useState('due');
  const [recalls, setRecalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ patientId: '', dueDate: '', reason: 'Routine Checkup', notes: '' });
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirm dialogs
  const [completeTarget, setCompleteTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadSummary = useCallback(async () => {
    try { setSummary(await recallService.getSummary()); } catch { /* non-critical */ }
  }, [tenantVersion]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await recallService.getAll({ status, page: page + 1, pageSize: rowsPerPage });
      setRecalls(result.items || []);
      setTotal(result.total || 0);
    } catch {
      setError('Failed to load recalls.');
    } finally {
      setLoading(false);
    }
  }, [status, page, rowsPerPage, tenantVersion]);

  useEffect(() => { load(); loadSummary(); }, [load, loadSummary]);

  const handleStatusChange = (s) => { setStatus(s); setPage(0); };

  // Search patients for create dialog
  useEffect(() => {
    if (patientSearch.length < 2) return;
    const t = setTimeout(async () => {
      try {
        const result = await patientService.getAll(1, 10, patientSearch);
        setPatients(result.items || result.data || []);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const handleCreate = async () => {
    if (!form.patientId || !form.dueDate || !form.reason) {
      setFormError('Patient, due date, and reason are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await recallService.create({
        patientId: Number(form.patientId),
        dueDate: form.dueDate,
        reason: form.reason,
        notes: form.notes || null,
      });
      setCreateOpen(false);
      setForm({ patientId: '', dueDate: '', reason: 'Routine Checkup', notes: '' });
      setPatientSearch('');
      setSelectedPatient(null);
      setSuccess('Recall created successfully.');
      load(); loadSummary();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create recall.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!completeTarget) return;
    try {
      await recallService.complete(completeTarget.id);
      setCompleteTarget(null);
      setSuccess('Recall marked as completed.');
      load(); loadSummary();
    } catch { setError('Failed to complete recall.'); }
  };

  const handleSendReminder = async (id) => {
    try {
      await recallService.sendReminder(id);
      setSuccess('Reminder sent.');
      load();
    } catch { setError('Failed to send reminder.'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await recallService.delete(deleteTarget.id);
      setDeleteTarget(null);
      setSuccess('Recall deleted.');
      load(); loadSummary();
    } catch { setError('Failed to delete recall.'); }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Patient Recalls</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage follow-up and preventive-care reminders
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh"><IconButton onClick={() => { load(); loadSummary(); }}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => {
            setForm({ patientId: '', dueDate: '', reason: 'Routine Checkup', notes: '' });
            setSelectedPatient(null);
            setPatientSearch('');
            setFormError('');
            setCreateOpen(true);
          }}>
            New Recall
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Summary cards */}
      {summary && (
        <Grid container spacing={2} mb={2}>
          {[
            { label: 'Due This Week', value: summary.dueThisWeek, color: 'warning.main' },
            { label: 'Overdue', value: summary.overdue, color: 'error.main' },
            { label: 'Due This Month', value: summary.dueThisMonth, color: 'info.main' },
            { label: 'Completed (30d)', value: summary.completedThisMonth, color: 'success.main' },
          ].map((c) => (
            <Grid key={c.label} item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Status filter */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
        {STATUS_TABS.map((t) => (
          <Chip key={t.value} label={t.label} color={status === t.value ? t.color : 'default'}
            variant={status === t.value ? 'filled' : 'outlined'}
            onClick={() => handleStatusChange(t.value)} clickable />
        ))}
      </Box>

      {/* Table */}
      <Paper variant="outlined">
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Patient</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Reminder</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recalls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Box py={3} color="text.secondary">
                          <EventRepeat sx={{ fontSize: 40, mb: 1 }} />
                          <Typography>No recalls found.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : recalls.map((r) => {
                    const isOverdue = !r.isCompleted && new Date(r.dueDate) < new Date();
                    return (
                      <TableRow key={r.id} hover sx={isOverdue ? { bgcolor: 'error.50' } : undefined}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{r.patient?.fullName}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.patient?.email}</Typography>
                        </TableCell>
                        <TableCell>{r.patient?.phoneNumber || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2"
                            color={isOverdue ? 'error.main' : 'text.primary'} fontWeight={isOverdue ? 600 : 400}>
                            {new Date(r.dueDate).toLocaleDateString()}
                          </Typography>
                          {isOverdue && <Chip label="Overdue" size="small" color="error" />}
                        </TableCell>
                        <TableCell><Chip label={r.reason} size="small" variant="outlined" /></TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{r.notes || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          {r.reminderSent
                            ? <Typography variant="caption" color="success.main">
                                Sent {new Date(r.reminderSentDate).toLocaleDateString()}
                              </Typography>
                            : <Typography variant="caption" color="text.disabled">Not sent</Typography>}
                        </TableCell>
                        <TableCell align="right">
                          {!r.isCompleted && (
                            <>
                              <Tooltip title="Send Reminder">
                                <IconButton size="small" color="info" onClick={() => handleSendReminder(r.id)}>
                                  <Notifications fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Mark Complete">
                                <IconButton size="small" color="success" onClick={() => setCompleteTarget(r)}>
                                  <Check fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(r)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={total} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[20]} />
          </>
        )}
      </Paper>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Patient Recall</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Autocomplete
              options={patients}
              getOptionLabel={(p) => `${p.fullName} — ${p.email}`}
              value={selectedPatient}
              onChange={(_, val) => {
                setSelectedPatient(val);
                setForm((f) => ({ ...f, patientId: val ? val.id : '' }));
              }}
              onInputChange={(_, val) => setPatientSearch(val)}
              renderInput={(params) => (
                <TextField {...params} label="Search Patient" size="small" />
              )}
              filterOptions={(x) => x}
              noOptionsText={patientSearch.length < 2 ? 'Type at least 2 characters...' : 'No patients found'}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            <TextField label="Due Date" type="date" size="small" value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth size="small">
              <InputLabel>Reason</InputLabel>
              <Select value={form.reason} label="Reason"
                onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {RECALL_REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Notes (optional)" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline rows={2} size="small" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Add />}>
            {saving ? 'Saving…' : 'Create Recall'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Confirm */}
      <Dialog open={!!completeTarget} onClose={() => setCompleteTarget(null)} maxWidth="xs">
        <DialogTitle>Mark Recall Complete</DialogTitle>
        <DialogContent>
          <Typography>
            Mark the recall for <strong>{completeTarget?.patient?.fullName}</strong> as completed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<Check />} onClick={handleComplete}>
            Complete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete Recall</DialogTitle>
        <DialogContent>
          <Typography>Delete the recall for <strong>{deleteTarget?.patient?.fullName}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" startIcon={<Delete />} onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
