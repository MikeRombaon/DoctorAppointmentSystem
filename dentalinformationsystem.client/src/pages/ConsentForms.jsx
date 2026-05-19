import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Autocomplete, TextField,
  Alert, CircularProgress, Chip, Stack, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, Select, FormControl,
  InputLabel, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DrawIcon from '@mui/icons-material/Draw';
import SignatureCanvas from 'react-signature-canvas';
import { consentFormService } from '../services/consentFormService';
import { patientService } from '../services/patientService';

const STATUS_COLORS = { Pending: 'warning', Signed: 'success', Declined: 'error', Revoked: 'default' };

const TEMPLATES = [
  {
    title: 'General Dental Treatment Consent',
    text: `I, the undersigned, consent to the examination and treatment recommended by the dental team. I understand that dentistry is not an exact science and that satisfactory results cannot always be guaranteed.\n\nI acknowledge that I have been informed of the proposed treatment, its risks, benefits, and alternatives. I understand that I may withdraw this consent at any time.\n\nI confirm that all information I have provided regarding my health and medical history is accurate to the best of my knowledge.`
  },
  {
    title: 'Tooth Extraction Consent',
    text: `I consent to the extraction of the tooth/teeth as recommended by the dentist. I have been informed that extraction is recommended due to my dental condition.\n\nI understand the risks including but not limited to: pain and swelling, infection, dry socket, damage to adjacent teeth, nerve involvement, and potential for incomplete extraction.\n\nI agree to follow all post-operative instructions provided.`
  },
  {
    title: 'Root Canal Treatment Consent',
    text: `I consent to root canal treatment (endodontic therapy) on the tooth/teeth specified. I understand that root canal treatment involves removing the nerve and pulp tissue from the tooth to eliminate infection and preserve the tooth.\n\nI understand the risks including: instrument separation, perforation, post-operative pain, and the possibility that treatment may not be successful requiring further treatment or extraction.`
  },
  {
    title: 'Dental Implant Consent',
    text: `I consent to dental implant placement as recommended. I understand this is a surgical procedure and I have been informed of the procedure, recovery time, risks, and alternatives.\n\nRisks include: surgical complications, implant failure, nerve damage, infection, and need for bone grafting. Success rates are high but not guaranteed.`
  },
  {
    title: 'Photography / Documentation Consent',
    text: `I consent to photographs, X-rays, and other clinical documentation being taken for the purpose of treatment planning, patient records, and potentially educational or research purposes (de-identified).\n\nI understand I may withdraw this consent at any time.`
  },
];

export default function ConsentForms() {
  const sigPadRef = useRef(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const [saving, setSaving] = useState(false);

  // Sign dialog
  const [signFormId, setSignFormId] = useState(null);
  const [signFormTitle, setSignFormTitle] = useState('');
  const [signFormText, setSignFormText] = useState('');
  const [signedByName, setSignedByName] = useState('');
  const [signedByRel, setSignedByRel] = useState('');
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    patientService.getAll(1, 200).then(d => setPatients(d.items ?? d)).catch(() => {});
  }, []);

  const loadForms = async (patientId) => {
    setLoading(true);
    try {
      const data = await consentFormService.getByPatient(patientId);
      setForms(data);
    } catch {
      setError('Failed to load consent forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) loadForms(selectedPatient.id);
    else setForms([]);
  }, [selectedPatient]);

  const handleCreateOpen = () => {
    setSelectedTemplate(TEMPLATES[0]);
    setCustomTitle('');
    setCustomText('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      await consentFormService.create({
        patientId: selectedPatient.id,
        templateTitle: customTitle || selectedTemplate.title,
        consentText: customText || selectedTemplate.text
      });
      await loadForms(selectedPatient.id);
      setCreateOpen(false);
    } catch {
      setError('Failed to create consent form.');
    } finally {
      setSaving(false);
    }
  };

  const openSign = (form) => {
    setSignFormId(form.id);
    setSignFormTitle(form.templateTitle);
    setSignedByName('');
    setSignedByRel('');
    setTimeout(() => sigPadRef.current?.clear(), 100);
  };

  const handleSign = async () => {
    if (!signedByName.trim()) { setError('Please enter the name of the signatory.'); return; }
    if (sigPadRef.current?.isEmpty()) { setError('Please provide a signature.'); return; }

    setSigning(true);
    setError('');
    try {
      const signatureData = sigPadRef.current.toDataURL('image/png');
      await consentFormService.sign(signFormId, {
        signatureData,
        signedByName,
        signedByRelationship: signedByRel || null
      });
      await loadForms(selectedPatient.id);
      setSignFormId(null);
    } catch {
      setError('Failed to record signature.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>Consent Forms</Typography>

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
            <Button variant="contained" startIcon={<AddIcon />} disabled={!selectedPatient} onClick={handleCreateOpen}>
              New Consent Form
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={1}>
          {forms.length === 0 && selectedPatient && (
            <Alert severity="info">No consent forms found for this patient.</Alert>
          )}
          {forms.map(f => (
            <Paper key={f.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={f.statusName} color={STATUS_COLORS[f.statusName] ?? 'default'} size="small" />
                    <Typography variant="subtitle2">{f.templateTitle}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(f.createdDate).toLocaleDateString()}
                    {f.signedByName ? ` · Signed by: ${f.signedByName}${f.signedByRelationship ? ` (${f.signedByRelationship})` : ''}` : ''}
                    {f.signedDate ? ` · ${new Date(f.signedDate).toLocaleDateString()}` : ''}
                  </Typography>
                </Box>
                {f.statusName === 'Pending' && (
                  <Button size="small" variant="outlined" startIcon={<DrawIcon />} onClick={() => openSign(f)}>
                    Capture Signature
                  </Button>
                )}
                {f.hasSignature && (
                  <Chip label="Signature Captured" color="success" variant="outlined" size="small" />
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Consent Form</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Template</InputLabel>
              <Select
                value={selectedTemplate.title}
                label="Template"
                onChange={e => {
                  const t = TEMPLATES.find(t => t.title === e.target.value);
                  if (t) { setSelectedTemplate(t); setCustomTitle(''); setCustomText(''); }
                }}
              >
                {TEMPLATES.map(t => <MenuItem key={t.title} value={t.title}>{t.title}</MenuItem>)}
                <MenuItem value="__custom__">Custom</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Title (override)"
              size="small" fullWidth
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder={selectedTemplate.title}
            />
            <TextField
              label="Consent Text"
              multiline rows={8} fullWidth size="small"
              value={customText || selectedTemplate.text}
              onChange={e => setCustomText(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Create Form'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sign dialog */}
      <Dialog open={!!signFormId} onClose={() => setSignFormId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Capture Signature — {signFormTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Full Name of Signatory" size="small" fullWidth required
              value={signedByName}
              onChange={e => setSignedByName(e.target.value)}
            />
            <TextField
              label="Relationship to Patient (leave blank if patient)"
              size="small" fullWidth
              value={signedByRel}
              onChange={e => setSignedByRel(e.target.value)}
              placeholder="e.g. Parent, Spouse, Guardian"
            />
            <Box>
              <Typography variant="body2" gutterBottom>Signature</Typography>
              <Box sx={{ border: '1px solid #ccc', borderRadius: 1, bgcolor: '#fafafa' }}>
                <SignatureCanvas
                  ref={sigPadRef}
                  penColor="black"
                  canvasProps={{ width: 460, height: 160, style: { display: 'block' } }}
                />
              </Box>
              <Button size="small" onClick={() => sigPadRef.current?.clear()} sx={{ mt: 0.5 }}>
                Clear
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignFormId(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSign} disabled={signing} startIcon={<DrawIcon />}>
            {signing ? <CircularProgress size={18} /> : 'Confirm Signature'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
