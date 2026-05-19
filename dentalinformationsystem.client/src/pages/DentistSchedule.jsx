import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, Grid,
} from '@mui/material';
import { Add, Delete, Refresh, Block } from '@mui/icons-material';
import { scheduleService } from '../services/scheduleService';
import { userService } from '../services/userService';
import { branchService } from '../services/branchService';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

export default function DentistSchedule() {
  const [tab, setTab] = useState(0);
  const [dentists, setDentists] = useState([]);
  const [branches, setBranches] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedDentist, setSelectedDentist] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Block dialog
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({ dentistId: '', branchId: '', blockDate: '', isAllDay: true, reason: '', startTime: '', endTime: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      userService.getAll ? userService.getAll() : fetch('/api/users').then(r => r.json()),
      branchService.getAll()
    ]).then(([users, brs]) => {
      const dentistList = (users?.items || users || []).filter(u => u.role === 'ClinicalStaff' || u.role === 2);
      setDentists(dentistList);
      setBranches(brs);
    }).catch(() => setError('Failed to load users/branches.'));
  }, []);

  const loadSchedules = useCallback(async () => {
    if (!selectedDentist) return;
    setLoading(true);
    try {
      const data = await scheduleService.getSchedules({
        dentistId: selectedDentist,
        branchId: selectedBranch || undefined
      });
      setSchedules(data);
    } catch { setError('Failed to load schedules.'); }
    finally { setLoading(false); }
  }, [selectedDentist, selectedBranch]);

  const loadBlocks = useCallback(async () => {
    if (!selectedDentist) return;
    setLoading(true);
    try {
      const data = await scheduleService.getBlocks({
        dentistId: selectedDentist,
        branchId: selectedBranch || undefined
      });
      setBlocks(data);
    } catch { setError('Failed to load blocks.'); }
    finally { setLoading(false); }
  }, [selectedDentist, selectedBranch]);

  useEffect(() => { if (tab === 0) loadSchedules(); else loadBlocks(); }, [tab, loadSchedules, loadBlocks]);

  const handleUpsert = async (dayOfWeek, field, value) => {
    const existing = schedules.find(s => s.dayOfWeek === dayOfWeek);
    const payload = {
      dentistId: Number(selectedDentist),
      branchId: selectedBranch ? Number(selectedBranch) : null,
      dayOfWeek,
      startTime: existing?.startTime || '08:00',
      endTime: existing?.endTime || '17:00',
      isAvailable: existing?.isAvailable ?? true,
      slotDurationMinutes: existing?.slotDurationMinutes || 30,
      [field]: value,
    };
    try { await scheduleService.upsertSchedule(payload); setSuccess('Schedule saved.'); loadSchedules(); }
    catch { setError('Failed to save schedule.'); }
  };

  const handleDeleteSchedule = async (id) => {
    try { await scheduleService.deleteSchedule(id); setSuccess('Schedule entry removed.'); loadSchedules(); }
    catch { setError('Delete failed.'); }
  };

  const handleDeleteBlock = async (id) => {
    try { await scheduleService.deleteBlock(id); setSuccess('Block removed.'); loadBlocks(); }
    catch { setError('Delete failed.'); }
  };

  const handleCreateBlock = async () => {
    if (!blockForm.dentistId || !blockForm.blockDate || !blockForm.reason) {
      setError('Dentist, date, and reason are required.'); return;
    }
    setSaving(true);
    try {
      await scheduleService.createBlock({
        dentistId: Number(blockForm.dentistId),
        branchId: blockForm.branchId ? Number(blockForm.branchId) : null,
        blockDate: blockForm.blockDate,
        isAllDay: blockForm.isAllDay,
        reason: blockForm.reason,
        startTime: blockForm.isAllDay ? null : blockForm.startTime || null,
        endTime: blockForm.isAllDay ? null : blockForm.endTime || null,
      });
      setBlockDialog(false);
      setSuccess('Block created.');
      loadBlocks();
    } catch { setError('Failed to create block.'); }
    finally { setSaving(false); }
  };

  const scheduledByDay = Object.fromEntries(schedules.map(s => [s.dayOfWeek, s]));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Dentist Scheduling</Typography>
          <Typography variant="body2" color="text.secondary">Manage weekly availability and time-off blocks</Typography>
        </Box>
        <Tooltip title="Refresh"><IconButton onClick={() => tab === 0 ? loadSchedules() : loadBlocks()}><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filters */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Dentist</InputLabel>
          <Select value={selectedDentist} onChange={e => setSelectedDentist(e.target.value)} label="Dentist">
            <MenuItem value="">— Select dentist —</MenuItem>
            {dentists.map(d => <MenuItem key={d.id} value={d.id}>{d.fullName || `${d.firstName} ${d.lastName}`}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Branch</InputLabel>
          <Select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} label="Branch">
            <MenuItem value="">All branches</MenuItem>
            {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Weekly Schedule" />
        <Tab label="Time-Off / Blocks" />
      </Tabs>

      {/* Weekly Schedule Tab */}
      {tab === 0 && (
        <Paper variant="outlined">
          {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    <TableCell>Available</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Slot (min)</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DAYS.map(day => {
                    const s = scheduledByDay[DAY_INDEX[day]];
                    return (
                      <TableRow key={day} sx={s && !s.isAvailable ? { opacity: 0.5 } : undefined}>
                        <TableCell><Typography variant="body2" fontWeight={500}>{day}</Typography></TableCell>
                        <TableCell>
                          <Switch size="small" checked={s?.isAvailable ?? false}
                            disabled={!selectedDentist}
                            onChange={e => handleUpsert(DAY_INDEX[day], 'isAvailable', e.target.checked)} />
                        </TableCell>
                        <TableCell>
                          <TextField type="time" size="small" disabled={!selectedDentist || !s?.isAvailable}
                            value={s?.startTime || '08:00'}
                            onChange={e => handleUpsert(DAY_INDEX[day], 'startTime', e.target.value)}
                            sx={{ width: 130 }} InputLabelProps={{ shrink: true }} />
                        </TableCell>
                        <TableCell>
                          <TextField type="time" size="small" disabled={!selectedDentist || !s?.isAvailable}
                            value={s?.endTime || '17:00'}
                            onChange={e => handleUpsert(DAY_INDEX[day], 'endTime', e.target.value)}
                            sx={{ width: 130 }} InputLabelProps={{ shrink: true }} />
                        </TableCell>
                        <TableCell>
                          <TextField type="number" size="small" disabled={!selectedDentist || !s?.isAvailable}
                            value={s?.slotDurationMinutes || 30}
                            onChange={e => handleUpsert(DAY_INDEX[day], 'slotDurationMinutes', Number(e.target.value))}
                            sx={{ width: 80 }} inputProps={{ min: 5, step: 5 }} />
                        </TableCell>
                        <TableCell align="right">
                          {s && (
                            <Tooltip title="Remove entry">
                              <IconButton size="small" color="error" onClick={() => handleDeleteSchedule(s.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Blocks Tab */}
      {tab === 1 && (
        <Box>
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <Button variant="contained" startIcon={<Block />} onClick={() => { setBlockForm({ dentistId: selectedDentist, branchId: selectedBranch, blockDate: '', isAllDay: true, reason: '', startTime: '09:00', endTime: '10:00' }); setBlockDialog(true); }}>
              Add Block / Time-Off
            </Button>
          </Box>
          <Paper variant="outlined">
            {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Dentist</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {blocks.length === 0 ? (
                      <TableRow><TableCell colSpan={6} align="center">No blocks found.</TableCell></TableRow>
                    ) : blocks.map(b => (
                      <TableRow key={b.id} hover>
                        <TableCell>{b.dentistName}</TableCell>
                        <TableCell>{new Date(b.blockDate).toLocaleDateString()}</TableCell>
                        <TableCell><Chip label={b.isAllDay ? 'All Day' : 'Partial'} size="small" /></TableCell>
                        <TableCell>{b.isAllDay ? '—' : `${b.startTime || ''} – ${b.endTime || ''}`}</TableCell>
                        <TableCell>{b.reason}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove">
                            <IconButton size="small" color="error" onClick={() => handleDeleteBlock(b.id)}>
                              <Delete fontSize="small" />
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
        </Box>
      )}

      {/* Block Dialog */}
      <Dialog open={blockDialog} onClose={() => setBlockDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Block / Time-Off</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <FormControl size="small" required fullWidth>
              <InputLabel>Dentist *</InputLabel>
              <Select value={blockForm.dentistId} onChange={e => setBlockForm({ ...blockForm, dentistId: e.target.value })} label="Dentist *">
                {dentists.map(d => <MenuItem key={d.id} value={d.id}>{d.fullName || `${d.firstName} ${d.lastName}`}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Branch</InputLabel>
              <Select value={blockForm.branchId || ''} onChange={e => setBlockForm({ ...blockForm, branchId: e.target.value })} label="Branch">
                <MenuItem value="">All / Any</MenuItem>
                {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Date *" type="date" value={blockForm.blockDate}
              onChange={e => setBlockForm({ ...blockForm, blockDate: e.target.value })}
              size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Reason *" value={blockForm.reason} onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })}
              size="small" fullWidth />
            <FormControlLabel control={<Switch checked={blockForm.isAllDay} onChange={e => setBlockForm({ ...blockForm, isAllDay: e.target.checked })} />}
              label="All Day" />
            {!blockForm.isAllDay && (
              <Box display="flex" gap={2}>
                <TextField label="Start Time" type="time" value={blockForm.startTime}
                  onChange={e => setBlockForm({ ...blockForm, startTime: e.target.value })}
                  size="small" InputLabelProps={{ shrink: true }} />
                <TextField label="End Time" type="time" value={blockForm.endTime}
                  onChange={e => setBlockForm({ ...blockForm, endTime: e.target.value })}
                  size="small" InputLabelProps={{ shrink: true }} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBlock} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Block />}>
            {saving ? 'Saving…' : 'Add Block'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
