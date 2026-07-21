import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Autocomplete, Alert,
  CircularProgress, Stack, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Divider, Grid, Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { patientService } from '../services/patientService';
import apiClient from '../services/api';

// ── Service ───────────────────────────────────────────────────────────────────

const vitalsService = {
  getByPatient: (id) => apiClient.get(`/vitals/patient/${id}`).then(r => r.data),
  create: (data) => apiClient.post('/vitals', data).then(r => r.data),
  remove: (id) => apiClient.delete(`/vitals/${id}`),
};

// ── Vitals definition ─────────────────────────────────────────────────────────

const VITALS_FIELDS = [
  { key: 'systolicBP',   label: 'Systolic BP',  unit: 'mmHg', color: '#e53935' },
  { key: 'diastolicBP',  label: 'Diastolic BP', unit: 'mmHg', color: '#fb8c00' },
  { key: 'heartRate',    label: 'Heart Rate',   unit: 'bpm',  color: '#8e24aa' },
  { key: 'temperature',  label: 'Temperature',  unit: '°C',   color: '#43a047' },
  { key: 'spo2',         label: 'SpO₂',         unit: '%',    color: '#1e88e5' },
  { key: 'respiratoryRate', label: 'Resp. Rate', unit: 'brpm', color: '#00acc1' },
  { key: 'weight',       label: 'Weight',       unit: 'kg',   color: '#6d4c41' },
  { key: 'height',       label: 'Height',       unit: 'cm',   color: '#546e7a' },
  { key: 'bmi',          label: 'BMI',          unit: '',     color: '#f4511e' },
];

const EMPTY_FORM = Object.fromEntries([
  ...VITALS_FIELDS.map(f => [f.key, '']),
  ['recordedAt', new Date().toISOString().slice(0, 16)],
  ['notes', ''],
]);

// ── Normal ranges for badges ───────────────────────────────────────────────────

function vitalStatus(key, value) {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  const ranges = {
    systolicBP:      [90, 120],
    diastolicBP:     [60, 80],
    heartRate:       [60, 100],
    temperature:     [36.1, 37.2],
    spo2:            [95, 100],
    respiratoryRate: [12, 20],
    bmi:             [18.5, 24.9],
  };
  const r = ranges[key];
  if (!r) return 'default';
  if (v < r[0]) return 'info';
  if (v > r[1]) return 'error';
  return 'success';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerioChart() {
  const [patients, setPatients]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [tab, setTab]               = useState(0);

  // Load patients (paginated endpoint — extract items array)
  useEffect(() => {
    patientService.getAll(1, 1000)
      .then(d => setPatients(Array.isArray(d) ? d : (d?.items ?? d?.data ?? [])))
      .catch(() => {});
  }, []);

  // Load vitals
  const loadVitals = useCallback(async (patientId) => {
    if (!patientId) { setRecords([]); return; }
    setLoading(true);
    setError('');
    try {
      const data = await vitalsService.getByPatient(patientId);
      setRecords((data || []).sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)));
    } catch {
      setError('Failed to load vitals. The endpoint may not be implemented yet.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVitals(selected?.id); }, [selected, loadVitals]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(
          VITALS_FIELDS.map(f => [f.key, form[f.key] !== '' ? parseFloat(form[f.key]) : null])
        ),
        recordedAt: form.recordedAt,
        notes: form.notes,
        patientId: selected.id,
      };
      await vitalsService.create(payload);
      setDialogOpen(false);
      loadVitals(selected.id);
    } catch {
      setError('Failed to save vitals.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await vitalsService.remove(deleteId);
      setDeleteId(null);
      loadVitals(selected.id);
    } catch {
      setError('Failed to delete record.');
    }
  };

  // Chart data: x-axis = date label
  const chartData = records.map(r => ({
    date: new Date(r.recordedAt).toLocaleDateString(),
    ...Object.fromEntries(VITALS_FIELDS.map(f => [f.key, r[f.key] ?? null])),
  }));

  // Latest vitals for summary cards
  const latest = records.length > 0 ? records[records.length - 1] : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <MonitorHeartIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Vitals Chart</Typography>
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

      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {!selected ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Select a patient to view their vital signs history.</Typography>
        </Paper>
      ) : (
        <>
          {/* Latest vitals summary */}
          {latest && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {VITALS_FIELDS.filter(f => latest[f.key] != null).map(f => (
                <Grid item xs={6} sm={4} md={3} key={f.key}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', borderTop: `3px solid ${f.color}` }}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: f.color }}>
                      {latest[f.key]}{f.unit ? ` ${f.unit}` : ''}
                    </Typography>
                    {vitalStatus(f.key, latest[f.key]) && (
                      <Chip
                        size="small"
                        label={vitalStatus(f.key, latest[f.key]) === 'success' ? 'Normal' : vitalStatus(f.key, latest[f.key]) === 'error' ? 'High' : 'Low'}
                        color={vitalStatus(f.key, latest[f.key])}
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          <Paper>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Vitals History — {selected.firstName} {selected.lastName}
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}>
                Record Vitals
              </Button>
            </Stack>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
              <Tab label="Charts" />
              <Tab label="History Table" />
            </Tabs>
            <Divider />

            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
            ) : records.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No vitals recorded for this patient.</Typography>
              </Box>
            ) : tab === 0 ? (
              /* ── Charts tab ── */
              <Box sx={{ p: 2 }}>
                {/* Blood Pressure + Heart Rate */}
                <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>Blood Pressure &amp; Heart Rate</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ReTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="systolicBP"  name="Systolic BP"  stroke="#e53935" dot={false} />
                    <Line type="monotone" dataKey="diastolicBP" name="Diastolic BP" stroke="#fb8c00" dot={false} />
                    <Line type="monotone" dataKey="heartRate"   name="Heart Rate"   stroke="#8e24aa" dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>

                {/* Temperature + SpO2 + Resp Rate */}
                <Typography variant="subtitle2" sx={{ mb: 1, mt: 3 }}>Temperature, SpO₂ &amp; Respiratory Rate</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ReTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="temperature"     name="Temp (°C)"   stroke="#43a047" dot={false} />
                    <Line type="monotone" dataKey="spo2"            name="SpO₂ (%)"    stroke="#1e88e5" dot={false} />
                    <Line type="monotone" dataKey="respiratoryRate" name="Resp. Rate"  stroke="#00acc1" dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>

                {/* Weight + BMI */}
                <Typography variant="subtitle2" sx={{ mb: 1, mt: 3 }}>Weight &amp; BMI</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ReTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#6d4c41" dot={false} />
                    <Line type="monotone" dataKey="bmi"    name="BMI"         stroke="#f4511e" dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              /* ── History Table tab ── */
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>BP (Sys/Dia)</strong></TableCell>
                    <TableCell><strong>HR</strong></TableCell>
                    <TableCell><strong>Temp</strong></TableCell>
                    <TableCell><strong>SpO₂</strong></TableCell>
                    <TableCell><strong>Resp. Rate</strong></TableCell>
                    <TableCell><strong>Weight</strong></TableCell>
                    <TableCell><strong>BMI</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...records].reverse().map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{new Date(r.recordedAt).toLocaleString()}</TableCell>
                      <TableCell>{r.systolicBP != null && r.diastolicBP != null ? `${r.systolicBP}/${r.diastolicBP}` : '—'}</TableCell>
                      <TableCell>{r.heartRate != null ? `${r.heartRate} bpm` : '—'}</TableCell>
                      <TableCell>{r.temperature != null ? `${r.temperature} °C` : '—'}</TableCell>
                      <TableCell>{r.spo2 != null ? `${r.spo2}%` : '—'}</TableCell>
                      <TableCell>{r.respiratoryRate != null ? `${r.respiratoryRate} brpm` : '—'}</TableCell>
                      <TableCell>{r.weight != null ? `${r.weight} kg` : '—'}</TableCell>
                      <TableCell>{r.bmi != null ? r.bmi : '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => setDeleteId(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}

      {/* Record Vitals Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Vitals</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Date & Time"
              type="datetime-local"
              value={form.recordedAt}
              onChange={(e) => setForm(f => ({ ...f, recordedAt: e.target.value }))}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Grid container spacing={2}>
              {VITALS_FIELDS.map(f => (
                <Grid item xs={6} key={f.key}>
                  <TextField
                    label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`}
                    type="number"
                    value={form[f.key]}
                    onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    size="small"
                    fullWidth
                    inputProps={{ step: 'any' }}
                  />
                </Grid>
              ))}
            </Grid>
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              size="small"
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Vitals Record?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete this vitals entry.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
