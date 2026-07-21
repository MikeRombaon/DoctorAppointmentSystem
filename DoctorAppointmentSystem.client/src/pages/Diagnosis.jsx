import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Autocomplete, Alert,
  CircularProgress, Stack, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Tooltip, MenuItem, Select, FormControl,
  InputLabel, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { patientService } from '../services/patientService';
import apiClient from '../services/api';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['Active', 'Resolved', 'Chronic', 'Suspected', 'Ruled Out'];
const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe', 'Critical'];

const STATUS_COLOR = {
  Active:      'error',
  Chronic:     'warning',
  Suspected:   'info',
  Resolved:    'success',
  'Ruled Out': 'default',
};

const EMPTY_FORM = {
  icdCode: '',
  description: '',
  status: 'Active',
  severity: 'Mild',
  onsetDate: '',
  notes: '',
};

// ── Service helpers ───────────────────────────────────────────────────────────

const diagnosisService = {
  getByPatient: (patientId) => apiClient.get(`/diagnoses/patient/${patientId}`).then(r => r.data),
  create: (data) => apiClient.post('/diagnoses', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/diagnoses/${id}`, data).then(r => r.data),
  remove: (id) => apiClient.delete(`/diagnoses/${id}`),
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Odontogram() {
  const [patients, setPatients]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [diagnoses, setDiagnoses]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  // Load patient list (paginated endpoint — extract items array)
  useEffect(() => {
    patientService.getAll(1, 1000)
      .then(data => setPatients(Array.isArray(data) ? data : (data?.items ?? data?.data ?? [])))
      .catch(() => {});
  }, []);

  // Load diagnoses for selected patient
  const loadDiagnoses = useCallback(async (patientId) => {
    if (!patientId) { setDiagnoses([]); return; }
    setLoading(true);
    setError('');
    try {
      const data = await diagnosisService.getByPatient(patientId);
      setDiagnoses(data || []);
    } catch {
      setError('Failed to load diagnoses. The endpoint may not be implemented yet.');
      setDiagnoses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiagnoses(selected?.id);
  }, [selected, loadDiagnoses]);

  // Open add/edit dialog
  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (dx) => {
    setEditTarget(dx);
    setForm({
      icdCode:     dx.icdCode || '',
      description: dx.description || '',
      status:      dx.status || 'Active',
      severity:    dx.severity || 'Mild',
      onsetDate:   dx.onsetDate ? dx.onsetDate.split('T')[0] : '',
      notes:       dx.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, patientId: selected.id };
      if (editTarget) {
        await diagnosisService.update(editTarget.id, payload);
      } else {
        await diagnosisService.create(payload);
      }
      setDialogOpen(false);
      loadDiagnoses(selected.id);
    } catch {
      setError('Failed to save diagnosis.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await diagnosisService.remove(deleteId);
      setDeleteId(null);
      loadDiagnoses(selected.id);
    } catch {
      setError('Failed to delete diagnosis.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <LocalHospitalIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Diagnosis / Problem List</Typography>
      </Stack>

      {/* Patient selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Autocomplete
          options={patients}
          getOptionLabel={(p) => `${p.firstName} ${p.lastName}`}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          renderInput={(params) => <TextField {...params} label="Select Patient" size="small" sx={{ minWidth: 340 }} />}
        />
      </Paper>

      {/* Error */}
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Content */}
      {!selected ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Select a patient to view their diagnosis / problem list.</Typography>
        </Paper>
      ) : (
        <Paper>
          {/* Toolbar */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Problem List — {selected.firstName} {selected.lastName}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openAdd}>
              Add Diagnosis
            </Button>
          </Stack>
          <Divider />

          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
          ) : diagnoses.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No diagnoses recorded for this patient.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><strong>ICD Code</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Severity</strong></TableCell>
                  <TableCell><strong>Onset Date</strong></TableCell>
                  <TableCell><strong>Notes</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {diagnoses.map((dx) => (
                  <TableRow key={dx.id} hover>
                    <TableCell>
                      <Chip label={dx.icdCode || '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{dx.description}</TableCell>
                    <TableCell>
                      <Chip
                        label={dx.status}
                        size="small"
                        color={STATUS_COLOR[dx.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell>{dx.severity || '—'}</TableCell>
                    <TableCell>
                      {dx.onsetDate ? new Date(dx.onsetDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={dx.notes || ''} placement="top">
                        <span>{dx.notes || '—'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(dx)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteId(dx.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Edit Diagnosis' : 'Add Diagnosis'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="ICD-10 Code"
              value={form.icdCode}
              onChange={(e) => setForm(f => ({ ...f, icdCode: e.target.value }))}
              size="small"
              placeholder="e.g. J06.9"
            />
            <TextField
              label="Description *"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              size="small"
              required
              placeholder="e.g. Acute upper respiratory infection"
            />
            <Stack direction="row" spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select value={form.severity} label="Severity" onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}>
                  {SEVERITY_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Onset Date"
              type="date"
              value={form.onsetDate}
              onChange={(e) => setForm(f => ({ ...f, onsetDate: e.target.value }))}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              size="small"
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.description.trim()}>
            {saving ? <CircularProgress size={18} /> : editTarget ? 'Save Changes' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Diagnosis?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently remove this diagnosis from the patient record.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
