import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Autocomplete, Alert,
  CircularProgress, Stack, Chip, Table, TableHead, TableRow,
  TableCell, TableBody, Tooltip, IconButton
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { perioExamService } from '../services/perioExamService';
import { patientService } from '../services/patientService';

// 6 sites per tooth per arch side
const SITES = ['MB', 'B', 'DB', 'ML', 'L', 'DL'];

// Upper-right → upper-left (FDI), then lower-left → lower-right
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function buildEmptySites(teeth) {
  const data = {};
  teeth.forEach(t => {
    data[t] = {};
    SITES.forEach(s => {
      data[t][s] = { probingDepth: '', recession: '', bleeding: false, suppuration: false, furcation: false, mobility: '' };
    });
  });
  return data;
}

function DepthCell({ value, onChange, highlight }) {
  return (
    <input
      type="number"
      min={0} max={12}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: 30, textAlign: 'center', border: '1px solid #ccc', borderRadius: 3,
        padding: '2px 0', fontSize: '0.75rem',
        background: highlight ? '#ffebee' : 'white'
      }}
    />
  );
}

function BleedingDot({ value, onChange }) {
  return (
    <FiberManualRecordIcon
      onClick={() => onChange(!value)}
      sx={{ fontSize: 14, cursor: 'pointer', color: value ? 'error.main' : '#e0e0e0' }}
    />
  );
}

export default function PerioChart() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New exam form state
  const [newExamOpen, setNewExamOpen] = useState(false);
  const [upperSites, setUpperSites] = useState(buildEmptySites(UPPER_TEETH));
  const [lowerSites, setLowerSites] = useState(buildEmptySites(LOWER_TEETH));
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // View exam dialog
  const [viewExam, setViewExam] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    patientService.getAll(1, 200).then(d => setPatients(d.items ?? d)).catch(() => {});
  }, []);

  const loadExams = useCallback(async (patientId) => {
    setLoading(true);
    setError('');
    try {
      const data = await perioExamService.getByPatient(patientId);
      setExams(data);
    } catch {
      setError('Failed to load perio exams.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatient) loadExams(selectedPatient.id);
    else setExams([]);
  }, [selectedPatient, loadExams]);

  const setSite = (arch, tooth, site, field, value) => {
    const setter = arch === 'upper' ? setUpperSites : setLowerSites;
    setter(prev => ({
      ...prev,
      [tooth]: { ...prev[tooth], [site]: { ...prev[tooth][site], [field]: value } }
    }));
  };

  const handleSaveExam = async () => {
    setSaving(true);
    try {
      const allSites = [];
      [[upperSites, UPPER_TEETH], [lowerSites, LOWER_TEETH]].forEach(([siteData, teeth]) => {
        teeth.forEach(tooth => {
          SITES.forEach(site => {
            const s = siteData[tooth][site];
            allSites.push({
              toothFdi: tooth,
              site,
              probingDepth: s.probingDepth !== '' ? parseInt(s.probingDepth) : null,
              recession: s.recession !== '' ? parseInt(s.recession) : null,
              bleeding: s.bleeding,
              suppuration: s.suppuration,
              furcation: s.furcation,
              mobility: s.mobility !== '' ? parseInt(s.mobility) : null
            });
          });
        });
      });

      await perioExamService.create({
        patientId: selectedPatient.id,
        clinicalNotes,
        sites: allSites
      });
      await loadExams(selectedPatient.id);
      setNewExamOpen(false);
      setUpperSites(buildEmptySites(UPPER_TEETH));
      setLowerSites(buildEmptySites(LOWER_TEETH));
      setClinicalNotes('');
    } catch {
      setError('Failed to save perio exam.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewExam = async (id) => {
    setViewLoading(true);
    try {
      const data = await perioExamService.getById(id);
      setViewExam(data);
    } catch {
      setError('Failed to load exam details.');
    } finally {
      setViewLoading(false);
    }
  };

  const renderGrid = (teeth, siteData, archLabel) => (
    <Box sx={{ mb: 3, overflowX: 'auto' }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>{archLabel}</Typography>
      <Table size="small" sx={{ minWidth: 700, '& td,th': { px: 0.5, py: 0.5, fontSize: '0.7rem' } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 30 }}>Site</TableCell>
            {teeth.map(t => (
              <TableCell key={t} align="center" sx={{ minWidth: 34 }}>{t}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Probing Depth row per site */}
          {SITES.map(site => (
            <TableRow key={`pd-${site}`}>
              <TableCell>{site}</TableCell>
              {teeth.map(tooth => {
                const pd = parseInt(siteData[tooth][site].probingDepth) || 0;
                return (
                  <TableCell key={tooth} align="center">
                    <DepthCell
                      value={siteData[tooth][site].probingDepth}
                      onChange={v => setSite(archLabel === 'Upper Arch (Buccal/Labial)' ? 'upper' : 'lower', tooth, site, 'probingDepth', v)}
                      highlight={pd >= 4}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {/* Bleeding row */}
          <TableRow>
            <TableCell>Bleed</TableCell>
            {teeth.map(tooth => (
              <TableCell key={tooth} align="center">
                <Stack direction="row" flexWrap="wrap" justifyContent="center">
                  {SITES.map(site => (
                    <BleedingDot
                      key={site}
                      value={siteData[tooth][site].bleeding}
                      onChange={v => setSite(archLabel === 'Upper Arch (Buccal/Labial)' ? 'upper' : 'lower', tooth, site, 'bleeding', v)}
                    />
                  ))}
                </Stack>
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>Periodontal Chart</Typography>

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
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!selectedPatient}
              onClick={() => setNewExamOpen(true)}
            >
              New Exam
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Exam history list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={1}>
          {exams.map(exam => (
            <Paper key={exam.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">
                  {new Date(exam.examDate).toLocaleDateString()} — {exam.examinedBy}
                </Typography>
                {exam.clinicalNotes && (
                  <Typography variant="caption" color="text.secondary">{exam.clinicalNotes}</Typography>
                )}
              </Box>
              <IconButton size="small" onClick={() => handleViewExam(exam.id)} disabled={viewLoading}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
          {exams.length === 0 && selectedPatient && (
            <Alert severity="info">No perio exams found. Click &quot;New Exam&quot; to create one.</Alert>
          )}
        </Stack>
      )}

      {/* New exam entry dialog */}
      <Dialog open={newExamOpen} onClose={() => setNewExamOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>New Periodontal Examination</DialogTitle>
        <DialogContent sx={{ overflowX: 'auto' }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter probing depths (mm) per site. Values ≥4 mm are highlighted in red. Click dots to mark bleeding.
          </Alert>
          {renderGrid(UPPER_TEETH, upperSites, 'Upper Arch (Buccal/Labial)')}
          {renderGrid(LOWER_TEETH, lowerSites, 'Lower Arch (Buccal/Labial)')}
          <TextField
            label="Clinical Notes"
            multiline rows={3} fullWidth size="small"
            value={clinicalNotes}
            onChange={e => setClinicalNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewExamOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveExam} disabled={saving || !selectedPatient}>
            {saving ? <CircularProgress size={18} /> : 'Save Exam'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View exam dialog */}
      <Dialog open={!!viewExam} onClose={() => setViewExam(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Perio Exam — {viewExam && new Date(viewExam.examDate).toLocaleDateString()}
        </DialogTitle>
        <DialogContent>
          {viewExam && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Examiner:</strong> {viewExam.examinedBy}
              </Typography>
              {viewExam.clinicalNotes && (
                <Typography variant="body2" gutterBottom>
                  <strong>Notes:</strong> {viewExam.clinicalNotes}
                </Typography>
              )}
              <Box sx={{ overflowX: 'auto', mt: 2 }}>
                <Table size="small" sx={{ '& td,th': { fontSize: '0.7rem', px: 0.5 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tooth</TableCell>
                      <TableCell>Site</TableCell>
                      <TableCell>PD</TableCell>
                      <TableCell>Rec</TableCell>
                      <TableCell>CAL</TableCell>
                      <TableCell>Bleed</TableCell>
                      <TableCell>Supp</TableCell>
                      <TableCell>Furc</TableCell>
                      <TableCell>Mob</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewExam.sites ?? []).filter(s => s.probingDepth != null).map(s => (
                      <TableRow key={s.id} sx={{ bgcolor: s.probingDepth >= 4 ? '#ffebee' : 'inherit' }}>
                        <TableCell>{s.toothFdi}</TableCell>
                        <TableCell>{s.site}</TableCell>
                        <TableCell>{s.probingDepth}</TableCell>
                        <TableCell>{s.recession ?? '-'}</TableCell>
                        <TableCell>{s.cal ?? '-'}</TableCell>
                        <TableCell>{s.bleeding ? '●' : ''}</TableCell>
                        <TableCell>{s.suppuration ? '●' : ''}</TableCell>
                        <TableCell>{s.furcation ? '●' : ''}</TableCell>
                        <TableCell>{s.mobility ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewExam(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
