import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, Tooltip, InputAdornment,
} from '@mui/material';
import { Add, Edit, PowerSettingsNew, Refresh, Search, Store } from '@mui/icons-material';
import { branchService } from '../services/branchService';

const EMPTY = { name: '', code: '', address: '', city: '', phone: '', email: '', managerName: '', isMainBranch: false };

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await branchService.getAll(!showAll);
      setBranches(data);
    } catch { setError('Failed to load branches.'); }
    finally { setLoading(false); }
  }, [showAll]);

  useEffect(() => { load(); }, [load]);

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase()) ||
    (b.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditTarget(null); setForm(EMPTY); setFormError(''); setDialogOpen(true); };
  const openEdit = (b) => { setEditTarget(b); setForm({ ...b }); setFormError(''); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { setFormError('Name and Code are required.'); return; }
    setSaving(true);
    try {
      if (editTarget) { await branchService.update(editTarget.id, form); setSuccess('Branch updated.'); }
      else { await branchService.create(form); setSuccess('Branch created.'); }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (b) => {
    try { await branchService.toggle(b.id); setSuccess(`${b.name} toggled.`); load(); }
    catch { setError('Toggle failed.'); }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Branches</Typography>
          <Typography variant="body2" color="text.secondary">Manage clinic branches and locations</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <FormControlLabel control={<Switch checked={showAll} onChange={e => setShowAll(e.target.checked)} size="small" />}
            label="Show inactive" />
          <Tooltip title="Refresh"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Branch</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TextField size="small" placeholder="Search branches…" value={search} onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />

      <Paper variant="outlined">
        {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell align="center">Type</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center">
                    <Box py={3} color="text.secondary">
                      <Store sx={{ fontSize: 40, mb: 1 }} />
                      <Typography>No branches found.</Typography>
                    </Box>
                  </TableCell></TableRow>
                ) : filtered.map(b => (
                  <TableRow key={b.id} hover sx={!b.isActive ? { opacity: 0.55 } : undefined}>
                    <TableCell><Chip label={b.code} size="small" variant="outlined" /></TableCell>
                    <TableCell><Typography variant="body2" fontWeight={500}>{b.name}</Typography></TableCell>
                    <TableCell>{b.city || '—'}</TableCell>
                    <TableCell>{b.phone || '—'}</TableCell>
                    <TableCell>{b.managerName || '—'}</TableCell>
                    <TableCell align="center">
                      {b.isMainBranch && <Chip label="Main" size="small" color="primary" />}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={b.isActive ? 'Active' : 'Inactive'} size="small"
                        color={b.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(b)}><Edit fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={b.isActive ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" color={b.isActive ? 'warning' : 'success'} onClick={() => handleToggle(b)}>
                          <PowerSettingsNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Edit Branch' : 'New Branch'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Box display="flex" gap={2}>
              <TextField label="Branch Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                size="small" required fullWidth />
              <TextField label="Code *" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                size="small" required sx={{ width: 130 }} />
            </Box>
            <TextField label="Address" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })}
              size="small" fullWidth />
            <Box display="flex" gap={2}>
              <TextField label="City" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })}
                size="small" fullWidth />
              <TextField label="Phone" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                size="small" fullWidth />
            </Box>
            <Box display="flex" gap={2}>
              <TextField label="Email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
                size="small" fullWidth type="email" />
              <TextField label="Manager Name" value={form.managerName || ''} onChange={e => setForm({ ...form, managerName: e.target.value })}
                size="small" fullWidth />
            </Box>
            <FormControlLabel control={<Switch checked={form.isMainBranch}
              onChange={e => setForm({ ...form, isMainBranch: e.target.checked })} />}
              label="This is the main branch" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Add />}>
            {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
