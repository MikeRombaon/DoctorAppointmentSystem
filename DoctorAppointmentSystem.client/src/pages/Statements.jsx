import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Chip, Alert,
  Tabs, Tab, Autocomplete, MenuItem, Select, FormControl, InputLabel,
  Accordion, AccordionSummary, AccordionDetails, Divider,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Tooltip
} from '@mui/material';
import {
  Print as PrintIcon, AccountBalance as ArIcon,
  ExpandMore as ExpandIcon, Add as AddIcon,
  Delete as DeleteIcon, Edit as EditIcon, Label as PurposeIcon
} from '@mui/icons-material';
import { statementService } from '../services/statementService';
import { patientService } from '../services/patientService';

const ADJUSTMENT_TYPES = ['Discount', 'WriteOff', 'CreditMemo', 'InsuranceAdjustment', 'Correction'];
const BUCKET_LABELS = ['0–30 days', '31–60 days', '61–90 days', '91–120 days', '120+ days'];
const BUCKET_KEYS = ['bucket0_30', 'bucket31_60', 'bucket61_90', 'bucket91_120', 'bucket120Plus'];
const PURPOSES_STORAGE_KEY = 'statement_adjustment_purposes';

const loadPurposes = () => {
  try {
    const stored = localStorage.getItem(PURPOSES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [
      'Patient Request', 'Insurance Overpayment', 'Courtesy Discount',
      'Write-off Bad Debt', 'Billing Error Correction', 'Insurance Adjustment',
      'Senior Discount', 'Staff Discount', 'Promotional Discount'
    ];
  } catch { return []; }
};

const savePurposes = (purposes) => {
  localStorage.setItem(PURPOSES_STORAGE_KEY, JSON.stringify(purposes));
};

export default function Statements() {
  const [tab, setTab] = useState(0);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [statement, setStatement] = useState(null);
  const [aging, setAging] = useState(null);
  const [agingLoading, setAgingLoading] = useState(false);
  const [adjDialog, setAdjDialog] = useState(null);
  const [adjForm, setAdjForm] = useState({ adjustmentType: 'Discount', amount: '', reason: '', notes: '', adjustmentDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Purposes state
  const [purposes, setPurposes] = useState(loadPurposes);
  const [purposeInput, setPurposeInput] = useState('');
  const [editingPurpose, setEditingPurpose] = useState(null); // { index, value }
  const [purposeError, setPurposeError] = useState('');

  useEffect(() => {
    patientService.getAll().then(r => { const list = r?.patients ?? r?.data ?? r; setPatients(Array.isArray(list) ? list : []); }).catch(() => {});
  }, []);

  const loadStatement = useCallback(async (pid) => {
    if (!pid) return;
    try {
      const data = await statementService.getPatientStatement(pid);
      setStatement(data);
    } catch { setError('Failed to load statement.'); }
  }, []);

  useEffect(() => {
    if (selectedPatient && tab === 0) loadStatement(selectedPatient.id);
    else if (!selectedPatient) setStatement(null);
  }, [selectedPatient, tab, loadStatement]);

  const loadAging = useCallback(async () => {
    setAgingLoading(true);
    try {
      const data = await statementService.getArAging();
      setAging(data);
    } catch { setError('Failed to load AR aging.'); }
    finally { setAgingLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 1) loadAging();
  }, [tab, loadAging]);

  // Purpose management handlers
  const handleAddPurpose = () => {
    const trimmed = purposeInput.trim();
    if (!trimmed) { setPurposeError('Purpose name is required.'); return; }
    if (purposes.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      setPurposeError('This purpose already exists.'); return;
    }
    const updated = [...purposes, trimmed];
    setPurposes(updated);
    savePurposes(updated);
    setPurposeInput('');
    setPurposeError('');
  };

  const handleDeletePurpose = (index) => {
    const updated = purposes.filter((_, i) => i !== index);
    setPurposes(updated);
    savePurposes(updated);
  };

  const handleStartEdit = (index) => {
    setEditingPurpose({ index, value: purposes[index] });
    setPurposeError('');
  };

  const handleSaveEdit = () => {
    if (!editingPurpose) return;
    const trimmed = editingPurpose.value.trim();
    if (!trimmed) { setPurposeError('Purpose name cannot be empty.'); return; }
    if (purposes.some((p, i) => i !== editingPurpose.index && p.toLowerCase() === trimmed.toLowerCase())) {
      setPurposeError('This purpose already exists.'); return;
    }
    const updated = purposes.map((p, i) => i === editingPurpose.index ? trimmed : p);
    setPurposes(updated);
    savePurposes(updated);
    setEditingPurpose(null);
    setPurposeError('');
  };

  const handleAddAdjustment = async () => {
    if (!adjDialog || !adjForm.amount || !adjForm.reason) return;
    setSaving(true);
    try {
      await statementService.addAdjustment({
        invoiceId: adjDialog,
        adjustmentType: ADJUSTMENT_TYPES.indexOf(adjForm.adjustmentType) + 1,
        amount: Number(adjForm.amount),
        reason: adjForm.reason,
        notes: adjForm.notes || null,
        adjustmentDate: adjForm.adjustmentDate || null
      });
      setAdjDialog(null);
      if (selectedPatient) loadStatement(selectedPatient.id);
    } catch (e) { setError(e.response?.data || 'Failed to save adjustment.'); }
    finally { setSaving(false); }
  };

  const handlePrintStatement = () => {
    if (!statement) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
      <html><head><title>Statement - ${statement.patientName}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;}
        th,td{border:1px solid #ccc;padding:8px;font-size:12px;}
        th{background:#f0f0f0;} h2,h3{margin:8px 0;} .summary{background:#f9f9f9;padding:12px;border-radius:4px;}
      </style></head><body>
      <h2>Patient Statement</h2>
      <p><strong>Patient:</strong> ${statement.patientName} &nbsp;&nbsp; <strong>Generated:</strong> ${new Date(statement.generatedAt).toLocaleString()}</p>
      <div class="summary">
        <strong>Total Billed:</strong> $${statement.totalBilled.toFixed(2)} &nbsp;|&nbsp;
        <strong>Total Paid:</strong> $${statement.totalPaid.toFixed(2)} &nbsp;|&nbsp;
        <strong>Outstanding Balance:</strong> $${statement.outstandingBalance.toFixed(2)}
      </div>
      ${statement.invoices.map(inv => `
        <h3>${inv.invoiceNumber} — ${new Date(inv.invoiceDate).toLocaleDateString()} — <span style="color:${inv.balance > 0 ? 'red' : 'green'}">${inv.statusName}</span></h3>
        <p>Total: $${inv.totalAmount.toFixed(2)} &nbsp; Paid: $${inv.totalPaid.toFixed(2)} &nbsp; Adjusted: $${inv.totalAdjusted.toFixed(2)} &nbsp; <strong>Balance: $${inv.balance.toFixed(2)}</strong></p>
      `).join('')}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <ArIcon color="primary" fontSize="large" />
        <Typography variant="h4" fontWeight="bold">Statements & AR Aging</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Patient Statement" />
        <Tab label="AR Aging" />
        <Tab label="Purpose Management" icon={<PurposeIcon fontSize="small" />} iconPosition="start" />
      </Tabs>

      {/* ── Patient Statement Tab ── */}
      {tab === 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={patients}
                getOptionLabel={p => p.fullName || `${p.firstName} ${p.lastName}`}
                value={selectedPatient}
                onChange={(_, v) => setSelectedPatient(v)}
                renderInput={params => <TextField {...params} label="Select Patient" size="small" />}
              />
            </Grid>
            {statement && (
              <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintStatement}>Print Statement</Button>
              </Grid>
            )}
          </Grid>

          {statement && (
            <>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Total Billed</Typography>
                    <Typography variant="h6">${statement.totalBilled.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Total Paid</Typography>
                    <Typography variant="h6" color="success.main">${statement.totalPaid.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Adjustments</Typography>
                    <Typography variant="h6">${statement.totalAdjusted?.toFixed(2) ?? '0.00'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Outstanding Balance</Typography>
                    <Typography variant="h6" color={statement.outstandingBalance > 0 ? 'error.main' : 'success.main'}>
                      ${statement.outstandingBalance.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {statement.invoices.map(inv => (
                <Accordion key={inv.id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandIcon />}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item xs={3}><Typography variant="body2" fontWeight="bold">{inv.invoiceNumber}</Typography></Grid>
                      <Grid item xs={2}><Typography variant="body2">{new Date(inv.invoiceDate).toLocaleDateString()}</Typography></Grid>
                      <Grid item xs={2}><Typography variant="body2">Total: ${inv.totalAmount.toFixed(2)}</Typography></Grid>
                      <Grid item xs={2}><Typography variant="body2" color="success.main">Paid: ${inv.totalPaid.toFixed(2)}</Typography></Grid>
                      <Grid item xs={2}>
                        <Typography variant="body2" color={inv.balance > 0 ? 'error.main' : 'text.primary'}>
                          Balance: ${inv.balance.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={1}><Chip label={inv.statusName} size="small" /></Grid>
                    </Grid>
                  </AccordionSummary>
                  <AccordionDetails>
                    {inv.payments.length > 0 && (
                      <>
                        <Typography variant="caption" fontWeight="bold">Payments</Typography>
                        <Table size="small" sx={{ mb: 1 }}>
                          <TableHead><TableRow>
                            <TableCell>Txn #</TableCell><TableCell>Date</TableCell>
                            <TableCell>Method</TableCell><TableCell>Amount</TableCell>
                          </TableRow></TableHead>
                          <TableBody>
                            {inv.payments.map(p => (
                              <TableRow key={p.id}>
                                <TableCell>{p.transactionNumber}</TableCell>
                                <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                                <TableCell>{p.paymentMethod}</TableCell>
                                <TableCell>${p.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    )}
                    {inv.adjustments.length > 0 && (
                      <>
                        <Typography variant="caption" fontWeight="bold">Adjustments</Typography>
                        <Table size="small" sx={{ mb: 1 }}>
                          <TableHead><TableRow>
                            <TableCell>Type</TableCell><TableCell>Date</TableCell>
                            <TableCell>Reason</TableCell><TableCell>Amount</TableCell>
                          </TableRow></TableHead>
                          <TableBody>
                            {inv.adjustments.map(a => (
                              <TableRow key={a.id}>
                                <TableCell>{a.adjustmentTypeName}</TableCell>
                                <TableCell>{new Date(a.adjustmentDate).toLocaleDateString()}</TableCell>
                                <TableCell>{a.reason}</TableCell>
                                <TableCell>${a.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    )}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => {
                      setAdjDialog(inv.id);
                      setAdjForm({ adjustmentType: 'Discount', amount: '', reason: '', notes: '', adjustmentDate: '' });
                    }}>
                      Add Adjustment
                    </Button>
                  </AccordionDetails>
                </Accordion>
              ))}
            </>
          )}
        </>
      )}

      {/* ── AR Aging Tab ── */}
      {tab === 1 && (
        <>
          <Button variant="outlined" onClick={loadAging} sx={{ mb: 2 }} disabled={agingLoading}>
            {agingLoading ? 'Loading…' : 'Refresh'}
          </Button>

          {aging && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {BUCKET_LABELS.map((label, i) => (
                  <Grid item xs={6} sm={4} md={2} key={i}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="h6" color={i >= 2 ? 'error.main' : 'text.primary'}>
                        ${(aging.summary[BUCKET_KEYS[i]] || 0).toFixed(2)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
                <Grid item xs={6} sm={4} md={2}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.light' }}>
                    <Typography variant="caption" color="white">Total AR</Typography>
                    <Typography variant="h6" color="white">${(aging.summary.total || 0).toFixed(2)}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient</TableCell>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Invoice Date</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>Age (days)</TableCell>
                      <TableCell>Bucket</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aging.rows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.patientName}</TableCell>
                        <TableCell>{r.invoiceNumber}</TableCell>
                        <TableCell>{new Date(r.invoiceDate).toLocaleDateString()}</TableCell>
                        <TableCell>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>${r.totalAmount.toFixed(2)}</TableCell>
                        <TableCell sx={{ color: r.balance > 0 ? 'error.main' : 'inherit', fontWeight: 'bold' }}>
                          ${r.balance.toFixed(2)}
                        </TableCell>
                        <TableCell>{r.age}</TableCell>
                        <TableCell>
                          <Chip label={r.bucket} size="small"
                            color={r.bucket === '120+' || r.bucket === '91-120' ? 'error' : r.bucket === '61-90' ? 'warning' : 'default'} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {aging.rows.length === 0 && (
                      <TableRow><TableCell colSpan={8} align="center">No outstanding balances.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}

      {/* ── Purpose Management Tab ── */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Add New Purpose
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Purpose name"
                  value={purposeInput}
                  onChange={e => { setPurposeInput(e.target.value); setPurposeError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddPurpose()}
                  error={!!purposeError}
                  helperText={purposeError}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddPurpose} sx={{ whiteSpace: 'nowrap' }}>
                  Add
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                These purposes appear as a dropdown when adding an adjustment to an invoice.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                Purposes ({purposes.length})
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {purposes.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No purposes defined yet. Add one on the left.
                </Typography>
              )}
              <List dense disablePadding>
                {purposes.map((p, i) => (
                  <ListItem
                    key={i}
                    divider={i < purposes.length - 1}
                    sx={{ py: 0.75, px: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    {editingPurpose?.index === i ? (
                      <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={editingPurpose.value}
                          onChange={e => setEditingPurpose(prev => ({ ...prev, value: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingPurpose(null); }}
                          error={!!purposeError}
                          helperText={purposeError}
                          autoFocus
                        />
                        <Button size="small" variant="contained" onClick={handleSaveEdit}>Save</Button>
                        <Button size="small" onClick={() => { setEditingPurpose(null); setPurposeError(''); }}>Cancel</Button>
                      </Box>
                    ) : (
                      <>
                        <ListItemText
                          primary={p}
                          primaryTypographyProps={{ fontSize: '0.9rem' }}
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleStartEdit(i)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeletePurpose(i)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </>
                    )}
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Adjustment Dialog ── */}
      <Dialog open={!!adjDialog} onClose={() => setAdjDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Adjustment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={adjForm.adjustmentType} label="Type"
                  onChange={e => setAdjForm(f => ({ ...f, adjustmentType: e.target.value }))}>
                  {ADJUSTMENT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Amount ($) *" size="small" type="number"
                value={adjForm.amount} onChange={e => setAdjForm(f => ({ ...f, amount: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Purpose / Reason *</InputLabel>
                <Select
                  value={adjForm.reason}
                  label="Purpose / Reason *"
                  onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))}
                  displayEmpty
                >
                  {purposes.length === 0 && (
                    <MenuItem disabled value="">
                      <em>No purposes defined — add them in the Purposes tab</em>
                    </MenuItem>
                  )}
                  {purposes.map(p => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Adjustment Date" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={adjForm.adjustmentDate} onChange={e => setAdjForm(f => ({ ...f, adjustmentDate: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" size="small" multiline rows={2}
                value={adjForm.notes} onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAdjustment} disabled={saving || !adjForm.amount || !adjForm.reason}>
            {saving ? 'Saving…' : 'Save Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
