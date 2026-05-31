import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Autocomplete, TextField,
  Alert, CircularProgress, Tabs, Tab, Checkbox, FormControlLabel,
  Divider, Stack, Chip, IconButton, Tooltip, Collapse,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  MenuItem, Select, FormControl, InputLabel, LinearProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MedicationIcon from '@mui/icons-material/Medication';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import BiotechIcon from '@mui/icons-material/Biotech';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ImageIcon from '@mui/icons-material/Image';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { medicalHistoryService } from '../services/medicalHistoryService';
import { patientService } from '../services/patientService';
import { documentService } from '../services/documentService';

const EMPTY_FORM = {
  patientId: 0,
  hasHeartDisease: false, hasDiabetes: false, hasHypertension: false,
  hasAsthma: false, hasBleedingDisorder: false, hasEpilepsy: false,
  hasHIV: false, hasHepatitis: false, hasOsteoporosis: false, isPregnant: false,
  otherConditions: '',
  allergyToPenicillin: false, allergyToAspirin: false, allergyToLatex: false,
  allergyToAnesthesia: false, otherAllergies: '',
  currentMedications: '',
  bloodPressure: '', pulseRate: '', temperature: '', weight: '', height: '',
  hasAnxiety: false, hasBadExperience: false, hasBruxism: false,
  previousDentalWork: '', chiefComplaint: '', clinicNotes: '',
  isSmoker: false, consumesAlcohol: false,
  patientSignatureData: ''
};

function CheckItem({ label, field, form, setForm }) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={!!form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.checked }))}
          size="small"
        />
      }
      label={<Typography variant="body2">{label}</Typography>}
    />
  );
}

function SectionHeader({ icon, title }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
      {icon}
      <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
    </Stack>
  );
}

function ConditionSummaryChips({ record }) {
  const flags = [];
  if (record.hasHeartDisease) flags.push({ label: 'Heart Disease', color: 'error' });
  if (record.hasDiabetes) flags.push({ label: 'Diabetes', color: 'warning' });
  if (record.hasHypertension) flags.push({ label: 'Hypertension', color: 'warning' });
  if (record.hasAsthma) flags.push({ label: 'Asthma', color: 'info' });
  if (record.hasBleedingDisorder) flags.push({ label: 'Bleeding Disorder', color: 'error' });
  if (record.hasEpilepsy) flags.push({ label: 'Epilepsy', color: 'warning' });
  if (record.hasHIV) flags.push({ label: 'HIV/AIDS', color: 'error' });
  if (record.hasHepatitis) flags.push({ label: 'Hepatitis', color: 'warning' });
  if (record.hasOsteoporosis) flags.push({ label: 'Osteoporosis', color: 'info' });
  if (record.isPregnant) flags.push({ label: 'Pregnant', color: 'secondary' });
  if (record.isSmoker) flags.push({ label: 'Smoker', color: 'default' });
  if (record.consumesAlcohol) flags.push({ label: 'Alcohol Use', color: 'default' });
  if (record.allergyToPenicillin) flags.push({ label: 'Allergy: Penicillin', color: 'error' });
  if (record.allergyToAspirin) flags.push({ label: 'Allergy: Aspirin', color: 'error' });
  if (record.allergyToLatex) flags.push({ label: 'Allergy: Latex', color: 'error' });
  if (record.allergyToAnesthesia) flags.push({ label: 'Allergy: Anesthesia', color: 'error' });
  if (!flags.length) return <Typography variant="body2" color="text.secondary">No flagged conditions.</Typography>;
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
      {flags.map(f => <Chip key={f.label} label={f.label} size="small" color={f.color} />)}
    </Stack>
  );
}

export default function MedicalHistoryPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState(0);
  const [existingId, setExistingId] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachCategory, setAttachCategory] = useState('LabResult');
  const [attachDescription, setAttachDescription] = useState('');
  const [attachError, setAttachError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [attachPreview, setAttachPreview] = useState(null);   // { url, name, isImage }
  const [lightboxUrl, setLightboxUrl] = useState(null);        // full-size image overlay

  useEffect(() => {
    patientService.getAll(1, 200).then(d => setPatients(d.items ?? d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPatient) {
      setForm({ ...EMPTY_FORM });
      setHistoryList([]);
      setExistingId(null);
      setAttachments([]);
      return;
    }
    setLoading(true);
    medicalHistoryService.getActive(selectedPatient.id).then(data => {
      if (data) {
        setForm({ ...EMPTY_FORM, ...data });
        setExistingId(data.id);
      } else {
        setForm({ ...EMPTY_FORM, patientId: selectedPatient.id });
        setExistingId(null);
      }
    }).catch(() => setError('Failed to load medical history.'))
      .finally(() => setLoading(false));

    medicalHistoryService.getHistory(selectedPatient.id).then(list => {
      // Sort descending by recordedDate
      const sorted = [...(list || [])].sort(
        (a, b) => new Date(b.recordedDate) - new Date(a.recordedDate)
      );
      setHistoryList(sorted);
    }).catch(() => {});

    loadAttachments(selectedPatient.id);
  }, [selectedPatient]);

  const handleSave = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const toNullableInt = v => (v === '' || v === null || v === undefined) ? null : parseInt(v, 10);
      const toNullableDecimal = v => (v === '' || v === null || v === undefined) ? null : parseFloat(v);
      const payload = {
        ...form,
        patientId: selectedPatient.id,
        pulseRate: toNullableInt(form.pulseRate),
        temperature: toNullableDecimal(form.temperature),
        weight: toNullableDecimal(form.weight),
        height: toNullableDecimal(form.height),
      };
      if (existingId) {
        await medicalHistoryService.update(existingId, payload);
      } else {
        await medicalHistoryService.createOrReplace(payload);
      }
      setSuccess('Medical history saved successfully.');
      const updated = await medicalHistoryService.getActive(selectedPatient.id);
      if (updated) { setForm({ ...EMPTY_FORM, ...updated }); setExistingId(updated.id); }
      const hist = await medicalHistoryService.getHistory(selectedPatient.id);
      const sorted = [...(hist || [])].sort(
        (a, b) => new Date(b.recordedDate) - new Date(a.recordedDate)
      );
      setHistoryList(sorted);
    } catch {
      setError('Failed to save medical history.');
    } finally {
      setSaving(false);
    }
  };

  const handleNewRecord = () => {
    if (!selectedPatient) return;
    setExistingId(null);
    setForm({ ...EMPTY_FORM, patientId: selectedPatient.id });
    setSuccess('');
    setError('');
    setTab(0);
  };

  // ── Attachment handlers ──────────────────────────────────────────────────
  const loadAttachments = async (patientId) => {
    setAttachLoading(true);
    try {
      const docs = await documentService.getByPatient(patientId);
      const medicalDocs = (docs || []).filter(
        d => d.category === 'LabResult' || d.category === 'MedicalRecord' || d.category === 'General'
      );
      setAttachments(medicalDocs);
    } catch {
      setAttachments([]);
    } finally {
      setAttachLoading(false);
    }
  };

  const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/tiff', 'image/heic', 'image/heif', 'image/svg+xml'];

  const isImageFile = (file) =>
    IMAGE_MIME_TYPES.includes(file.type) || /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif|svg)$/i.test(file.name);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;
    setAttachError('');

    // Show local preview for images
    if (isImageFile(file)) {
      const objectUrl = URL.createObjectURL(file);
      setAttachPreview({ url: objectUrl, name: file.name, isImage: true });
    } else {
      setAttachPreview({ url: null, name: file.name, isImage: false });
    }

    setAttachUploading(true);
    try {
      await documentService.upload(
        selectedPatient.id,
        file,
        attachCategory,
        attachDescription || file.name
      );
      setAttachDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      // Keep preview briefly then clear
      setTimeout(() => setAttachPreview(null), 2000);
      await loadAttachments(selectedPatient.id);
    } catch {
      setAttachError('Upload failed. Please try again.');
      setAttachPreview(null);
    } finally {
      setAttachUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      await documentService.download(doc.id, doc.fileName || doc.originalFileName || `file_${doc.id}`);
    } catch {
      setAttachError('Download failed.');
    }
  };

  const handleDeleteAttachment = async (id) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await documentService.delete(id);
      setAttachments(prev => prev.filter(d => d.id !== id));
    } catch {
      setAttachError('Delete failed.');
    }
  };

  const CATEGORY_LABELS = {
    LabResult: 'Lab Result',
    MedicalRecord: 'Medical Record',
    General: 'General',
  };

  const CATEGORY_COLORS = {
    LabResult: 'info',
    MedicalRecord: 'primary',
    General: 'default',
  };

  const isAttachmentImage = (doc) =>
    /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif)$/i.test(
      doc.fileName || doc.originalFileName || ''
    ) || IMAGE_MIME_TYPES.includes(doc.mimeType || doc.contentType || '');

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const F = (field, label, multiline = false, rows = 1, placeholder = '') => (
    <TextField
      label={label}
      size="small" fullWidth
      multiline={multiline} rows={rows}
      placeholder={placeholder}
      value={form[field] ?? ''}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
    />
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <AssignmentIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>Patient Medical History</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Record and manage each patient's medical conditions, allergies, medications and clinical background.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Patient Selector + Action Buttons */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <Autocomplete
              options={patients}
              getOptionLabel={p => p.fullName ?? `${p.firstName} ${p.lastName}`}
              value={selectedPatient}
              onChange={(_, v) => setSelectedPatient(v)}
              renderInput={params => <TextField {...params} label="Select Patient" size="small" />}
            />
          </Grid>
          {selectedPatient && (
            <>
              <Grid item xs="auto">
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {existingId ? 'Update Record' : 'Save New Record'}
                </Button>
              </Grid>
              <Grid item xs="auto">
                <Tooltip title="Start a fresh medical history record for this patient (archives the current one)">
                  <Button
                    variant="outlined"
                    startIcon={<AddCircleIcon />}
                    onClick={handleNewRecord}
                    disabled={saving}
                  >
                    New Record
                  </Button>
                </Tooltip>
              </Grid>
            </>
          )}
        </Grid>
        {existingId && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Editing active record #{existingId}. Use "New Record" to archive this and start a fresh intake.
          </Typography>
        )}
      </Paper>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}

      {selectedPatient && !loading && (
        <Paper sx={{ p: 0 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable" scrollButtons="auto">
            <Tab icon={<FavoriteIcon fontSize="small" />} iconPosition="start" label="Conditions" />
            <Tab icon={<WarningAmberIcon fontSize="small" />} iconPosition="start" label="Allergies" />
            <Tab icon={<MedicationIcon fontSize="small" />} iconPosition="start" label="Medications & Vitals" />
            <Tab icon={<MonitorHeartIcon fontSize="small" />} iconPosition="start" label="Clinical History" />
            <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Past Records" />
            <Tab icon={<AttachFileIcon fontSize="small" />} iconPosition="start" label="Attachments" />
          </Tabs>
          <Divider />

          <Box sx={{ p: 3 }}>

            {/* ── Tab 0: Medical Conditions ── */}
            {tab === 0 && (
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <SectionHeader
                    icon={<FavoriteIcon color="error" fontSize="small" />}
                    title="Medical Conditions"
                  />
                </Grid>
                {[
                  ['hasHeartDisease', 'Heart Disease / Cardiac Condition'],
                  ['hasDiabetes', 'Diabetes (Type 1 or Type 2)'],
                  ['hasHypertension', 'Hypertension (High Blood Pressure)'],
                  ['hasAsthma', 'Asthma / Respiratory Condition'],
                  ['hasBleedingDisorder', 'Bleeding / Clotting Disorder'],
                  ['hasEpilepsy', 'Epilepsy / Seizure Disorder'],
                  ['hasHIV', 'HIV / AIDS'],
                  ['hasHepatitis', 'Hepatitis (B or C)'],
                  ['hasOsteoporosis', 'Osteoporosis / Bone Disease'],
                  ['isPregnant', 'Currently Pregnant'],
                  ['isSmoker', 'Smoker / Tobacco Use'],
                  ['consumesAlcohol', 'Regular Alcohol Consumption'],
                ].map(([field, label]) => (
                  <Grid item xs={12} sm={6} md={4} key={field}>
                    <CheckItem label={label} field={field} form={form} setForm={setForm} />
                  </Grid>
                ))}
                <Grid item xs={12} sx={{ mt: 1 }}>
                  {F('otherConditions', 'Other Medical Conditions', true, 2, 'List any other conditions not mentioned above')}
                </Grid>
              </Grid>
            )}

            {/* ── Tab 1: Allergies ── */}
            {tab === 1 && (
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <SectionHeader
                    icon={<WarningAmberIcon color="warning" fontSize="small" />}
                    title="Known Allergies"
                  />
                </Grid>
                {[
                  ['allergyToPenicillin', 'Penicillin / Amoxicillin / Antibiotics'],
                  ['allergyToAspirin', 'Aspirin / NSAIDs (Ibuprofen, Naproxen)'],
                  ['allergyToLatex', 'Latex / Rubber'],
                  ['allergyToAnesthesia', 'Local or General Anesthesia'],
                ].map(([field, label]) => (
                  <Grid item xs={12} sm={6} key={field}>
                    <CheckItem label={label} field={field} form={form} setForm={setForm} />
                  </Grid>
                ))}
                <Grid item xs={12} sx={{ mt: 1 }}>
                  {F('otherAllergies', 'Other Allergies / Drug Reactions', true, 2, 'Describe any other allergies or adverse drug reactions')}
                </Grid>
              </Grid>
            )}

            {/* ── Tab 2: Medications & Vitals ── */}
            {tab === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <SectionHeader
                    icon={<MedicationIcon color="primary" fontSize="small" />}
                    title="Current Medications"
                  />
                </Grid>
                <Grid item xs={12}>
                  {F('currentMedications', 'Current Medications', true, 4, 'e.g. Metformin 500mg twice daily, Amlodipine 5mg once daily')}
                </Grid>

                <Grid item xs={12} sx={{ mt: 1 }}>
                  <SectionHeader
                    icon={<MonitorHeartIcon color="error" fontSize="small" />}
                    title="Vital Signs (at intake)"
                  />
                </Grid>
                <Grid item xs={6} md={3}>{F('bloodPressure', 'Blood Pressure', false, 1, '120/80')}</Grid>
                <Grid item xs={6} md={3}>{F('pulseRate', 'Pulse Rate (bpm)', false, 1, '72')}</Grid>
                <Grid item xs={6} md={3}>{F('temperature', 'Temperature (°C)', false, 1, '36.6')}</Grid>
                <Grid item xs={6} md={3}>{F('weight', 'Weight (kg)')}</Grid>
                <Grid item xs={6} md={3}>{F('height', 'Height (cm)')}</Grid>
              </Grid>
            )}

            {/* ── Tab 3: Clinical History ── */}
            {tab === 3 && (
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <SectionHeader
                    icon={<AssignmentIcon color="primary" fontSize="small" />}
                    title="Clinical & Treatment Background"
                  />
                </Grid>
                {[
                  ['hasAnxiety', 'Medical / Procedure Anxiety'],
                  ['hasBadExperience', 'Previous Adverse Medical Experience'],
                  ['hasBruxism', 'Bruxism / Teeth Grinding'],
                ].map(([field, label]) => (
                  <Grid item xs={12} sm={6} key={field}>
                    <CheckItem label={label} field={field} form={form} setForm={setForm} />
                  </Grid>
                ))}
                <Grid item xs={12} sx={{ mt: 1 }}>
                  {F('chiefComplaint', 'Chief Complaint / Reason for Visit', true, 2, 'Primary reason the patient is seeking care')}
                </Grid>
                <Grid item xs={12}>
                  {F('previousDentalWork', 'Previous Treatments / Surgical History', true, 4, 'List past procedures, surgeries, hospitalizations, or significant medical events')}
                </Grid>
                <Grid item xs={12}>
                  {F('clinicNotes', 'Clinic Notes', true, 4, 'Physician / staff observations and clinical remarks')}
                </Grid>
              </Grid>
            )}

            {/* ── Tab 4: Past Records ── */}
            {tab === 4 && (
              <Stack spacing={1.5}>
                {historyList.length === 0 && (
                  <Alert severity="info">No previous medical history records found for this patient.</Alert>
                )}
                {historyList.map(h => (
                  <Paper key={h.id} variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        px: 2, py: 1.5,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer',
                        bgcolor: h.isActive ? 'success.50' : 'background.default',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => setExpandedRecord(expandedRecord === h.id ? null : h.id)}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="subtitle2">
                          {new Date(h.recordedDate).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </Typography>
                        {h.recordedBy && (
                          <Typography variant="body2" color="text.secondary">— {h.recordedBy}</Typography>
                        )}
                        {h.isActive
                          ? <Chip label="Active" color="success" size="small" />
                          : <Chip label="Archived" size="small" variant="outlined" />}
                      </Stack>
                      <IconButton size="small">
                        {expandedRecord === h.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>

                    <Collapse in={expandedRecord === h.id}>
                      <Divider />
                      <Box sx={{ px: 2, py: 2 }}>
                        {h.chiefComplaint && (
                          <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              CHIEF COMPLAINT
                            </Typography>
                            <Typography variant="body2">{h.chiefComplaint}</Typography>
                          </Box>
                        )}
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            CONDITIONS &amp; ALERTS
                          </Typography>
                          <ConditionSummaryChips record={h} />
                        </Box>
                        {h.currentMedications && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              MEDICATIONS
                            </Typography>
                            <Typography variant="body2">{h.currentMedications}</Typography>
                          </Box>
                        )}
                        {h.otherAllergies && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              OTHER ALLERGIES
                            </Typography>
                            <Typography variant="body2">{h.otherAllergies}</Typography>
                          </Box>
                        )}
                        {(h.bloodPressure || h.pulseRate) && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              VITALS
                            </Typography>
                            <Typography variant="body2">
                              {[
                                h.bloodPressure && `BP: ${h.bloodPressure}`,
                                h.pulseRate && `Pulse: ${h.pulseRate} bpm`,
                                h.temperature && `Temp: ${h.temperature}°C`,
                                h.weight && `Weight: ${h.weight} kg`,
                                h.height && `Height: ${h.height} cm`,
                              ].filter(Boolean).join(' · ')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Paper>
                ))}
              </Stack>
            )}

            {/* ── Tab 5: Attachments ── */}
            {tab === 5 && (
              <Stack spacing={2}>
                <SectionHeader
                  icon={<AttachFileIcon color="primary" fontSize="small" />}
                  title="Medical Records & Lab Results"
                />

                {attachError && (
                  <Alert severity="error" onClose={() => setAttachError('')}>{attachError}</Alert>
                )}

                {/* Upload Panel */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Upload Attachment</Typography>
                  <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Category</InputLabel>
                        <Select
                          value={attachCategory}
                          onChange={e => setAttachCategory(e.target.value)}
                          label="Category"
                        >
                          <MenuItem value="LabResult">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <BiotechIcon fontSize="small" color="info" />
                              <span>Lab Result</span>
                            </Stack>
                          </MenuItem>
                          <MenuItem value="MedicalRecord">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <InsertDriveFileIcon fontSize="small" color="primary" />
                              <span>Medical Record</span>
                            </Stack>
                          </MenuItem>
                          <MenuItem value="General">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <AttachFileIcon fontSize="small" />
                              <span>General</span>
                            </Stack>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        fullWidth size="small"
                        label="Description (optional)"
                        placeholder="e.g. CBC Result June 2025, Chest X-Ray"
                        value={attachDescription}
                        onChange={e => setAttachDescription(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      {/* Hidden file inputs */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.heic,.heif,.svg,.doc,.docx,.xls,.xlsx"
                      />
                      <input
                        type="file"
                        ref={cameraInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        accept="image/*"
                        capture="environment"
                      />
                      <Stack spacing={1}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<UploadFileIcon />}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={attachUploading}
                        >
                          {attachUploading ? 'Uploading…' : 'Browse File'}
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<CameraAltIcon />}
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={attachUploading}
                        >
                          Take Photo
                        </Button>
                      </Stack>
                    </Grid>
                    {attachUploading && (
                      <Grid item xs={12}>
                        <LinearProgress />
                      </Grid>
                    )}

                    {/* Image preview before / during upload */}
                    {attachPreview && (
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                          {attachPreview.isImage ? (
                            <Box
                              component="img"
                              src={attachPreview.url}
                              alt="preview"
                              sx={{ height: 80, maxWidth: 120, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                            />
                          ) : (
                            <InsertDriveFileIcon color="primary" sx={{ fontSize: 48 }} />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={500}>{attachPreview.name}</Typography>
                            <Typography variant="caption" color={attachUploading ? 'text.secondary' : 'success.main'}>
                              {attachUploading ? 'Uploading…' : 'Uploaded successfully'}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Accepted: Images (JPG, PNG, WEBP, GIF, BMP, HEIC, TIFF), PDF, DOC, DOCX, XLS, XLSX
                  </Typography>
                </Paper>

                {/* Attachments List */}
                {attachLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : attachments.length === 0 ? (
                  <Alert severity="info">No attachments uploaded yet for this patient.</Alert>
                ) : (
                  <Paper variant="outlined">
                    <List dense disablePadding>
                      {attachments.map((doc, idx) => (
                        <Box key={doc.id}>
                          {idx > 0 && <Divider />}
                          <ListItem sx={{ py: 1.5, px: 2, alignItems: 'flex-start' }}>
                            <ListItemIcon sx={{ minWidth: 44, mt: 0.5 }}>
                              {isAttachmentImage(doc) ? (
                                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                  {doc.fileUrl ? (
                                    <Box
                                      component="img"
                                      src={doc.fileUrl}
                                      alt={doc.description || 'attachment'}
                                      sx={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider', cursor: 'pointer' }}
                                      onClick={() => setLightboxUrl(doc.fileUrl)}
                                    />
                                  ) : (
                                    <ImageIcon color="action" />
                                  )}
                                </Box>
                              ) : doc.category === 'LabResult' ? (
                                <BiotechIcon color="info" />
                              ) : (
                                <InsertDriveFileIcon color="primary" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                  <Typography variant="body2" fontWeight={500}>
                                    {doc.description || doc.fileName || doc.originalFileName || `Document ${doc.id}`}
                                  </Typography>
                                  <Chip
                                    label={CATEGORY_LABELS[doc.category] || doc.category}
                                    color={CATEGORY_COLORS[doc.category] || 'default'}
                                    size="small"
                                  />
                                </Stack>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {doc.uploadedAt
                                    ? new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'short', day: 'numeric',
                                      })
                                    : ''}
                                  {doc.fileSize ? `  ·  ${formatFileSize(doc.fileSize)}` : ''}
                                  {doc.uploadedByName ? `  ·  ${doc.uploadedByName}` : ''}
                                </Typography>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title="Download">
                                <IconButton size="small" onClick={() => handleDownload(doc)}>
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => handleDeleteAttachment(doc.id)}>
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </Box>
                      ))}
                    </List>
                  </Paper>
                )}
              </Stack>
            )}

          </Box>
        </Paper>
      )}

      {/* ── Lightbox overlay for full-size image preview ── */}
      {lightboxUrl && (
        <Box
          onClick={() => setLightboxUrl(null)}
          sx={{
            position: 'fixed', inset: 0, zIndex: 9999,
            bgcolor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', p: 2,
          }}
        >
          <Box
            component="img"
            src={lightboxUrl}
            alt="full preview"
            sx={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 2, boxShadow: 8 }}
          />
          <Typography
            variant="caption"
            sx={{ position: 'absolute', bottom: 16, color: 'rgba(255,255,255,0.6)' }}
          >
            Click anywhere to close
          </Typography>
        </Box>
      )}
    </Box>
  );
}
