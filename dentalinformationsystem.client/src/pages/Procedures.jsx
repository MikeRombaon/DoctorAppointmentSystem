import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, Tooltip, TablePagination, InputAdornment,
} from '@mui/material';
import {
  Add, Edit, Delete, PowerSettingsNew, Refresh, Search, MedicalServices,
} from '@mui/icons-material';
import { procedureService } from '../services/procedureService';

const EMPTY_FORM = {
  code: '', name: '', description: '', defaultCost: '', estimatedDurationMinutes: 30, isActive: true,
};

export default function Procedures() {
  const [procedures, setProcedures] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await procedureService.getAll({ page: page + 1, pageSize: rowsPerPage, search });
      setProcedures(result.items || []);
      setTotal(result.totalCount || 0);
    } catch {
      setError('Failed to load procedures.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => { load(); }, [load]);

  // Reset page on search
  const handleSearch = (e) => { setSearch(e.target.value); setPage(0); };

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); setDialogOpen(true); };
  const openEdit = (p) => {
    setEditTarget(p);
    setForm({
      code: p.code, name: p.name, description: p.description || '',
      defaultCost: p.defaultCost, estimatedDurationMinutes: p.estimatedDurationMinutes, isActive: p.isActive,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || form.defaultCost === '') {
      setFormError('Code, name, and cost are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        defaultCost: Number(form.defaultCost),
        estimatedDurationMinutes: Number(form.estimatedDurationMinutes),
      };
      if (editTarget) {
        await procedureService.update(editTarget.id, payload);
        setSuccess('Procedure updated.');
      } else {
        await procedureService.create(payload);
        setSuccess('Procedure created.');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Save failed. Check code uniqueness.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await procedureService.toggle(p.id);
      setSuccess(`${p.name} ${p.isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch { setError('Toggle failed.'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await procedureService.delete(deleteTarget.id);
      setDeleteTarget(null);
      setSuccess('Procedure deleted.');
      load();
    } catch { setError('Delete failed.'); }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Procedure Catalog</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage ADA/CDT procedure codes, default costs, and durations
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add Procedure
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Search */}
      <TextField size="small" placeholder="Search by code or name…"
        value={search} onChange={handleSearch} sx={{ mb: 2, width: { xs: '100%', sm: 360 } }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />

      {/* Table */}
      <Paper variant="outlined">
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Default Cost</TableCell>
                    <TableCell align="right">Duration (min)</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {procedures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Box py={3} color="text.secondary">
                          <MedicalServices sx={{ fontSize: 40, mb: 1 }} />
                          <Typography>No procedures found. Add your first procedure.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : procedures.map((p) => (
                    <TableRow key={p.id} hover sx={!p.isActive ? { opacity: 0.55 } : undefined}>
                      <TableCell><Chip label={p.code} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 220 }} color="text.secondary">
                          {p.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">₱{Number(p.defaultCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right">{p.estimatedDurationMinutes}</TableCell>
                      <TableCell align="center">
                        <Chip label={p.isActive ? 'Active' : 'Inactive'}
                          color={p.isActive ? 'success' : 'default'} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(p)}><Edit fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={p.isActive ? 'Deactivate' : 'Activate'}>
                          <IconButton size="small" color={p.isActive ? 'warning' : 'success'}
                            onClick={() => handleToggle(p)}>
                            <PowerSettingsNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete (soft)">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(p)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={total} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} rowsPerPageOptions={[20]} />
          </>
        )}
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Edit Procedure' : 'New Procedure'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Box display="flex" gap={2}>
              <TextField label="Procedure Code" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                size="small" required sx={{ width: 150 }} placeholder="e.g. D0120" />
              <TextField label="Procedure Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                size="small" required fullWidth />
            </Box>
            <TextField label="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size="small" multiline rows={2} fullWidth />
            <Box display="flex" gap={2}>
              <TextField label="Default Cost (₱)" value={form.defaultCost}
                onChange={(e) => setForm({ ...form, defaultCost: e.target.value })}
                size="small" type="number" required sx={{ width: 160 }}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }} />
              <TextField label="Duration (minutes)" value={form.estimatedDurationMinutes}
                onChange={(e) => setForm({ ...form, estimatedDurationMinutes: e.target.value })}
                size="small" type="number" sx={{ width: 160 }}
                InputProps={{ inputProps: { min: 5, step: 5 } }} />
            </Box>
            {editTarget && (
              <FormControlLabel
                control={<Switch checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
                label="Active" />
            )}
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

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete Procedure</DialogTitle>
        <DialogContent>
          <Typography>
            Soft-delete <strong>{deleteTarget?.name}</strong>? Existing treatments will retain the reference.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" startIcon={<Delete />} onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
