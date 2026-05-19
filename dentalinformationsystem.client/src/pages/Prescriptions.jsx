import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Autocomplete, TextField,
  Alert, CircularProgress, Chip, Stack, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, MenuItem, Select,
  FormControl, InputLabel, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import BlockIcon from '@mui/icons-material/Block';
import { prescriptionService } from '../services/prescriptionService';
import { patientService } from '../services/patientService';

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Gel', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Injection'];
const FREQUENCIES = ['OD (Once Daily)', 'BID (Twice Daily)', 'TID (Three Times Daily)', 'QID (Four Times Daily)', 'PRN (As Needed)', 'HS (At Bedtime)', 'Stat (Immediately)', 'AC (Before Meals)', 'PC (After Meals)'];
const DURATIONS = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', '1 month', 'Until Finished', 'As Directed'];

const EMPTY_RX = {
  drugName: '', strength: '', dosageForm: 'Tablet', dosage: '1 tablet',
  frequency: 'TID (Three Times Daily)', duration: '5 days',
  quantity: 10, refills: 0,
  instructions: '', indication: '', warnings: ''
};

export default function Prescriptions() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeVoided, setIncludeVoided] = useState(false);

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_RX });
  const [saving, setSaving] = useState(false);

  // Print dialog
  const [printRx, setPrintRx] = useState(null);

  // Void dialog
  const [voidRxId, setVoidRxId] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    patientService.getAll(1, 200).then(d => setPatients(d.items ?? d)).catch(() => {});
  }, []);

  const loadRx = async (patientId) => {
    setLoading(true);
    try {
      const data = await prescriptionService.getByPatient(patientId, includeVoided);
      setPrescriptions(data);
    } catch {
      setError('Failed to load prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) loadRx(selectedPatient.id);
    else setPrescriptions([]);
  }, [selectedPatient, includeVoided]);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      await prescriptionService.create({ ...form, patientId: selectedPatient.id });
      await loadRx(selectedPatient.id);
      setDialogOpen(false);
    } catch {
      setError('Failed to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async () => {
    try {
      await prescriptionService.void(voidRxId, voidReason);
      await loadRx(selectedPatient.id);
      setVoidRxId(null);
      setVoidReason('');
    } catch {
      setError('Failed to void prescription.');
    }
  };

  const handlePrint = async (id) => {
    try {
      const data = await prescriptionService.getById(id);
      setPrintRx(data);
    } catch {
      setError('Failed to load prescription details.');
    }
  };

  const triggerPrint = () => {
    const el = document.getElementById('rx-print-area');
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Prescription</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; font-size: 13px; }
        h2 { margin:0; } .header { border-bottom: 2px solid #333; pb:8px; margin-bottom:16px; }
        .field { margin-bottom:8px; } .label { font-weight:600; }
        .rx-symbol { font-size: 36px; font-style: italic; }
        .sig { border-top: 2px solid #333; margin-top: 40px; padding-top: 8px; text-align: right; }
      </style></head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const F = (field, label, type = 'text', opts = {}) => (
    <TextField
      label={label} size="small" fullWidth type={type}
      value={form[field]}
      onChange={e => setForm(f => ({ ...f, [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
      {...opts}
    />
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>Prescriptions</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <Autocomplete
              options={patients}
              getOptionLabel={p => p.fullName ?? `${p.firstName} ${p.lastName}`}
              value={selectedPatient}
              onChange={(_, v) => setSelectedPatient(v)}
              renderInput={params => <TextField {...params} label="Select Patient" size="small" />}
            />
          </Grid>
          <Grid item xs="auto">
            <Button variant="contained" startIcon={<AddIcon />} disabled={!selectedPatient} onClick={() => { setForm({ ...EMPTY_RX }); setDialogOpen(true); }}>
              New Prescription
            </Button>
          </Grid>
          <Grid item xs="auto">
            <Button variant={includeVoided ? 'contained' : 'outlined'} size="small" onClick={() => setIncludeVoided(v => !v)}>
              {includeVoided ? 'Hide Voided' : 'Show Voided'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={1}>
          {prescriptions.length === 0 && selectedPatient && (
            <Alert severity="info">No prescriptions found.</Alert>
          )}
          {prescriptions.map(rx => (
            <Paper key={rx.id} variant="outlined" sx={{ p: 2, opacity: rx.isVoided ? 0.6 : 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {rx.isVoided && <Chip label="VOIDED" color="error" size="small" />}
                    <Typography variant="subtitle2" fontWeight={600}>
                      {rx.drugName} {rx.strength}
                    </Typography>
                    <Chip label={rx.dosageForm} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {rx.dosage} · {rx.frequency} · {rx.duration} · Qty: {rx.quantity}{rx.refills > 0 ? ` · Refills: ${rx.refills}` : ''}
                  </Typography>
                  {rx.instructions && (
                    <Typography variant="caption" color="text.secondary">
                      Sig: {rx.instructions}
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" color="text.secondary">
                    {rx.prescribedBy} · {new Date(rx.prescriptionDate).toLocaleDateString()}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Print">
                    <IconButton size="small" onClick={() => handlePrint(rx.id)}><PrintIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  {!rx.isVoided && (
                    <Tooltip title="Void">
                      <IconButton size="small" color="error" onClick={() => { setVoidRxId(rx.id); setVoidReason(''); }}>
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Prescription</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>{F('drugName', 'Drug Name *')}</Grid>
            <Grid item xs={6} md={3}>{F('strength', 'Strength (e.g. 500mg)')}</Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Dosage Form</InputLabel>
                <Select value={form.dosageForm} label="Dosage Form" onChange={e => setForm(f => ({ ...f, dosageForm: e.target.value }))}>
                  {DOSAGE_FORMS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>{F('dosage', 'Dosage (e.g. 1 tablet)')}</Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Frequency</InputLabel>
                <Select value={form.frequency} label="Frequency" onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  {FREQUENCIES.map(fr => <MenuItem key={fr} value={fr}>{fr}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Duration</InputLabel>
                <Select value={form.duration} label="Duration" onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
                  {DURATIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>{F('quantity', 'Quantity', 'number', { inputProps: { min: 1 } })}</Grid>
            <Grid item xs={6} md={3}>{F('refills', 'Refills', 'number', { inputProps: { min: 0 } })}</Grid>
            <Grid item xs={12}>{F('indication', 'Indication / Diagnosis', 'text')}</Grid>
            <Grid item xs={12}>
              <TextField label="Patient Instructions (Sig)" multiline rows={2} fullWidth size="small"
                value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Warnings / Drug Interaction Notes" multiline rows={2} fullWidth size="small"
                value={form.warnings} onChange={e => setForm(f => ({ ...f, warnings: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.drugName}>
            {saving ? <CircularProgress size={18} /> : 'Save Prescription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Void dialog */}
      <Dialog open={!!voidRxId} onClose={() => setVoidRxId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Void Prescription</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason for voiding" multiline rows={2} fullWidth size="small" sx={{ mt: 1 }}
            value={voidReason} onChange={e => setVoidReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidRxId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleVoid} disabled={!voidReason.trim()}>
            Void
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print dialog */}
      <Dialog open={!!printRx} onClose={() => setPrintRx(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Print Prescription</DialogTitle>
        <DialogContent>
          {printRx && (
            <Box id="rx-print-area" sx={{ p: 2, fontFamily: 'Arial', fontSize: '13px' }}>
              <Box className="header" sx={{ borderBottom: '2px solid #333', pb: 1, mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Dental Clinic</Typography>
                <Typography variant="body2">Prescription</Typography>
              </Box>
              <Typography variant="body2"><strong>Patient:</strong> {printRx.patientName}</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Date:</strong> {new Date(printRx.prescriptionDate).toLocaleDateString()}
              </Typography>
              <Typography sx={{ fontSize: '2rem', fontStyle: 'italic', lineHeight: 1 }}>℞</Typography>
              <Box sx={{ pl: 2, mt: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {printRx.drugName} {printRx.strength} ({printRx.dosageForm})
                </Typography>
                <Typography variant="body2">Disp: #{printRx.quantity}</Typography>
                <Typography variant="body2">Sig: {printRx.dosage} {printRx.frequency} for {printRx.duration}</Typography>
                {printRx.instructions && <Typography variant="body2">{printRx.instructions}</Typography>}
                {printRx.refills > 0 && <Typography variant="body2">Refills: {printRx.refills}</Typography>}
              </Box>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">License: {printRx.prescribedByLicense ?? 'N/A'}</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Box sx={{ borderTop: '1px solid #333', pt: 0.5, mt: 5, minWidth: 160 }}>
                    <Typography variant="body2">{printRx.prescribedBy}</Typography>
                    <Typography variant="caption">Prescribing Dentist</Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintRx(null)}>Close</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={triggerPrint}>Print</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
