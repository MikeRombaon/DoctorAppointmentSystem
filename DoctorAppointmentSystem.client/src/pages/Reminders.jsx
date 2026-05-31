import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Chip, Button, Alert, CircularProgress, TextField, Stack,
  Card, CardContent, Grid, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider,
} from '@mui/material';
import { NotificationsActive, Refresh, Send } from '@mui/icons-material';
import { reminderService } from '../services/reminderService';

const statusColor = { Completed: 'success', PartialFailure: 'warning', Failed: 'error' };

export default function Reminders() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerForm, setTriggerForm] = useState({
    targetDate: new Date().toISOString().split('T')[0],
    daysAhead: 1,
    notes: '',
  });
  const [triggerResult, setTriggerResult] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await reminderService.getSummary();
      setSummary(data);
    } catch {}
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reminderService.getLog({ pageSize: 30 });
      setLogs(data.items || []);
    } catch {
      setError('Failed to load reminder log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadLogs();
  }, [loadSummary, loadLogs]);

  const handleTrigger = async () => {
    setTriggering(true);
    setError('');
    try {
      const result = await reminderService.trigger({
        targetDate: triggerForm.targetDate,
        daysAhead: Number(triggerForm.daysAhead),
        notes: triggerForm.notes || undefined,
      });
      setTriggerResult(result);
      setSuccess(`Reminders sent: ${result.remindersSent} of ${result.appointmentsFound} appointments.`);
      loadSummary();
      loadLogs();
    } catch {
      setError('Failed to trigger reminders.');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <NotificationsActive color="primary" />
          <Typography variant="h5" fontWeight="bold">Appointment Reminders</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Refresh />} onClick={() => { loadSummary(); loadLogs(); }} variant="outlined">
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Send />} onClick={() => setTriggerOpen(true)}>
            Send Reminders
          </Button>
        </Stack>
      </Stack>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} mb={2}>
          {[
            { label: 'Total Runs', value: summary.totalRuns, color: 'primary' },
            { label: 'Total Sent', value: summary.totalSent, color: 'success' },
            { label: 'Total Failed', value: summary.totalFailed, color: 'error' },
            {
              label: 'Last Run',
              value: summary.lastRun ? new Date(summary.lastRun).toLocaleDateString() : 'Never',
              color: 'info',
            },
          ].map(c => (
            <Grid item xs={6} sm={3} key={c.label}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <Typography variant="h5" color={`${c.color}.main`}>{c.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Reminder Log Table */}
      <Typography variant="h6" mb={1}>Reminder History</Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>Reminder Date</TableCell>
                <TableCell>Days Ahead</TableCell>
                <TableCell>Appointments Found</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Failed</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Triggered</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No reminder history
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.reminderDate).toLocaleDateString()}</TableCell>
                    <TableCell>{log.daysAhead}</TableCell>
                    <TableCell>{log.appointmentsFound}</TableCell>
                    <TableCell>
                      <Chip label={log.remindersSent} color="success" size="small" />
                    </TableCell>
                    <TableCell>
                      {log.remindersFailed > 0
                        ? <Chip label={log.remindersFailed} color="error" size="small" />
                        : <Chip label="0" size="small" />}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        color={statusColor[log.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(log.createdDate).toLocaleString()}</TableCell>
                    <TableCell>{log.notes || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Trigger Dialog */}
      <Dialog open={triggerOpen} onClose={() => { setTriggerOpen(false); setTriggerResult(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Send Appointment Reminders</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Target Appointment Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={triggerForm.targetDate}
              onChange={e => setTriggerForm(f => ({ ...f, targetDate: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Days Ahead (informational)"
              type="number"
              size="small"
              inputProps={{ min: 1, max: 30 }}
              value={triggerForm.daysAhead}
              onChange={e => setTriggerForm(f => ({ ...f, daysAhead: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Notes (optional)"
              size="small"
              value={triggerForm.notes}
              onChange={e => setTriggerForm(f => ({ ...f, notes: e.target.value }))}
              fullWidth
            />
            {triggerResult && (
              <>
                <Divider />
                <Alert severity={triggerResult.remindersFailed > 0 ? 'warning' : 'success'}>
                  <strong>Result:</strong> {triggerResult.remindersSent} sent,{' '}
                  {triggerResult.remindersFailed} failed out of{' '}
                  {triggerResult.appointmentsFound} appointments on{' '}
                  {new Date(triggerResult.targetDate).toLocaleDateString()}.
                </Alert>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTriggerOpen(false); setTriggerResult(null); }}>
            {triggerResult ? 'Close' : 'Cancel'}
          </Button>
          {!triggerResult && (
            <Button
              variant="contained"
              onClick={handleTrigger}
              disabled={triggering}
              startIcon={triggering ? <CircularProgress size={16} /> : <Send />}
            >
              {triggering ? 'Sending…' : 'Send Reminders'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
