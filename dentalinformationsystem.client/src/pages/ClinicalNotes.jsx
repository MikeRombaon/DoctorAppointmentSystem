import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Autocomplete, TextField,
  Alert, CircularProgress, Chip, Stack, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';
import CreateIcon from '@mui/icons-material/Create';
import { clinicalNoteService } from '../services/clinicalNoteService';
import { patientService } from '../services/patientService';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS = { Draft: 'warning', Signed: 'success', Amended: 'default' };

const EMPTY_NOTE = { patientId: 0, appointmentId: null, subjective: '', objective: '', assessment: '', plan: '' };

export default function ClinicalNotes() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState(null); // null = new note
  const [amendNote, setAmendNote] = useState(null); // note being amended
  const [form, setForm] = useState({ ...EMPTY_NOTE });
  const [saving, setSaving] = useState(false);

  // View dialog
  const [viewNote, setViewNote] = useState(null);

  useEffect(() => {
    patientService.getAll(1, 200).then(d => setPatients(d.items ?? d)).catch(() => {});
  }, []);

  const loadNotes = async (patientId) => {
    setLoading(true);
    try {
      const data = await clinicalNoteService.getByPatient(patientId);
      setNotes(data);
    } catch {
      setError('Failed to load clinical notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) loadNotes(selectedPatient.id);
    else setNotes([]);
  }, [selectedPatient]);

  const openNew = () => {
    setEditNote(null);
    setAmendNote(null);
    setForm({ ...EMPTY_NOTE, patientId: selectedPatient?.id ?? 0 });
    setDialogOpen(true);
  };

  const openEdit = (note) => {
    setEditNote(note);
    setAmendNote(null);
    setForm({ patientId: note.patientId, appointmentId: note.appointmentId, subjective: note.subjective ?? '', objective: note.objective ?? '', assessment: note.assessment ?? '', plan: note.plan ?? '' });
    setDialogOpen(true);
  };

  const openAmend = (note) => {
    setAmendNote(note);
    setEditNote(null);
    setForm({ patientId: note.patientId, appointmentId: note.appointmentId, subjective: note.subjective ?? '', objective: note.objective ?? '', assessment: note.assessment ?? '', plan: note.plan ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (amendNote) {
        await clinicalNoteService.amend(amendNote.id, form);
      } else if (editNote) {
        await clinicalNoteService.update(editNote.id, form);
      } else {
        await clinicalNoteService.create(form);
      }
      await loadNotes(selectedPatient.id);
      setDialogOpen(false);
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async (noteId) => {
    try {
      await clinicalNoteService.sign(noteId);
      await loadNotes(selectedPatient.id);
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to sign note.');
    }
  };

  const SOAPField = (field, label, rows = 3) => (
    <TextField
      label={label} multiline rows={rows} fullWidth size="small"
      value={form[field]}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      sx={{ mb: 2 }}
    />
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>Clinical Notes (SOAP)</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={patients}
              getOptionLabel={p => p.fullName ?? `${p.firstName} ${p.lastName}`}
              value={selectedPatient}
              onChange={(_, v) => setSelectedPatient(v)}
              renderInput={params => <TextField {...params} label="Select Patient" size="small" />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained" startIcon={<AddIcon />}
              disabled={!selectedPatient} onClick={openNew}
            >
              New Note
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={2}>
          {notes.length === 0 && selectedPatient && (
            <Alert severity="info">No clinical notes found. Click &quot;New Note&quot; to create one.</Alert>
          )}
          {notes.map(note => (
            <Paper key={note.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={note.statusName}
                      color={STATUS_COLORS[note.statusName] ?? 'default'}
                      size="small"
                    />
                    <Typography variant="subtitle2">
                      {new Date(note.createdDate).toLocaleDateString()} — {note.authoredBy}
                    </Typography>
                    {note.isLocked && <LockIcon fontSize="small" color="disabled" />}
                  </Stack>
                  {note.assessment && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      <strong>Assessment:</strong> {note.assessment.substring(0, 120)}{note.assessment.length > 120 ? '…' : ''}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="View full note">
                    <IconButton size="small" onClick={() => setViewNote(note)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!note.isLocked && (
                    <>
                      <Tooltip title="Edit draft">
                        <IconButton size="small" onClick={() => openEdit(note)}>
                          <CreateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button size="small" variant="outlined" color="success" onClick={() => handleSign(note.id)}>
                        Sign
                      </Button>
                    </>
                  )}
                  {note.isLocked && note.statusName === 'Signed' && (
                    <Button size="small" variant="outlined" onClick={() => openAmend(note)}>
                      Amend
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create / Edit / Amend dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {amendNote ? `Amendment — Note #${amendNote.id}` : editNote ? `Edit Note #${editNote.id}` : 'New Clinical Note'}
        </DialogTitle>
        <DialogContent>
          {amendNote && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You are creating an amendment to the signed note. The original will be archived.
            </Alert>
          )}
          <Box sx={{ mt: 1 }}>
            {SOAPField('subjective', 'Subjective — Chief Complaint / History of Present Illness')}
            {SOAPField('objective', 'Objective — Clinical Findings, Vitals, Exam Results')}
            {SOAPField('assessment', 'Assessment — Diagnosis / Clinical Impression')}
            {SOAPField('plan', 'Plan — Treatment Plan, Medications, Referrals, Follow-up')}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : amendNote ? 'Save Amendment' : 'Save Note'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewNote} onClose={() => setViewNote(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Clinical Note — {viewNote && new Date(viewNote.createdDate).toLocaleDateString()}
          {' '}<Chip label={viewNote?.statusName} size="small" color={STATUS_COLORS[viewNote?.statusName] ?? 'default'} />
        </DialogTitle>
        <DialogContent>
          {viewNote && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Author: {viewNote.authoredBy} · {viewNote.signedDate ? `Signed: ${new Date(viewNote.signedDate).toLocaleString()}` : 'Draft'}
              </Typography>
              <Divider sx={{ my: 1 }} />
              {[['Subjective', viewNote.subjective], ['Objective', viewNote.objective], ['Assessment', viewNote.assessment], ['Plan', viewNote.plan]].map(([label, val]) => val ? (
                <Box key={label} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary">{label}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{val}</Typography>
                </Box>
              ) : null)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewNote(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
