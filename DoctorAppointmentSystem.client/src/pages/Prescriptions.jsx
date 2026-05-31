import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Autocomplete, TextField,
  Alert, CircularProgress, Chip, Stack, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, MenuItem, Select,
  FormControl, InputLabel, IconButton, Tooltip, Table, TableBody,
  TableCell, TableHead, TableRow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import { prescriptionService } from '../services/prescriptionService';
import { patientService } from '../services/patientService';

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Gel', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Injection'];
const FREQUENCIES = ['OD (Once Daily)', 'BID (Twice Daily)', 'Q8H (Every 8 Hours)', 'TID (Three Times Daily)', 'Q12H (Every 12 Hours)', 'QID (Four Times Daily)', 'PRN (As Needed)', 'HS (At Bedtime)', 'Stat (Immediately)', 'AC (Before Meals)', 'PC (After Meals)'];
const DURATIONS = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', '1 month', 'Until Finished', 'As Directed'];

const EMPTY_ITEM = {
  drugName: '', strength: '', dosageForm: 'Tablet', dosage: '1 tablet',
  frequency: 'TID (Three Times Daily)', duration: '5 days',
  quantity: 10, refills: 0, instructions: '', indication: '', warnings: ''
};

function ItemRow({ item, index, itemCount, updateItem, removeItem }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1, position: 'relative' }}>
      {itemCount > 1 && (
        <IconButton size="small" color="error" sx={{ position: 'absolute', top: 6, right: 6 }}
          onClick={() => removeItem(index)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
      <Typography variant="caption" fontWeight={600} color="primary" gutterBottom display="block">
        Drug #{index + 1}
      </Typography>
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={5}>
          <TextField label="Drug Name *" size="small" fullWidth value={item.drugName}
            onChange={e => updateItem(index, 'drugName', e.target.value)} />
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField label="Strength" size="small" fullWidth value={item.strength}
            onChange={e => updateItem(index, 'strength', e.target.value)} />
        </Grid>
        <Grid item xs={6} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Dosage Form</InputLabel>
            <Select value={item.dosageForm} label="Dosage Form"
              onChange={e => updateItem(index, 'dosageForm', e.target.value)}>
              {DOSAGE_FORMS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField label="Dosage" size="small" fullWidth value={item.dosage}
            onChange={e => updateItem(index, 'dosage', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Frequency</InputLabel>
            <Select value={item.frequency} label="Frequency"
              onChange={e => updateItem(index, 'frequency', e.target.value)}>
              {FREQUENCIES.map(fr => <MenuItem key={fr} value={fr}>{fr}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Duration</InputLabel>
            <Select value={item.duration} label="Duration"
              onChange={e => updateItem(index, 'duration', e.target.value)}>
              {DURATIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField label="Qty" size="small" fullWidth type="number" value={item.quantity}
            onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
            inputProps={{ min: 1 }} />
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField label="Refills" size="small" fullWidth type="number" value={item.refills}
            onChange={e => updateItem(index, 'refills', parseInt(e.target.value) || 0)}
            inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField label="Indication / Diagnosis" size="small" fullWidth value={item.indication ?? ''}
            onChange={e => updateItem(index, 'indication', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Patient Instructions (Sig)" size="small" fullWidth value={item.instructions ?? ''}
            onChange={e => updateItem(index, 'instructions', e.target.value)} />
        </Grid>
      </Grid>
    </Paper>
  );
}

export default function Prescriptions() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeVoided, setIncludeVoided] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);

  const [printRx, setPrintRx] = useState(null);
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

  const handleOpenDialog = () => {
    setNotes('');
    setItems([{ ...EMPTY_ITEM }]);
    setDialogOpen(true);
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  const handleCreate = async () => {
    if (items.some(it => !it.drugName.trim())) {
      setError('All drug rows must have a Drug Name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await prescriptionService.create({ patientId: selectedPatient.id, notes, items });
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
    if (!printRx) return;
    const rx = printRx;
    const itemRows = (rx.items ?? []).map((item, idx) => `
      <tr>
        <td style="font-weight:600">${idx + 1}. ${item.drugName}${item.strength ? ' ' + item.strength : ''}<br/>
          <span style="font-size:11px;color:#555">${item.dosageForm}</span>
        </td>
        <td>${item.dosage} &mdash; ${item.frequency}<br/>
          Duration: ${item.duration}<br/>
          ${item.instructions ? `<span style="font-size:11px;color:#555">Sig: ${item.instructions}</span>` : ''}
          ${item.indication ? `<br/><span style="font-size:11px;color:#555">Indication: ${item.indication}</span>` : ''}
        </td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:center">${item.refills}</td>
      </tr>`).join('');

    const win = window.open('', '_blank', 'width=820,height=700');
    win.document.write(`
      <!DOCTYPE html><html><head><title>Prescription — ${rx.patientName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 40px; }
        .header { border-bottom: 3px double #333; padding-bottom: 12px; margin-bottom: 20px; }
        .clinic-name { font-size: 20px; font-weight: 700; }
        .clinic-sub { font-size: 12px; color: #555; margin-top: 2px; }
        .rx-meta { display: flex; justify-content: space-between; margin-bottom: 18px; }
        .meta-block .label { font-size: 10px; text-transform: uppercase; color: #888; }
        .meta-block .value { font-size: 13px; font-weight: 600; }
        .rx-symbol { font-size: 38px; font-style: italic; font-family: serif; line-height: 1; margin-bottom: 10px; color: #222; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f0f0f0; font-size: 11px; text-transform: uppercase; padding: 7px 10px; border: 1px solid #ccc; text-align: left; }
        td { padding: 8px 10px; border: 1px solid #ddd; vertical-align: top; font-size: 12px; }
        tr:nth-child(even) td { background: #fafafa; }
        .notes-box { border: 1px dashed #bbb; padding: 8px 12px; border-radius: 4px; margin-bottom: 20px; font-size: 12px; color: #444; }
        .sig-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; }
        .sig-line { border-top: 1px solid #333; padding-top: 6px; min-width: 200px; text-align: center; }
        .sig-line .name { font-weight: 700; font-size: 13px; }
        .sig-line .sub { font-size: 11px; color: #555; }
        .footer { margin-top: 28px; border-top: 1px solid #eee; padding-top: 10px; font-size: 10px; color: #aaa; text-align: center; }
        .voided-banner { background: #ffebee; border: 2px solid #f44336; color: #c62828;
          text-align: center; font-weight: 700; font-size: 14px; padding: 6px; margin-bottom: 16px; border-radius: 4px; }
        @media print { body { padding: 20px; } }
      </style></head><body>

      <div class="header">
        <div class="clinic-name">Doctor Appointment System</div>
        <div class="clinic-sub">Medical Prescription</div>
      </div>

      ${rx.isVoided ? `<div class="voided-banner">&#9888; THIS PRESCRIPTION HAS BEEN VOIDED${rx.voidReason ? ' &mdash; ' + rx.voidReason : ''}</div>` : ''}

      <div class="rx-meta">
        <div class="meta-block">
          <div class="label">Patient</div>
          <div class="value">${rx.patientName}</div>
        </div>
        <div class="meta-block">
          <div class="label">Prescription No.</div>
          <div class="value">Rx #${rx.id}</div>
        </div>
        <div class="meta-block">
          <div class="label">Date</div>
          <div class="value">${new Date(rx.prescriptionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      ${rx.notes ? `<div class="notes-box"><strong>Notes:</strong> ${rx.notes}</div>` : ''}

      <div class="rx-symbol">&#8478;</div>

      <table>
        <thead>
          <tr>
            <th style="width:35%">Drug / Medication</th>
            <th style="width:45%">Directions</th>
            <th style="width:10%">Qty</th>
            <th style="width:10%">Refills</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="sig-section">
        <div style="font-size:11px;color:#666">
          ${rx.prescribedByLicense ? `License No: <strong>${rx.prescribedByLicense}</strong>` : ''}
        </div>
        <div class="sig-line">
          <div class="name">${rx.prescribedBy}</div>
          <div class="sub">Prescribing Physician</div>
        </div>
      </div>

      <div class="footer">
        Generated by Doctor Appointment System &mdash; Printed: ${new Date().toLocaleString()}
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };



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
            <Button variant="contained" startIcon={<AddIcon />} disabled={!selectedPatient} onClick={handleOpenDialog}>
              New Prescription
            </Button>
          </Grid>
          <Grid item xs="auto">
            <Button variant={includeVoided ? 'contained' : 'outlined'} size="small"
              onClick={() => setIncludeVoided(v => !v)}>
              {includeVoided ? 'Hide Voided' : 'Show Voided'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={1.5}>
          {prescriptions.length === 0 && selectedPatient && (
            <Alert severity="info">No prescriptions found.</Alert>
          )}
          {prescriptions.map(rx => (
            <Paper key={rx.id} variant="outlined" sx={{ p: 2, opacity: rx.isVoided ? 0.6 : 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                <Box flex={1}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    {rx.isVoided && <Chip label="VOIDED" color="error" size="small" />}
                    <Typography variant="subtitle2" fontWeight={600}>
                      Rx #{rx.id} &middot; {new Date(rx.prescriptionDate).toLocaleDateString()}
                    </Typography>
                    <Chip
                      label={`${rx.items?.length ?? 0} drug${rx.items?.length !== 1 ? 's' : ''}`}
                      size="small" variant="outlined" color="primary"
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {rx.prescribedBy}{rx.notes ? ` \u00b7 ${rx.notes}` : ''}
                  </Typography>
                  <Stack spacing={0.5}>
                    {(rx.items ?? []).map((item, idx) => (
                      <Box key={idx} sx={{ pl: 1, borderLeft: '3px solid', borderColor: 'primary.light' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {item.drugName} {item.strength} ({item.dosageForm})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.dosage} &middot; {item.frequency} &middot; {item.duration} &middot; Qty: {item.quantity}
                          {item.refills > 0 ? ` \u00b7 Refills: ${item.refills}` : ''}
                        </Typography>
                        {item.instructions && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Sig: {item.instructions}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Print">
                    <IconButton size="small" onClick={() => handlePrint(rx.id)}>
                      <PrintIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!rx.isVoided && (
                    <Tooltip title="Void">
                      <IconButton size="small" color="error"
                        onClick={() => { setVoidRxId(rx.id); setVoidReason(''); }}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Prescription</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField label="Notes (optional)" size="small" fullWidth value={notes}
              onChange={e => setNotes(e.target.value)} sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Drugs / Medications</Typography>
            {items.map((item, idx) => <ItemRow key={idx} item={item} index={idx} itemCount={items.length} updateItem={updateItem} removeItem={removeItem} />)}
            <Button startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 1 }}>
              Add Another Drug
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            disabled={saving || items.every(it => !it.drugName.trim())}>
            {saving ? <CircularProgress size={18} /> : 'Save Prescription'}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={!!printRx} onClose={() => setPrintRx(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Prescription Preview — {printRx?.patientName}</DialogTitle>
        <DialogContent dividers>
          {printRx && (
            <Box sx={{ p: 1 }}>
              {printRx.isVoided && (
                <Alert severity="error" sx={{ mb: 2 }}>This prescription has been VOIDED{printRx.voidReason ? `: ${printRx.voidReason}` : ''}.</Alert>
              )}
              <Stack direction="row" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Patient</Typography>
                  <Typography fontWeight={700}>{printRx.patientName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Rx #</Typography>
                  <Typography fontWeight={700}>{printRx.id}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography fontWeight={700}>{new Date(printRx.prescriptionDate).toLocaleDateString()}</Typography>
                </Box>
              </Stack>
              {printRx.notes && (
                <Typography variant="body2" sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1, border: '1px dashed #ccc' }}>
                  <strong>Notes:</strong> {printRx.notes}
                </Typography>
              )}
              <Typography sx={{ fontSize: '2rem', fontStyle: 'italic', fontFamily: 'serif', lineHeight: 1, mb: 1 }}>&#8478;</Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>Drug / Medication</strong></TableCell>
                    <TableCell><strong>Directions</strong></TableCell>
                    <TableCell align="center"><strong>Qty</strong></TableCell>
                    <TableCell align="center"><strong>Refills</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(printRx.items ?? []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{item.drugName} {item.strength}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.dosageForm}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.dosage} — {item.frequency}</Typography>
                        <Typography variant="caption" color="text.secondary">Duration: {item.duration}</Typography>
                        {item.instructions && <Typography variant="caption" display="block" color="text.secondary">Sig: {item.instructions}</Typography>}
                        {item.indication && <Typography variant="caption" display="block" color="text.secondary">Indication: {item.indication}</Typography>}
                      </TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="center">{item.refills}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                <Typography variant="caption" color="text.secondary">
                  {printRx.prescribedByLicense ? `License: ${printRx.prescribedByLicense}` : ''}
                </Typography>
                <Box sx={{ textAlign: 'center', minWidth: 180 }}>
                  <Box sx={{ borderTop: '1px solid #333', pt: 0.5, mt: 5 }}>
                    <Typography variant="body2" fontWeight={700}>{printRx.prescribedBy}</Typography>
                    <Typography variant="caption" color="text.secondary">Prescribing Physician</Typography>
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
