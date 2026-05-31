import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Chip, IconButton,
  Autocomplete, Alert, Stepper, Step, StepLabel
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon, Article as ClaimIcon } from '@mui/icons-material';
import { claimService } from '../services/claimService';
import { insuranceService } from '../services/insuranceService';
import { invoiceService } from '../services/invoiceService';
import { patientService } from '../services/patientService';

const STATUS_COLORS = {
  Draft: 'default', Submitted: 'info', Pending: 'warning',
  Approved: 'success', Denied: 'error', Paid: 'success', Voided: 'default'
};

const CLAIM_STEPS = ['Draft', 'Submitted', 'Pending', 'Approved/Denied', 'Paid'];

export default function Claims() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [claims, setClaims] = useState([]);
  const [payers, setPayers] = useState([]);
  const [patientInsurances, setPatientInsurances] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [viewClaim, setViewClaim] = useState(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [adjDialog, setAdjDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    invoiceId: '', insurancePayerId: '', patientInsuranceId: '',
    serviceDateFrom: '', serviceDateTo: '', billedAmount: '0', notes: ''
  });
  const [adjForm, setAdjForm] = useState({
    allowedAmount: '0', paidAmount: '0', adjustmentAmount: '0',
    patientResponsibility: '0', eobNotes: '', denialReason: ''
  });

  useEffect(() => {
    patientService.getAll().then(r => {
      const list = r?.patients ?? r?.data ?? r;
      setPatients(Array.isArray(list) ? list : []);
    }).catch(() => {});
    insuranceService.getPayers(true).then(setPayers).catch(() => {});
  }, []);

  const loadClaims = useCallback(async (pid) => {
    if (!pid) return;
    try { setClaims(await claimService.getByPatient(pid)); }
    catch { setError('Failed to load claims.'); }
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadClaims(selectedPatient.id);
      insuranceService.getPatientInsurances(selectedPatient.id).then(setPatientInsurances).catch(() => {});
      invoiceService.getAll(1, 100, null, selectedPatient.id).then(r => setInvoices(r.invoices || r || [])).catch(() => {});
    } else {
      setClaims([]);
    }
  }, [selectedPatient, loadClaims]);

  const handleCreate = async () => {
    if (!form.invoiceId || !form.insurancePayerId) return;
    setSaving(true);
    try {
      await claimService.create({
        patientId: selectedPatient.id,
        invoiceId: Number(form.invoiceId),
        insurancePayerId: Number(form.insurancePayerId),
        patientInsuranceId: form.patientInsuranceId ? Number(form.patientInsuranceId) : null,
        serviceDateFrom: form.serviceDateFrom,
        serviceDateTo: form.serviceDateTo,
        billedAmount: Number(form.billedAmount) || 0,
        notes: form.notes
      });
      setCreateDialog(false);
      loadClaims(selectedPatient.id);
    } catch (e) { setError(e.response?.data || 'Failed to create claim.'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async (id) => {
    try { await claimService.submit(id); loadClaims(selectedPatient.id); setViewClaim(null); }
    catch (e) { setError(e.response?.data || 'Failed to submit claim.'); }
  };

  const handleAdjudicate = async () => {
    if (!adjDialog) return;
    setSaving(true);
    try {
      await claimService.adjudicate(adjDialog, {
        allowedAmount: Number(adjForm.allowedAmount),
        paidAmount: Number(adjForm.paidAmount),
        adjustmentAmount: Number(adjForm.adjustmentAmount),
        patientResponsibility: Number(adjForm.patientResponsibility),
        eobNotes: adjForm.eobNotes || null,
        denialReason: adjForm.denialReason || null
      });
      setAdjDialog(null);
      loadClaims(selectedPatient.id);
      setViewClaim(null);
    } catch (e) { setError(e.response?.data || 'Failed to adjudicate claim.'); }
    finally { setSaving(false); }
  };

  const handleMarkPaid = async (id, amt) => {
    try { await claimService.markPaid(id, amt); loadClaims(selectedPatient.id); setViewClaim(null); }
    catch (e) { setError(e.response?.data || 'Failed to mark as paid.'); }
  };

  const handleVoid = async (id) => {
    if (!window.confirm('Void this claim?')) return;
    try { await claimService.void(id); loadClaims(selectedPatient.id); setViewClaim(null); }
    catch (e) { setError(e.response?.data || 'Failed to void claim.'); }
  };

  const getStepIndex = (statusName) => {
    const map = { Draft: 0, Submitted: 1, Pending: 2, Approved: 3, Denied: 3, Paid: 4, Voided: 0 };
    return map[statusName] ?? 0;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <ClaimIcon color="primary" fontSize="large" />
        <Typography variant="h4" fontWeight="bold">Insurance Claims</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Autocomplete
            options={Array.isArray(patients) ? patients : []}
            getOptionLabel={p => p.fullName || `${p.firstName} ${p.lastName}`}
            value={selectedPatient}
            onChange={(_, v) => setSelectedPatient(v)}
            renderInput={params => <TextField {...params} label="Select Patient" size="small" />}
          />
        </Grid>
        {selectedPatient && (
          <Grid item xs={12} md={8} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}>
              New Claim
            </Button>
          </Grid>
        )}
      </Grid>

      {selectedPatient && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Claim #</TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell>Payer</TableCell>
                <TableCell>Service From</TableCell>
                <TableCell>Billed</TableCell>
                <TableCell>Allowed</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Patient Resp.</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {claims.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.claimNumber}</TableCell>
                  <TableCell>{c.invoiceNumber}</TableCell>
                  <TableCell>{c.payerName}</TableCell>
                  <TableCell>{new Date(c.serviceDateFrom).toLocaleDateString()}</TableCell>
                  <TableCell>${c.billedAmount.toFixed(2)}</TableCell>
                  <TableCell>${c.allowedAmount.toFixed(2)}</TableCell>
                  <TableCell>${c.paidAmount.toFixed(2)}</TableCell>
                  <TableCell>${c.patientResponsibility.toFixed(2)}</TableCell>
                  <TableCell><Chip label={c.statusName} color={STATUS_COLORS[c.statusName] || 'default'} size="small" /></TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={async () => {
                      try { setViewClaim(await claimService.getById(c.id)); }
                      catch { setError('Failed to load claim.'); }
                    }}><ViewIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {claims.length === 0 && (
                <TableRow><TableCell colSpan={10} align="center">No claims found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Insurance Claim</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={invoices}
                getOptionLabel={i => i.invoiceNumber || `Invoice ${i.id}`}
                onChange={(_, v) => setForm(f => ({ ...f, invoiceId: v?.id || '', billedAmount: v?.totalAmount?.toString() || '0' }))}
                renderInput={params => <TextField {...params} label="Invoice *" size="small" />}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={payers}
                getOptionLabel={p => p.name}
                onChange={(_, v) => setForm(f => ({ ...f, insurancePayerId: v?.id || '' }))}
                renderInput={params => <TextField {...params} label="Payer *" size="small" />}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={patientInsurances}
                getOptionLabel={pi => `${pi.payerName} — ${pi.memberNumber}`}
                onChange={(_, v) => setForm(f => ({ ...f, patientInsuranceId: v?.id || '' }))}
                renderInput={params => <TextField {...params} label="Patient Insurance (optional)" size="small" />}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Service From *" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={form.serviceDateFrom} onChange={e => setForm(f => ({ ...f, serviceDateFrom: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Service To *" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={form.serviceDateTo} onChange={e => setForm(f => ({ ...f, serviceDateTo: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Billed Amount ($)" size="small" type="number"
                value={form.billedAmount} onChange={e => setForm(f => ({ ...f, billedAmount: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" size="small" multiline rows={2}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.invoiceId || !form.insurancePayerId}>
            {saving ? 'Saving…' : 'Create Claim'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View Claim Dialog ── */}
      <Dialog open={!!viewClaim} onClose={() => setViewClaim(null)} maxWidth="md" fullWidth>
        <DialogTitle>Claim — {viewClaim?.claimNumber}</DialogTitle>
        <DialogContent>
          {viewClaim && (
            <>
              <Stepper activeStep={getStepIndex(viewClaim.statusName)} sx={{ mb: 3 }}>
                {CLAIM_STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
              </Stepper>
              <Grid container spacing={2}>
                <Grid item xs={6}><Typography variant="body2"><strong>Patient:</strong> {viewClaim.patientName}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2"><strong>Payer:</strong> {viewClaim.payerName}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2"><strong>Invoice:</strong> {viewClaim.invoiceNumber}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2"><strong>Status:</strong> <Chip label={viewClaim.statusName} color={STATUS_COLORS[viewClaim.statusName]} size="small" /></Typography></Grid>
                <Grid item xs={3}><Typography variant="body2"><strong>Billed:</strong> ${viewClaim.billedAmount.toFixed(2)}</Typography></Grid>
                <Grid item xs={3}><Typography variant="body2"><strong>Allowed:</strong> ${viewClaim.allowedAmount.toFixed(2)}</Typography></Grid>
                <Grid item xs={3}><Typography variant="body2"><strong>Paid:</strong> ${viewClaim.paidAmount.toFixed(2)}</Typography></Grid>
                <Grid item xs={3}><Typography variant="body2"><strong>Patient Resp.:</strong> ${viewClaim.patientResponsibility.toFixed(2)}</Typography></Grid>
                {viewClaim.eobNotes && <Grid item xs={12}><Typography variant="body2"><strong>EOB Notes:</strong> {viewClaim.eobNotes}</Typography></Grid>}
                {viewClaim.denialReason && <Grid item xs={12}><Typography variant="body2" color="error"><strong>Denial Reason:</strong> {viewClaim.denialReason}</Typography></Grid>}
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewClaim(null)}>Close</Button>
          {viewClaim?.statusName === 'Draft' && (
            <Button variant="outlined" onClick={() => handleSubmit(viewClaim.id)}>Submit Claim</Button>
          )}
          {(viewClaim?.statusName === 'Submitted' || viewClaim?.statusName === 'Pending') && (
            <Button variant="outlined" onClick={() => { setAdjDialog(viewClaim.id); setAdjForm({ allowedAmount: '0', paidAmount: '0', adjustmentAmount: '0', patientResponsibility: '0', eobNotes: '', denialReason: '' }); }}>
              Post Adjudication / EOB
            </Button>
          )}
          {viewClaim?.statusName === 'Approved' && (
            <Button variant="contained" color="success" onClick={() => handleMarkPaid(viewClaim.id, viewClaim.paidAmount)}>
              Mark Paid
            </Button>
          )}
          {viewClaim?.statusName !== 'Voided' && viewClaim?.statusName !== 'Paid' && (
            <Button color="error" onClick={() => handleVoid(viewClaim.id)}>Void</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Adjudication Dialog ── */}
      <Dialog open={!!adjDialog} onClose={() => setAdjDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Post Adjudication / EOB</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[['allowedAmount', 'Allowed Amount ($)'], ['paidAmount', 'Paid Amount ($)'],
              ['adjustmentAmount', 'Adjustment ($)'], ['patientResponsibility', 'Patient Responsibility ($)']].map(([field, label]) => (
              <Grid item xs={6} key={field}>
                <TextField fullWidth label={label} size="small" type="number"
                  value={adjForm[field]} onChange={e => setAdjForm(f => ({ ...f, [field]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <TextField fullWidth label="EOB Notes" size="small" multiline rows={2}
                value={adjForm.eobNotes} onChange={e => setAdjForm(f => ({ ...f, eobNotes: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Denial Reason (if denied)" size="small"
                value={adjForm.denialReason} onChange={e => setAdjForm(f => ({ ...f, denialReason: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdjudicate} disabled={saving}>
            {saving ? 'Saving…' : 'Post EOB'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
