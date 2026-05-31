import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Chip, IconButton,
  Autocomplete, Alert, Divider, List, ListItem, ListItemText
} from '@mui/material';
import {
  Add as AddIcon, Visibility as ViewIcon, CheckCircle as AcceptIcon,
  RequestQuote as EstimateIcon, Delete as DeleteIcon
} from '@mui/icons-material';
import { estimateService } from '../services/estimateService';
import { patientService } from '../services/patientService';

const STATUS_COLORS = {
  Draft: 'default', Presented: 'warning', Accepted: 'success',
  Declined: 'error', Expired: 'default'
};

const emptyForm = {
  patientId: '', treatmentPlanId: null,
  expirationDate: '', discount: '0', notes: '', items: []
};

const emptyItem = {
  procedureId: '', procedureName: '', toothNumber: '',
  surface: '', fee: '', insuranceEstimate: '0', notes: ''
};

export default function Estimates() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [estimates, setEstimates] = useState([]);
  const [viewEstimate, setViewEstimate] = useState(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    patientService.getAll().then(r => { const list = r?.patients ?? r?.data ?? r; setPatients(Array.isArray(list) ? list : []); }).catch(() => {});
  }, []);

  const loadEstimates = useCallback(async (pid) => {
    if (!pid) return;
    try {
      const data = await estimateService.getByPatient(pid);
      setEstimates(data);
    } catch { setError('Failed to load estimates.'); }
  }, []);

  useEffect(() => {
    if (selectedPatient) loadEstimates(selectedPatient.id);
    else setEstimates([]);
  }, [selectedPatient, loadEstimates]);

  const handleView = async (id) => {
    try {
      const data = await estimateService.getById(id);
      setViewEstimate(data);
    } catch { setError('Failed to load estimate.'); }
  };

  const handleStatusAction = async (action, id) => {
    try {
      if (action === 'present') await estimateService.present(id);
      else if (action === 'accept') await estimateService.accept(id);
      else if (action === 'decline') await estimateService.decline(id);
      loadEstimates(selectedPatient?.id);
      setViewEstimate(null);
    } catch (e) { setError(e.response?.data || 'Action failed.'); }
  };

  const handleAddItem = () => setItems(prev => [...prev, { ...emptyItem }]);
  const handleRemoveItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleCreate = async () => {
    if (!selectedPatient || items.some(i => !i.fee || !i.procedureName)) return;
    setSaving(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        treatmentPlanId: form.treatmentPlanId || null,
        expirationDate: form.expirationDate || null,
        discount: Number(form.discount) || 0,
        notes: form.notes,
        items: items.map(i => ({
          procedureId: Number(i.procedureId) || 1,
          toothNumber: i.toothNumber || null,
          surface: i.surface || null,
          fee: Number(i.fee),
          insuranceEstimate: Number(i.insuranceEstimate) || 0,
          notes: i.notes || null
        }))
      };
      await estimateService.create(payload);
      setCreateDialog(false);
      setForm(emptyForm);
      setItems([{ ...emptyItem }]);
      loadEstimates(selectedPatient.id);
    } catch (e) { setError(e.response?.data || 'Failed to create estimate.'); }
    finally { setSaving(false); }
  };

  const totalFee = items.reduce((s, i) => s + (Number(i.fee) || 0), 0);
  const totalIns = items.reduce((s, i) => s + (Number(i.insuranceEstimate) || 0), 0);
  const patientPortion = totalFee - totalIns - (Number(form.discount) || 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <EstimateIcon color="primary" fontSize="large" />
        <Typography variant="h4" fontWeight="bold">Treatment Estimates</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Autocomplete
            options={patients}
            getOptionLabel={p => p.fullName || `${p.firstName} ${p.lastName}`}
            value={selectedPatient}
            onChange={(_, v) => setSelectedPatient(v)}
            renderInput={params => <TextField {...params} label="Select Patient" size="small" />}
          />
        </Grid>
        {selectedPatient && (
          <Grid item xs={12} md={8} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}>
              New Estimate
            </Button>
          </Grid>
        )}
      </Grid>

      {selectedPatient && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estimate #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Total Fee</TableCell>
                <TableCell>Insurance Est.</TableCell>
                <TableCell>Patient Portion</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {estimates.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.estimateNumber}</TableCell>
                  <TableCell>{new Date(e.estimateDate).toLocaleDateString()}</TableCell>
                  <TableCell>{e.expirationDate ? new Date(e.expirationDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>${e.totalFee.toFixed(2)}</TableCell>
                  <TableCell>${e.insuranceEstimate.toFixed(2)}</TableCell>
                  <TableCell>${e.patientPortion.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip label={e.statusName} color={STATUS_COLORS[e.statusName] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleView(e.id)}><ViewIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {estimates.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">No estimates found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Treatment Estimate</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="Expiration Date" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={form.expirationDate} onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Discount ($)" size="small" type="number"
                value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" size="small" multiline rows={2}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Procedures</Typography>

          {items.map((item, idx) => (
            <Grid container spacing={1} key={idx} sx={{ mb: 1 }} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField fullWidth label="Procedure Name" size="small"
                  value={item.procedureName} onChange={e => handleItemChange(idx, 'procedureName', e.target.value)} />
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField fullWidth label="Tooth #" size="small"
                  value={item.toothNumber} onChange={e => handleItemChange(idx, 'toothNumber', e.target.value)} />
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField fullWidth label="Fee ($)" size="small" type="number"
                  value={item.fee} onChange={e => handleItemChange(idx, 'fee', e.target.value)} />
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField fullWidth label="Ins. Est. ($)" size="small" type="number"
                  value={item.insuranceEstimate} onChange={e => handleItemChange(idx, 'insuranceEstimate', e.target.value)} />
              </Grid>
              <Grid item xs={10} sm={2}>
                <TextField fullWidth label="Notes" size="small"
                  value={item.notes} onChange={e => handleItemChange(idx, 'notes', e.target.value)} />
              </Grid>
              <Grid item xs={2} sm={1}>
                <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)} disabled={items.length === 1}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Button size="small" startIcon={<AddIcon />} onClick={handleAddItem} sx={{ mt: 1 }}>
            Add Procedure
          </Button>

          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Grid container spacing={1}>
              <Grid item xs={4}><Typography variant="body2">Total Fee: <strong>${totalFee.toFixed(2)}</strong></Typography></Grid>
              <Grid item xs={4}><Typography variant="body2">Insurance Est.: <strong>${totalIns.toFixed(2)}</strong></Typography></Grid>
              <Grid item xs={4}><Typography variant="body2" color="primary">Patient Portion: <strong>${patientPortion.toFixed(2)}</strong></Typography></Grid>
            </Grid>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Saving…' : 'Create Estimate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={!!viewEstimate} onClose={() => setViewEstimate(null)} maxWidth="md" fullWidth>
        <DialogTitle>Estimate — {viewEstimate?.estimateNumber}</DialogTitle>
        <DialogContent>
          {viewEstimate && (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Typography variant="body2"><strong>Patient:</strong> {viewEstimate.patientName}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2"><strong>Status:</strong> <Chip label={viewEstimate.statusName} size="small" color={STATUS_COLORS[viewEstimate.statusName]} /></Typography></Grid>
                <Grid item xs={4}><Typography variant="body2"><strong>Total Fee:</strong> ${viewEstimate.totalFee.toFixed(2)}</Typography></Grid>
                <Grid item xs={4}><Typography variant="body2"><strong>Insurance:</strong> ${viewEstimate.insuranceEstimate.toFixed(2)}</Typography></Grid>
                <Grid item xs={4}><Typography variant="body2" color="primary"><strong>Patient Portion:</strong> ${viewEstimate.patientPortion.toFixed(2)}</Typography></Grid>
              </Grid>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Procedure</TableCell>
                    <TableCell>Tooth</TableCell>
                    <TableCell>Fee</TableCell>
                    <TableCell>Insurance</TableCell>
                    <TableCell>Patient</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewEstimate.items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.procedureName}</TableCell>
                      <TableCell>{item.toothNumber || '—'}</TableCell>
                      <TableCell>${item.fee.toFixed(2)}</TableCell>
                      <TableCell>${item.insuranceEstimate.toFixed(2)}</TableCell>
                      <TableCell>${item.patientPortion.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewEstimate(null)}>Close</Button>
          {viewEstimate?.statusName === 'Draft' && (
            <Button variant="outlined" onClick={() => handleStatusAction('present', viewEstimate.id)}>Present to Patient</Button>
          )}
          {viewEstimate?.statusName === 'Presented' && (
            <>
              <Button variant="outlined" color="error" onClick={() => handleStatusAction('decline', viewEstimate.id)}>Decline</Button>
              <Button variant="contained" color="success" startIcon={<AcceptIcon />} onClick={() => handleStatusAction('accept', viewEstimate.id)}>Accept</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
