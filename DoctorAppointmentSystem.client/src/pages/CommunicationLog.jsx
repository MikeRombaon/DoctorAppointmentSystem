import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Chip, Button, Alert, CircularProgress, TextField, Stack,
  Select, MenuItem, InputLabel, FormControl, Card, CardContent, Grid,
} from '@mui/material';
import { ForumOutlined, Refresh, Search } from '@mui/icons-material';
import { communicationLogService } from '../services/communicationLogService';

const statusColor = { Sent: 'success', Failed: 'error', Pending: 'warning' };

export default function CommunicationLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({ type: '', from: '', to: '' });
  const [page] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        pageSize: 50,
        ...(filters.type && { type: filters.type }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      };
      const data = await communicationLogService.getAll(params);
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load communication log.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    communicationLogService.getTypes().then(setTypes).catch(() => {});
    load();
  }, [load]);

  const sentCount = logs.filter(l => l.status === 'Sent').length;
  const failedCount = logs.filter(l => l.status === 'Failed').length;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ForumOutlined color="primary" />
          <Typography variant="h5" fontWeight="bold">Communication Log</Typography>
        </Stack>
        <Button startIcon={<Refresh />} onClick={load} variant="outlined">Refresh</Button>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={2}>
        {[
          { label: 'Total Records', value: total, color: 'primary' },
          { label: 'Sent', value: sentCount, color: 'success' },
          { label: 'Failed', value: failedCount, color: 'error' },
        ].map(c => (
          <Grid item xs={12} sm={4} key={c.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h4" color={`${c.color}.main`}>{c.value}</Typography>
                <Typography variant="body2" color="text.secondary">{c.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.type}
              label="Type"
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            >
              <MenuItem value="">All Types</MenuItem>
              {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="From Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          />
          <TextField
            label="To Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          />
          <Button variant="contained" startIcon={<Search />} onClick={load}>Search</Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Related</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No communication records found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.sentDate).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={log.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{log.channel}</TableCell>
                    <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.recipient}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.subject}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        color={statusColor[log.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {log.relatedEntityType && log.relatedEntityId
                        ? `${log.relatedEntityType} #${log.relatedEntityId}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
