import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Chip, IconButton, Button, Tooltip, Alert, CircularProgress,
  FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Stack,
} from '@mui/material';
import {
  Notifications as NotificationsIcon, DoneAll, Delete, Send,
  MarkEmailRead, Refresh,
} from '@mui/icons-material';
import { notificationCenterService } from '../services/notificationCenterService';
import { userService } from '../services/userService';

const typeColor = { Info: 'info', Warning: 'warning', Success: 'success', Error: 'error' };

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendForm, setSendForm] = useState({ title: '', message: '', type: 'Info', targetRole: '' });
  const isAdmin = userService.hasRole('Admin');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationCenterService.getAll({ unreadOnly: unreadOnly || undefined });
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id) => {
    await notificationCenterService.markRead(id);
    load();
  };

  const handleMarkAllRead = async () => {
    await notificationCenterService.markAllRead();
    load();
  };

  const handleDelete = async (id) => {
    await notificationCenterService.delete(id);
    load();
  };

  const handleSend = async () => {
    if (!sendForm.title || !sendForm.message) return;
    setSending(true);
    try {
      await notificationCenterService.send({
        title: sendForm.title,
        message: sendForm.message,
        type: sendForm.type,
        targetRole: sendForm.targetRole || undefined,
      });
      setSendOpen(false);
      setSendForm({ title: '', message: '', type: 'Info', targetRole: '' });
      load();
    } catch {
      setError('Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <NotificationsIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">Notification Center</Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} unread`} color="warning" size="small" />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <FormControlLabel
            control={<Switch checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />}
            label="Unread only"
          />
          <Tooltip title="Mark all read">
            <IconButton onClick={handleMarkAllRead} color="primary">
              <DoneAll />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={load} color="default">
              <Refresh />
            </IconButton>
          </Tooltip>
          {isAdmin && (
            <Button variant="contained" startIcon={<Send />} onClick={() => setSendOpen(true)}>
              Send Notification
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>Type</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No notifications
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map(n => (
                  <TableRow
                    key={n.id}
                    sx={{ bgcolor: n.isRead ? 'inherit' : 'action.hover', fontWeight: n.isRead ? 'normal' : 'bold' }}
                  >
                    <TableCell>
                      <Chip
                        label={n.type}
                        color={typeColor[n.type] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: n.isRead ? 'normal' : 'bold' }}>{n.title}</TableCell>
                    <TableCell>{n.message}</TableCell>
                    <TableCell>{new Date(n.createdDate).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={n.isRead ? 'Read' : 'Unread'}
                        color={n.isRead ? 'default' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {!n.isRead && (
                        <Tooltip title="Mark as read">
                          <IconButton size="small" onClick={() => handleMarkRead(n.id)}>
                            <MarkEmailRead fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(n.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Send Notification Dialog */}
      <Dialog open={sendOpen} onClose={() => setSendOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Notification</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Target Role (leave blank for all)</InputLabel>
              <Select
                value={sendForm.targetRole}
                label="Target Role (leave blank for all)"
                onChange={e => setSendForm(f => ({ ...f, targetRole: e.target.value }))}
              >
                <MenuItem value="">All Users</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="ClinicalStaff">Clinical Staff</MenuItem>
                <MenuItem value="SupportStaff">Support Staff</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={sendForm.type}
                label="Type"
                onChange={e => setSendForm(f => ({ ...f, type: e.target.value }))}
              >
                {['Info', 'Warning', 'Success', 'Error'].map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Title"
              value={sendForm.title}
              onChange={e => setSendForm(f => ({ ...f, title: e.target.value }))}
              required fullWidth size="small"
            />
            <TextField
              label="Message"
              value={sendForm.message}
              onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))}
              required fullWidth multiline rows={3} size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={sending || !sendForm.title || !sendForm.message}
          >
            {sending ? <CircularProgress size={20} /> : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
