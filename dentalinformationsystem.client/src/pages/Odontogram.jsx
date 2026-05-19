import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, ToggleButtonGroup, ToggleButton,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, TextField, Tooltip,
  CircularProgress, Alert, Autocomplete, IconButton, Stack
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { odontogramService } from '../services/odontogramService';
import { patientService } from '../services/patientService';

// ── Notation mappings ─────────────────────────────────────────────────────────
// FDI tooth numbers for permanent dentition (upper right → lower right, following FDI order)
const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const FDI_TO_UNIVERSAL = {
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
  41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32,
};

const FDI_TO_PALMER = {
  18: '8|', 17: '7|', 16: '6|', 15: '5|', 14: '4|', 13: '3|', 12: '2|', 11: '1|',
  21: '|1', 22: '|2', 23: '|3', 24: '|4', 25: '|5', 26: '|6', 27: '|7', 28: '|8',
  38: '|8', 37: '|7', 36: '|6', 35: '|5', 34: '|4', 33: '|3', 32: '|2', 31: '|1',
  41: '1|', 42: '2|', 43: '3|', 44: '4|', 45: '5|', 46: '6|', 47: '7|', 48: '8|',
};

function getLabel(fdi, notation) {
  if (notation === 'universal') return String(FDI_TO_UNIVERSAL[fdi] ?? fdi);
  if (notation === 'palmer') return FDI_TO_PALMER[fdi] ?? String(fdi);
  return String(fdi); // FDI default
}

// Finding type → colour
const FINDING_COLORS = {
  Healthy: '#4caf50',
  Caries: '#f44336',
  Restoration: '#2196f3',
  Crown: '#9c27b0',
  Bridge: '#ff9800',
  Implant: '#607d8b',
  Missing: '#9e9e9e',
  Extraction: '#795548',
  RootCanal: '#e91e63',
  Fracture: '#ff5722',
  Impacted: '#673ab7',
  Supernumerary: '#00bcd4',
  Veneer: '#8bc34a',
  Inlay: '#03a9f4',
  Onlay: '#009688',
  Sealant: '#cddc39',
  WatchArea: '#ffc107',
};

const FINDING_TYPES = Object.keys(FINDING_COLORS);
const SURFACES = ['None', 'Mesial', 'Distal', 'Buccal', 'Lingual', 'Occlusal', 'Incisal', 'Palatal', 'Labial'];

function ToothCell({ fdi, findings, notation, onClick }) {
  const active = findings.filter(f => f.isActive);
  const topFinding = active[0];
  const bg = topFinding ? (FINDING_COLORS[topFinding.findingTypeName] ?? '#e0e0e0') : '#f5f5f5';
  const isMissing = active.some(f => f.findingTypeName === 'Missing' || f.findingTypeName === 'Extraction');

  return (
    <Tooltip
      title={
        active.length === 0
          ? `Tooth ${getLabel(fdi, notation)} — Healthy`
          : active.map(f => `${f.findingTypeName}${f.surface !== 'None' ? ' (' + f.surfaceName + ')' : ''}`).join(', ')
      }
    >
      <Box
        onClick={() => onClick(fdi)}
        sx={{
          width: 36, height: 36, borderRadius: 1, border: '1px solid #bbb',
          bgcolor: bg, cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          opacity: isMissing ? 0.4 : 1,
          transition: 'transform .1s',
          '&:hover': { transform: 'scale(1.15)', zIndex: 10 },
          position: 'relative'
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1 }}>
          {getLabel(fdi, notation)}
        </Typography>
        {active.length > 1 && (
          <Box sx={{
            position: 'absolute', top: -4, right: -4, bgcolor: 'error.main',
            color: '#fff', borderRadius: '50%', width: 14, height: 14,
            fontSize: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {active.length}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

export default function Odontogram() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [findings, setFindings] = useState([]);
  const [notation, setNotation] = useState('fdi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [form, setForm] = useState({ findingType: 'Caries', surface: 'None', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    patientService.getAll(1, 200).then(d => setPatients(d.items ?? d)).catch(() => {});
  }, []);

  const loadFindings = useCallback(async (patientId) => {
    setLoading(true);
    setError('');
    try {
      const data = await odontogramService.getByPatient(patientId, includeInactive);
      setFindings(data);
    } catch {
      setError('Failed to load odontogram findings.');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    if (selectedPatient) loadFindings(selectedPatient.id);
    else setFindings([]);
  }, [selectedPatient, loadFindings]);

  const getFindingsForTooth = (fdi) => findings.filter(f => f.toothFdi === fdi);

  const handleToothClick = (fdi) => {
    if (!selectedPatient) return;
    setSelectedTooth(fdi);
    setForm({ findingType: 'Caries', surface: 'None', notes: '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await odontogramService.create({
        patientId: selectedPatient.id,
        toothFdi: selectedTooth,
        surface: SURFACES.indexOf(form.surface),
        findingType: FINDING_TYPES.indexOf(form.findingType),
        notes: form.notes || null
      });
      await loadFindings(selectedPatient.id);
      setDialogOpen(false);
    } catch {
      setError('Failed to save finding.');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await odontogramService.resolve(id);
      await loadFindings(selectedPatient.id);
    } catch {
      setError('Failed to resolve finding.');
    }
  };

  const toothRow = (teeth) => (
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {teeth.map(fdi => (
        <ToothCell
          key={fdi}
          fdi={fdi}
          findings={getFindingsForTooth(fdi)}
          notation={notation}
          onClick={handleToothClick}
        />
      ))}
    </Stack>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>Odontogram</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <Autocomplete
              options={patients}
              getOptionLabel={p => `${p.fullName ?? p.firstName + ' ' + p.lastName}`}
              value={selectedPatient}
              onChange={(_, v) => setSelectedPatient(v)}
              renderInput={params => <TextField {...params} label="Select Patient" size="small" />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary" gutterBottom>Notation</Typography>
            <ToggleButtonGroup
              value={notation}
              exclusive
              onChange={(_, v) => v && setNotation(v)}
              size="small"
            >
              <ToggleButton value="fdi">FDI</ToggleButton>
              <ToggleButton value="universal">Universal</ToggleButton>
              <ToggleButton value="palmer">Palmer</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant={includeInactive ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setIncludeInactive(v => !v)}
            >
              {includeInactive ? 'Hide Resolved' : 'Show Resolved'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="caption" fontWeight={600} gutterBottom display="block">Legend</Typography>
        <Stack direction="row" flexWrap="wrap" spacing={1}>
          {FINDING_TYPES.map(t => (
            <Chip
              key={t}
              label={t}
              size="small"
              sx={{ bgcolor: FINDING_COLORS[t], color: '#fff', fontSize: '0.65rem' }}
            />
          ))}
        </Stack>
      </Paper>

      {/* Chart */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          {!selectedPatient && (
            <Alert severity="info" icon={<InfoOutlinedIcon />}>
              Select a patient to view and edit their odontogram.
            </Alert>
          )}
          {selectedPatient && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Upper Arch (Maxillary)
              </Typography>
              {toothRow(PERMANENT_UPPER)}
              <Box sx={{ my: 2, borderBottom: '2px dashed #ccc' }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Lower Arch (Mandibular)
              </Typography>
              {toothRow(PERMANENT_LOWER)}
            </Box>
          )}
        </Paper>
      )}

      {/* Active Findings List */}
      {selectedPatient && findings.filter(f => f.isActive).length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Active Findings</Typography>
          <Stack spacing={1}>
            {findings.filter(f => f.isActive).map(f => (
              <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={f.findingTypeName}
                  size="small"
                  sx={{ bgcolor: FINDING_COLORS[f.findingTypeName] ?? '#e0e0e0', color: '#fff' }}
                />
                <Typography variant="body2">
                  Tooth {getLabel(f.toothFdi, notation)}
                  {f.surfaceName !== 'None' ? ` — ${f.surfaceName}` : ''}
                  {f.notes ? ` · ${f.notes}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {f.recordedBy} · {new Date(f.recordedDate).toLocaleDateString()}
                </Typography>
                <IconButton size="small" color="success" onClick={() => handleResolve(f.id)} title="Mark resolved">
                  <CheckCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Add Finding Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Finding — Tooth {selectedTooth != null ? getLabel(selectedTooth, notation) : ''}
          {' '}(FDI {selectedTooth})
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Finding Type</InputLabel>
              <Select
                value={form.findingType}
                label="Finding Type"
                onChange={e => setForm(f => ({ ...f, findingType: e.target.value }))}
              >
                {FINDING_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: FINDING_COLORS[t] }} />
                      {t}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Surface</InputLabel>
              <Select
                value={form.surface}
                label="Surface"
                onChange={e => setForm(f => ({ ...f, surface: e.target.value }))}
              >
                {SURFACES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Notes"
              multiline rows={2}
              size="small"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <AddCircleOutlineIcon />}
          >
            Add Finding
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
