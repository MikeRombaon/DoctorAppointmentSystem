import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, IconButton, Button, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Today, Add, EventAvailable,
} from '@mui/icons-material';
import { appointmentService } from '../services/appointmentService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLOR = {
  Scheduled: '#667eea', Confirmed: '#43e97b', CheckedIn: '#4facfe',
  InProgress: '#f093fb', Completed: '#38ef7d', Cancelled: '#f5576c',
  NoShow: '#e53e3e', Rescheduled: '#ed8936', WalkIn: '#fbb040',
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const today = new Date();

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // detail dialog

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load the entire month — page size 200 to cover a busy month
      const result = await appointmentService.getAll(1, 200, null, null, null);
      setAppointments(result.items || result.data || []);
    } catch {
      setError('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Month view helpers ────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const getApptForDay = (day) => {
    const d = new Date(year, month, day);
    return appointments.filter(a => {
      const ad = new Date(a.appointmentDate);
      return sameDay(ad, d);
    });
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  // ── Week view helpers ─────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const getApptForDate = (date) =>
    appointments.filter(a => sameDay(new Date(a.appointmentDate), date));

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

  const ApptChip = ({ appt }) => (
    <Tooltip title={`${appt.purpose} — ${appt.patientName || 'Patient'} (${appt.status})`}>
      <Box
        onClick={() => setSelected(appt)}
        sx={{
          px: 0.5, py: 0.2, mb: 0.3, borderRadius: 1, cursor: 'pointer',
          bgcolor: STATUS_COLOR[appt.status] ?? '#999',
          color: '#fff', fontSize: '0.7rem', fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          '&:hover': { opacity: 0.85 },
        }}
      >
        {isMobile ? (appt.status?.[0] ?? '?') : `${String(appt.startTime ?? '').substring(0, 5)} ${appt.patientName?.split(' ')[0] ?? ''}`}
      </Box>
    </Tooltip>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={viewMode === 'month' ? prevMonth : prevWeek} size="small">
            <ChevronLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700} minWidth={200} textAlign="center">
            {viewMode === 'month'
              ? `${MONTHS[month]} ${year}`
              : `${weekDays[0].toLocaleDateString()} – ${weekDays[6].toLocaleDateString()}`}
          </Typography>
          <IconButton onClick={viewMode === 'month' ? nextMonth : nextWeek} size="small">
            <ChevronRight />
          </IconButton>
          <Button size="small" variant="outlined" startIcon={<Today />} onClick={goToday} sx={{ ml: 1 }}>
            Today
          </Button>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <FormControl size="small" sx={{ width: 110 }}>
            <Select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="week">Week</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={load} size="small"><Today /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {loading && <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>}

      {/* Status legend */}
      <Box display="flex" flexWrap="wrap" gap={0.5} mb={1.5}>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <Chip key={s} label={s} size="small" sx={{ bgcolor: c, color: '#fff', fontSize: '0.68rem' }} />
        ))}
      </Box>

      {/* ── MONTH VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <Paper variant="outlined">
          {/* Day headers */}
          <Grid container sx={{ borderBottom: 1, borderColor: 'divider' }}>
            {DAYS.map(d => (
              <Grid key={d} item xs={12 / 7} sx={{ p: 0.5, textAlign: 'center' }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">{d}</Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar cells */}
          {Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) }, (_, week) => (
            <Grid container key={week} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              {Array.from({ length: 7 }, (_, col) => {
                const dayNum = week * 7 + col - firstDay + 1;
                const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                const isToday = isValid && sameDay(new Date(year, month, dayNum), today);
                const dayAppts = isValid ? getApptForDay(dayNum) : [];

                return (
                  <Grid key={col} item xs={12 / 7}
                    sx={{
                      minHeight: isMobile ? 60 : 90, p: 0.5,
                      borderRight: col < 6 ? 1 : 0, borderColor: 'divider',
                      bgcolor: isToday ? 'primary.50' : 'background.paper',
                    }}>
                    {isValid && (
                      <>
                        <Typography variant="caption" fontWeight={isToday ? 700 : 400}
                          sx={{
                            display: 'inline-flex', width: 22, height: 22, alignItems: 'center',
                            justifyContent: 'center', borderRadius: '50%',
                            bgcolor: isToday ? 'primary.main' : 'transparent',
                            color: isToday ? '#fff' : 'text.primary', mb: 0.3,
                          }}>
                          {dayNum}
                        </Typography>
                        {dayAppts.slice(0, isMobile ? 1 : 3).map(a => <ApptChip key={a.id} appt={a} />)}
                        {dayAppts.length > (isMobile ? 1 : 3) && (
                          <Typography variant="caption" color="text.secondary">
                            +{dayAppts.length - (isMobile ? 1 : 3)} more
                          </Typography>
                        )}
                      </>
                    )}
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Paper>
      )}

      {/* ── WEEK VIEW ──────────────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <Paper variant="outlined">
          <Grid container sx={{ borderBottom: 1, borderColor: 'divider' }}>
            {weekDays.map((d, i) => {
              const isTod = sameDay(d, today);
              return (
                <Grid key={i} item xs={12 / 7}
                  sx={{ p: 0.5, textAlign: 'center', borderRight: i < 6 ? 1 : 0, borderColor: 'divider' }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">{DAYS[d.getDay()]}</Typography>
                  <Typography variant="body2" fontWeight={isTod ? 700 : 400}
                    sx={{
                      width: 28, height: 28, borderRadius: '50%', mx: 'auto',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: isTod ? 'primary.main' : 'transparent',
                      color: isTod ? '#fff' : 'text.primary',
                    }}>
                    {d.getDate()}
                  </Typography>
                </Grid>
              );
            })}
          </Grid>
          <Grid container>
            {weekDays.map((d, i) => {
              const dayAppts = getApptForDate(d);
              return (
                <Grid key={i} item xs={12 / 7}
                  sx={{
                    minHeight: 300, p: 0.5, verticalAlign: 'top',
                    borderRight: i < 6 ? 1 : 0, borderColor: 'divider',
                  }}>
                  {dayAppts.map(a => <ApptChip key={a.id} appt={a} />)}
                  {dayAppts.length === 0 && (
                    <Typography variant="caption" color="text.disabled" display="block" mt={1} textAlign="center">—</Typography>
                  )}
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      {/* Appointment Detail Dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Appointment Details
            <Chip label={selected?.status} size="small"
              sx={{ bgcolor: STATUS_COLOR[selected?.status] ?? '#999', color: '#fff' }} />
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selected && (
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography><strong>Patient:</strong> {selected.patientName ?? selected.patient?.fullName ?? '—'}</Typography>
              <Typography><strong>Date:</strong> {new Date(selected.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Typography>
              <Typography><strong>Time:</strong> {String(selected.startTime ?? '').substring(0, 5)} – {String(selected.endTime ?? '').substring(0, 5)}</Typography>
              <Typography><strong>Purpose:</strong> {selected.purpose}</Typography>
              {selected.notes && <Typography><strong>Notes:</strong> {selected.notes}</Typography>}
              {selected.isWalkIn && <Chip label="Walk-In" size="small" color="warning" sx={{ width: 'fit-content' }} />}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
