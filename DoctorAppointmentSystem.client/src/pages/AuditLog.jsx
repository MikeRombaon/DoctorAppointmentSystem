import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Alert, CircularProgress, Grid,
} from '@mui/material';
import { Refresh, Visibility, CheckCircle, Cancel } from '@mui/icons-material';
import { auditService } from '../services/auditService';

const ACTIONS = ['Create', 'Read', 'Update', 'Delete', 'Login', 'Upload', 'Download', 'SendEmail', 'Export'];
const ENTITY_TYPES = ['Patient', 'Appointment', 'Treatment', 'Invoice', 'Payment', 'User',
  'PatientDocument', 'NotificationTemplate', 'ClinicalNote', 'Prescription'];

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSuccess, setFilterSuccess] = useState('');

  // Detail dialog
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await auditService.getLogs({
        page: page + 1,
        pageSize: rowsPerPage,
        action: filterAction || undefined,
        entityType: filterEntity || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        successOnly: filterSuccess === '' ? undefined : filterSuccess === 'true',
      });
      setLogs(result.items);
      setTotal(result.total);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterAction, filterEntity, filterFrom, filterTo, filterSuccess]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Audit Log</Typography>
          <Typography variant="body2" color="text.secondary">
            HIPAA &amp; PH DPA compliance — all system activity recorded
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={load}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select value={filterAction} label="Action" onChange={handleFilterChange(setFilterAction)}>
                <MenuItem value="">All</MenuItem>
                {ACTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Entity Type</InputLabel>
              <Select value={filterEntity} label="Entity Type" onChange={handleFilterChange(setFilterEntity)}>
                <MenuItem value="">All</MenuItem>
                {ENTITY_TYPES.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField fullWidth size="small" label="From Date" type="date"
              value={filterFrom} onChange={handleFilterChange(setFilterFrom)}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField fullWidth size="small" label="To Date" type="date"
              value={filterTo} onChange={handleFilterChange(setFilterTo)}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Result</InputLabel>
              <Select value={filterSuccess} label="Result" onChange={handleFilterChange(setFilterSuccess)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Success</MenuItem>
                <MenuItem value="false">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

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
                    <TableCell>Timestamp</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Entity ID</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell align="center">Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">No audit logs found.</TableCell>
                    </TableRow>
                  ) : logs.map((log) => (
                    <TableRow key={log.id} hover
                      sx={!log.success ? { backgroundColor: 'error.50' } : undefined}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.userName || '—'}</TableCell>
                      <TableCell>
                        {log.userRole && <Chip label={log.userRole} size="small" variant="outlined" />}
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small"
                          color={log.action === 'Delete' ? 'error' : log.action === 'Create' ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell>{log.entityId || '—'}</TableCell>
                      <TableCell>
                        {log.success
                          ? <CheckCircle fontSize="small" color="success" />
                          : <Cancel fontSize="small" color="error" />}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.ipAddress || '—'}
                      </TableCell>
                      <TableCell align="center">
                        {(log.oldValues || log.newValues || log.failureReason) && (
                          <Tooltip title="View details">
                            <IconButton size="small" onClick={() => setDetail(log)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </>
        )}
      </Paper>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Audit Detail — {detail?.action} on {detail?.entityType} #{detail?.entityId}
        </DialogTitle>
        <DialogContent dividers>
          {detail?.failureReason && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>Failure reason:</strong> {detail.failureReason}
            </Alert>
          )}
          {detail?.oldValues && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>Before</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'error.50' }}>
                <pre style={{ margin: 0, fontSize: '0.8rem', overflowX: 'auto' }}>
                  {(() => { try { return JSON.stringify(JSON.parse(detail.oldValues), null, 2); } catch { return detail.oldValues; } })()}
                </pre>
              </Paper>
            </Box>
          )}
          {detail?.newValues && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>After</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'success.50' }}>
                <pre style={{ margin: 0, fontSize: '0.8rem', overflowX: 'auto' }}>
                  {(() => { try { return JSON.stringify(JSON.parse(detail.newValues), null, 2); } catch { return detail.newValues; } })()}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
