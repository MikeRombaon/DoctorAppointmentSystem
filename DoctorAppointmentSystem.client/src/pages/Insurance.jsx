import React, { useState, useEffect, useCallback } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Chip, IconButton,
  Tabs, Tab, Switch, FormControlLabel, Autocomplete, CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, PowerSettingsNew as ToggleIcon,
  HealthAndSafety as InsuranceIcon
} from '@mui/icons-material';
import { insuranceService } from '../services/insuranceService';
import { patientService } from '../services/patientService';

const emptyPayer = {
  name: '', payerCode: '', contactName: '', phone: '',
  email: '', address: '', website: '', notes: ''
};

const emptyPatientIns = {
  patientId: '', insurancePayerId: '', memberNumber: '',
  groupNumber: '', planName: '', effectiveDate: '', expirationDate: '',
  annualMaximum: '', deductible: '', deductibleMet: '0', annualUsed: '0',
  coveragePercentPreventive: '', coveragePercentBasic: '', coveragePercentMajor: '',
  isPrimary: true, notes: ''
};

export default function Insurance() {
  const [tab, setTab] = useState(0);
  const [payers, setPayers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientInsurances, setPatientInsurances] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payerDialog, setPayerDialog] = useState(false);
  const [patInsDialog, setPatInsDialog] = useState(false);
  const [editingPayer, setEditingPayer] = useState(null);
  const [editingPatIns, setEditingPatIns] = useState(null);
  const [payerForm, setPayerForm] = useState(emptyPayer);
  const [patInsForm, setPatInsForm] = useState(emptyPatientIns);
  const [saving, setSaving] = useState(false);

  const loadPayers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await insuranceService.getPayers(false);
      setPayers(data);
    } catch { setError('Failed to load payers.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPayers(); }, [loadPayers]);

  useEffect(() => {
    patientService.getAll().then(r => { const list = r?.patients ?? r?.data ?? r; setPatients(Array.isArray(list) ? list : []); }).catch(() => {});
  }, []);

  const loadPatientInsurances = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const data = await insuranceService.getPatientInsurances(patientId);
      setPatientInsurances(data);
    } catch { setError('Failed to load patient insurances.'); }
  }, []);

  useEffect(() => {
    if (selectedPatient) loadPatientInsurances(selectedPatient.id);
  }, [selectedPatient, loadPatientInsurances]);

  const handleOpenPayerDialog = (payer = null) => {
    setEditingPayer(payer);
    setPayerForm(payer ? {
      name: payer.name, payerCode: payer.payerCode || '',
      contactName: payer.contactName || '', phone: payer.phone || '',
      email: payer.email || '', address: payer.address || '',
      website: payer.website || '', notes: payer.notes || ''
    } : emptyPayer);
    setPayerDialog(true);
  };

  const handleSavePayer = async () => {
    if (!payerForm.name) return;
    setSaving(true);
    try {
      if (editingPayer) await insuranceService.updatePayer(editingPayer.id, payerForm);
      else await insuranceService.createPayer(payerForm);
      setPayerDialog(false);
      loadPayers();
    } catch { setError('Failed to save payer.'); }
    finally { setSaving(false); }
  };

  const handleTogglePayer = async (id) => {
    try { await insuranceService.togglePayer(id); loadPayers(); }
    catch { setError('Failed to toggle payer.'); }
  };

  const handleOpenPatInsDialog = (record = null) => {
    setEditingPatIns(record);
    setPatInsForm(record ? {
      patientId: record.patientId,
      insurancePayerId: record.insurancePayerId,
      memberNumber: record.memberNumber,
      groupNumber: record.groupNumber || '',
      planName: record.planName || '',
      effectiveDate: record.effectiveDate ? record.effectiveDate.split('T')[0] : '',
      expirationDate: record.expirationDate ? record.expirationDate.split('T')[0] : '',
      annualMaximum: record.annualMaximum ?? '',
      deductible: record.deductible ?? '',
      deductibleMet: record.deductibleMet ?? 0,
      annualUsed: record.annualUsed ?? 0,
      coveragePercentPreventive: record.coveragePercentPreventive ?? '',
      coveragePercentBasic: record.coveragePercentBasic ?? '',
      coveragePercentMajor: record.coveragePercentMajor ?? '',
      isPrimary: record.isPrimary,
      notes: record.notes || ''
    } : { ...emptyPatientIns, patientId: selectedPatient?.id || '' });
    setPatInsDialog(true);
  };

  const handleSavePatIns = async () => {
    if (!patInsForm.insurancePayerId || !patInsForm.memberNumber) return;
    setSaving(true);
    try {
      const payload = {
        ...patInsForm,
        patientId: selectedPatient?.id || patInsForm.patientId,
        annualMaximum: patInsForm.annualMaximum ? Number(patInsForm.annualMaximum) : null,
        deductible: patInsForm.deductible ? Number(patInsForm.deductible) : null,
        deductibleMet: Number(patInsForm.deductibleMet) || 0,
        annualUsed: Number(patInsForm.annualUsed) || 0,
        coveragePercentPreventive: patInsForm.coveragePercentPreventive ? Number(patInsForm.coveragePercentPreventive) : null,
        coveragePercentBasic: patInsForm.coveragePercentBasic ? Number(patInsForm.coveragePercentBasic) : null,
        coveragePercentMajor: patInsForm.coveragePercentMajor ? Number(patInsForm.coveragePercentMajor) : null,
      };
      if (editingPatIns) await insuranceService.updatePatientInsurance(editingPatIns.id, payload);
      else await insuranceService.addPatientInsurance(payload);
      setPatInsDialog(false);
      loadPatientInsurances(selectedPatient?.id);
    } catch { setError('Failed to save patient insurance.'); }
    finally { setSaving(false); }
  };

  const handleDeletePatIns = async (id) => {
    if (!window.confirm('Remove this insurance record?')) return;
    try { await insuranceService.deletePatientInsurance(id); loadPatientInsurances(selectedPatient?.id); }
    catch { setError('Failed to remove.'); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <InsuranceIcon color="primary" fontSize="large" />
        <Typography variant="h4" fontWeight="bold">Insurance</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Payers" />
        <Tab label="Patient Insurance" />
      </Tabs>

      {/* ── Payers Tab ── */}
      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenPayerDialog()}>
              Add Payer
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Payer Code</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow>
                ) : payers.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.payerCode || '—'}</TableCell>
                    <TableCell>{p.contactName || '—'}</TableCell>
                    <TableCell>{p.phone || '—'}</TableCell>
                    <TableCell>{p.email || '—'}</TableCell>
                    <TableCell>
                      <Chip label={p.isActive ? 'Active' : 'Inactive'} color={p.isActive ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenPayerDialog(p)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleTogglePayer(p.id)}><ToggleIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ── Patient Insurance Tab ── */}
      {tab === 1 && (
        <>
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
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenPatInsDialog()}>
                  Add Insurance
                </Button>
              </Grid>
            )}
          </Grid>

          {selectedPatient && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Payer</TableCell>
                    <TableCell>Member #</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Effective</TableCell>
                    <TableCell>Expiration</TableCell>
                    <TableCell>Annual Max</TableCell>
                    <TableCell>Annual Used</TableCell>
                    <TableCell>Primary</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patientInsurances.map(pi => (
                    <TableRow key={pi.id}>
                      <TableCell>{pi.payerName}</TableCell>
                      <TableCell>{pi.memberNumber}</TableCell>
                      <TableCell>{pi.planName || '—'}</TableCell>
                      <TableCell>{pi.effectiveDate ? new Date(pi.effectiveDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{pi.expirationDate ? new Date(pi.expirationDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{pi.annualMaximum ? `$${pi.annualMaximum.toLocaleString()}` : '—'}</TableCell>
                      <TableCell>{pi.annualUsed ? `$${pi.annualUsed.toLocaleString()}` : '$0'}</TableCell>
                      <TableCell><Chip label={pi.isPrimary ? 'Primary' : 'Secondary'} size="small" color={pi.isPrimary ? 'primary' : 'default'} /></TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleOpenPatInsDialog(pi)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeletePatIns(pi.id)}>✕</IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {patientInsurances.length === 0 && (
                    <TableRow><TableCell colSpan={9} align="center">No insurance records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ── Payer Dialog ── */}
      <Dialog open={payerDialog} onClose={() => setPayerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPayer ? 'Edit Payer' : 'New Payer'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[['name', 'Name *', true], ['payerCode', 'Payer Code'], ['contactName', 'Contact Name'],
              ['phone', 'Phone'], ['email', 'Email'], ['website', 'Website'], ['address', 'Address']].map(([field, label, required]) => (
              <Grid item xs={12} sm={field === 'address' ? 12 : 6} key={field}>
                <TextField
                  fullWidth label={label} size="small" required={required}
                  value={payerForm[field]} onChange={e => setPayerForm(f => ({ ...f, [field]: e.target.value }))}
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" size="small" multiline rows={2}
                value={payerForm.notes} onChange={e => setPayerForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayerDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePayer} disabled={saving || !payerForm.name}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Patient Insurance Dialog ── */}
      <Dialog open={patInsDialog} onClose={() => setPatInsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPatIns ? 'Edit Insurance' : 'Add Insurance'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={payers.filter(p => p.isActive)}
                getOptionLabel={p => p.name}
                value={payers.find(p => p.id === patInsForm.insurancePayerId) || null}
                onChange={(_, v) => setPatInsForm(f => ({ ...f, insurancePayerId: v?.id || '' }))}
                renderInput={params => <TextField {...params} label="Payer *" size="small" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Member Number *" size="small"
                value={patInsForm.memberNumber} onChange={e => setPatInsForm(f => ({ ...f, memberNumber: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Group Number" size="small"
                value={patInsForm.groupNumber} onChange={e => setPatInsForm(f => ({ ...f, groupNumber: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Plan Name" size="small"
                value={patInsForm.planName} onChange={e => setPatInsForm(f => ({ ...f, planName: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Effective Date" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={patInsForm.effectiveDate} onChange={e => setPatInsForm(f => ({ ...f, effectiveDate: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Expiration Date" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={patInsForm.expirationDate} onChange={e => setPatInsForm(f => ({ ...f, expirationDate: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Annual Maximum ($)" size="small" type="number"
                value={patInsForm.annualMaximum} onChange={e => setPatInsForm(f => ({ ...f, annualMaximum: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Deductible ($)" size="small" type="number"
                value={patInsForm.deductible} onChange={e => setPatInsForm(f => ({ ...f, deductible: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="Preventive Coverage %" size="small" type="number"
                value={patInsForm.coveragePercentPreventive}
                onChange={e => setPatInsForm(f => ({ ...f, coveragePercentPreventive: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="Basic Coverage %" size="small" type="number"
                value={patInsForm.coveragePercentBasic}
                onChange={e => setPatInsForm(f => ({ ...f, coveragePercentBasic: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="Major Coverage %" size="small" type="number"
                value={patInsForm.coveragePercentMajor}
                onChange={e => setPatInsForm(f => ({ ...f, coveragePercentMajor: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={patInsForm.isPrimary} onChange={e => setPatInsForm(f => ({ ...f, isPrimary: e.target.checked }))} />}
                label="Primary Insurance"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" size="small" multiline rows={2}
                value={patInsForm.notes} onChange={e => setPatInsForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPatInsDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePatIns}
            disabled={saving || !patInsForm.insurancePayerId || !patInsForm.memberNumber}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
