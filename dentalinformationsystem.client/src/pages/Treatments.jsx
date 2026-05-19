import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Chip,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  MedicalServices as MedicalServicesIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import treatmentService from '../services/treatmentService';
import patientService from '../services/patientService';
import userService from '../services/userService';
import { medicalHistoryService } from '../services/medicalHistoryService';
import api from '../services/api';

const validationSchema = yup.object({
  appointmentId: yup.number().required('Appointment is required'),
  doctorId: yup.number().required('Doctor is required'),
  procedureId: yup.number().required('Procedure is required'),
  treatmentDate: yup.date().required('Treatment date is required'),
  diagnosis: yup.string().max(500, 'Diagnosis must be 500 characters or less'),
  notes: yup.string().max(1000, 'Notes must be 1000 characters or less'),
  cost: yup.number().positive('Cost must be positive').required('Cost is required'),
});

const STATUS_OPTIONS = ['Planned', 'InProgress', 'Completed', 'Cancelled'];

const statusColors = {
  Planned: 'default',
  InProgress: 'primary',
  Completed: 'success',
  Cancelled: 'error',
};

const Treatments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [patients, setPatients] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patientMedicalAlert, setPatientMedicalAlert] = useState(null);

  const formik = useFormik({
    initialValues: {
      appointmentId: '',
      doctorId: '',
      procedureId: '',
      treatmentDate: new Date().toISOString().split('T')[0],
      affectedArea: '',
      diagnosis: '',
      notes: '',
      cost: '',
      status: 'Planned',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const treatmentData = {
          appointmentId: parseInt(values.appointmentId),
          dentistId: parseInt(values.doctorId),
          procedureId: parseInt(values.procedureId),
          treatmentDate: values.treatmentDate,
          notes: values.notes ? `[Area: ${values.affectedArea}]\n${values.notes}` : (values.affectedArea ? `[Area: ${values.affectedArea}]` : null),
          diagnosis: values.diagnosis || null,
          cost: parseFloat(values.cost),
          status: values.status,
        };

        if (editingTreatment) {
          await treatmentService.update(editingTreatment.id, treatmentData);
          toast.success('Treatment updated successfully.');
        } else {
          await treatmentService.create(treatmentData);
          toast.success('Treatment recorded successfully.');
        }
        handleCloseDialog();
        loadTreatments();
      } catch (error) {
        console.error('Error saving treatment:', error);
        toast.error(error.response?.data?.message || 'Error saving treatment');
      }
    },
  });

  useEffect(() => {
    loadTreatments();
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    loadPatients();
    loadProcedures();
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await userService.getAll(1, 100);
      const clinicalStaff = (data.items || []).filter(
        (u) => u.role === 'ClinicalStaff' && u.isActive
      );
      setDoctors(clinicalStaff);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadTreatments = async () => {
    try {
      setLoading(true);
      const data = await treatmentService.getAll(page + 1, pageSize, null, null, statusFilter || null);
      setTreatments(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading treatments:', error);
      toast.error('Error loading treatments');
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const data = await patientService.getAll(1, 100);
      setPatients(data.items || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadProcedures = async () => {
    try {
      const response = await api.get('/procedures');
      setProcedures(response.data.items || response.data || []);
    } catch (error) {
      console.error('Error loading procedures:', error);
    }
  };

  const loadAppointments = async (patientId) => {
    try {
      const response = await api.get(`/appointments?patientId=${patientId}&pageSize=50`);
      setAppointments(response.data.items || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadPatientMedicalAlert = async (patientId) => {
    try {
      const history = await medicalHistoryService.getActive(patientId);
      if (!history) { setPatientMedicalAlert(null); return; }
      const alerts = [];
      if (history.hasHeartDisease) alerts.push('Heart Disease');
      if (history.hasDiabetes) alerts.push('Diabetes');
      if (history.hasHypertension) alerts.push('Hypertension');
      if (history.hasBleedingDisorder) alerts.push('Bleeding Disorder');
      if (history.hasEpilepsy) alerts.push('Epilepsy');
      if (history.hasAsthma) alerts.push('Asthma');
      if (history.allergyToPenicillin) alerts.push('Allergy: Penicillin');
      if (history.allergyToAspirin) alerts.push('Allergy: Aspirin/NSAIDs');
      if (history.allergyToAnesthesia) alerts.push('Allergy: Anesthesia');
      if (history.allergyToLatex) alerts.push('Allergy: Latex');
      if (history.otherAllergies) alerts.push(`Allergy: ${history.otherAllergies}`);
      if (history.currentMedications) alerts.push(`Meds: ${history.currentMedications}`);
      setPatientMedicalAlert(alerts.length > 0 ? alerts : null);
    } catch {
      setPatientMedicalAlert(null);
    }
  };

  const handlePatientChange = (patientId) => {
    setSelectedPatient(patientId);
    setPatientMedicalAlert(null);
    if (patientId) {
      loadAppointments(patientId);
      loadPatientMedicalAlert(patientId);
    } else {
      setAppointments([]);
    }
    formik.setFieldValue('appointmentId', '');
  };

  const handleOpenDialog = (treatment = null) => {
    if (treatment) {
      setEditingTreatment(treatment);
      // Parse affectedArea and notes back from stored format
      let affectedArea = '';
      let notes = treatment.notes || '';
      const areaMatch = notes.match(/^\[Area: (.*?)\]\n?(.*)/s);
      if (areaMatch) { affectedArea = areaMatch[1]; notes = areaMatch[2]; }
      formik.setValues({
        appointmentId: treatment.appointmentId || '',
        doctorId: treatment.dentistId || '',
        procedureId: treatment.procedureId || '',
        treatmentDate: treatment.treatmentDate?.split('T')[0] || '',
        affectedArea,
        diagnosis: treatment.diagnosis || '',
        notes,
        cost: treatment.cost || '',
        status: treatment.status || 'Planned',
      });
      if (treatment.appointment?.patientId) {
        const pid = treatment.appointment.patientId;
        setSelectedPatient(pid);
        loadAppointments(pid);
        loadPatientMedicalAlert(pid);
      }
    } else {
      setEditingTreatment(null);
      setSelectedPatient('');
      setAppointments([]);
      setPatientMedicalAlert(null);
      formik.resetForm();
      if (user?.role === 'ClinicalStaff' && user?.id) {
        formik.setFieldValue('doctorId', user.id);
      }
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTreatment(null);
    setSelectedPatient('');
    setAppointments([]);
    setPatientMedicalAlert(null);
    formik.resetForm();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this treatment record?')) {
      try {
        await treatmentService.delete(id);
        toast.success('Treatment deleted successfully');
        loadTreatments();
      } catch (error) {
        console.error('Error deleting treatment:', error);
        toast.error('Error deleting treatment');
      }
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 60 },
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 160,
      valueGetter: (value, row) => row.appointment?.patient?.fullName || 'N/A',
    },
    {
      field: 'doctor',
      headerName: 'Doctor',
      width: 160,
      valueGetter: (value, row) => row.dentist?.fullName || 'N/A',
    },
    {
      field: 'procedure',
      headerName: 'Procedure / Treatment',
      flex: 1,
      minWidth: 180,
      valueGetter: (value, row) => row.procedure?.name || 'N/A',
    },
    {
      field: 'diagnosis',
      headerName: 'Diagnosis',
      width: 180,
      valueGetter: (value, row) => row.diagnosis || '—',
    },
    {
      field: 'treatmentDate',
      headerName: 'Date',
      width: 110,
      valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      field: 'cost',
      headerName: 'Cost',
      width: 90,
      valueFormatter: (value) => `$${Number(value || 0).toFixed(2)}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value} color={statusColors[params.value] || 'default'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Button size="small" onClick={() => handleOpenDialog(params.row)}>Edit</Button>
          <Button size="small" color="error" onClick={() => handleDelete(params.row.id)}>Delete</Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Treatments</Typography>
          <Typography variant="body2" color="text.secondary">
            Record and manage patient treatment sessions
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          New Treatment
        </Button>
      </Box>

      {/* Status Filter */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip
          label="All"
          onClick={() => setStatusFilter('')}
          color={statusFilter === '' ? 'primary' : 'default'}
          variant={statusFilter === '' ? 'filled' : 'outlined'}
        />
        {STATUS_OPTIONS.map((s) => (
          <Chip
            key={s}
            label={s === 'InProgress' ? 'In Progress' : s}
            onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
            color={statusFilter === s ? statusColors[s] || 'primary' : 'default'}
            variant={statusFilter === s ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      <DataGrid
        rows={treatments}
        columns={columns}
        loading={loading}
        pageSizeOptions={[5, 10, 25, 50]}
        paginationMode="server"
        rowCount={totalCount}
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(model) => {
          setPage(model.page);
          setPageSize(model.pageSize);
        }}
        autoHeight
        disableRowSelectionOnClick
      />

      {/* Add / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MedicalServicesIcon color="primary" />
          {editingTreatment ? 'Edit Treatment Record' : 'New Treatment Record'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>

              {/* ── Patient & Appointment ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  PATIENT &amp; APPOINTMENT
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Patient</InputLabel>
                  <Select
                    value={selectedPatient}
                    onChange={(e) => handlePatientChange(e.target.value)}
                    label="Patient"
                  >
                    <MenuItem value=""><em>— Select patient —</em></MenuItem>
                    {patients.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.fullName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small" disabled={!selectedPatient}>
                  <InputLabel>Appointment *</InputLabel>
                  <Select
                    name="appointmentId"
                    value={formik.values.appointmentId}
                    onChange={formik.handleChange}
                    error={formik.touched.appointmentId && Boolean(formik.errors.appointmentId)}
                    label="Appointment *"
                  >
                    {appointments.length === 0 && selectedPatient && (
                      <MenuItem disabled value="">No appointments found for this patient</MenuItem>
                    )}
                    {appointments.map((apt) => (
                      <MenuItem key={apt.id} value={apt.id}>
                        {new Date(apt.appointmentDate).toLocaleDateString()} — {apt.purpose}
                        {apt.isWalkIn && ' (Walk-in)'}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.appointmentId && formik.errors.appointmentId && (
                    <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                      {formik.errors.appointmentId}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Medical Alert Banner */}
              {patientMedicalAlert && (
                <Grid item xs={12}>
                  <Alert
                    severity="warning"
                    icon={<WarningIcon />}
                    action={
                      <Button
                        size="small"
                        startIcon={<HistoryIcon />}
                        onClick={() => navigate('/medical-history')}
                      >
                        View Full History
                      </Button>
                    }
                  >
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Patient Medical Alerts
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {patientMedicalAlert.map((a) => (
                        <Chip key={a} label={a} size="small" color="warning" />
                      ))}
                    </Stack>
                  </Alert>
                </Grid>
              )}

              {/* ── Clinical Details ── */}
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  CLINICAL DETAILS
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small" disabled={user?.role === 'ClinicalStaff'}>
                  <InputLabel>Doctor / Physician *</InputLabel>
                  <Select
                    name="doctorId"
                    value={formik.values.doctorId}
                    onChange={formik.handleChange}
                    error={formik.touched.doctorId && Boolean(formik.errors.doctorId)}
                    label="Doctor / Physician *"
                  >
                    {doctors.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.fullName}{d.specialization ? ` — ${d.specialization}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.doctorId && formik.errors.doctorId && (
                    <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                      {formik.errors.doctorId}
                    </Typography>
                  )}
                  {user?.role === 'ClinicalStaff' && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5, mt: 0.5 }}>
                      Auto-selected: You are the treating doctor
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Procedure / Treatment *</InputLabel>
                  <Select
                    name="procedureId"
                    value={formik.values.procedureId}
                    onChange={(e) => {
                      formik.handleChange(e);
                      const proc = procedures.find((p) => p.id === e.target.value);
                      if (proc) formik.setFieldValue('cost', proc.cost);
                    }}
                    error={formik.touched.procedureId && Boolean(formik.errors.procedureId)}
                    label="Procedure / Treatment *"
                  >
                    {procedures.map((proc) => (
                      <MenuItem key={proc.id} value={proc.id}>
                        {proc.name} — ${proc.cost}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.procedureId && formik.errors.procedureId && (
                    <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                      {formik.errors.procedureId}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Diagnosis"
                  name="diagnosis"
                  placeholder="e.g. Upper respiratory tract infection, Type 2 Diabetes follow-up"
                  value={formik.values.diagnosis}
                  onChange={formik.handleChange}
                  error={formik.touched.diagnosis && Boolean(formik.errors.diagnosis)}
                  helperText={formik.touched.diagnosis && formik.errors.diagnosis}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Affected Area / Body Region"
                  name="affectedArea"
                  placeholder="e.g. Left knee, Chest, Lower back"
                  value={formik.values.affectedArea}
                  onChange={formik.handleChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Treatment Date *"
                  name="treatmentDate"
                  value={formik.values.treatmentDate}
                  onChange={formik.handleChange}
                  error={formik.touched.treatmentDate && Boolean(formik.errors.treatmentDate)}
                  helperText={formik.touched.treatmentDate && formik.errors.treatmentDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Cost *"
                  name="cost"
                  value={formik.values.cost}
                  onChange={formik.handleChange}
                  error={formik.touched.cost && Boolean(formik.errors.cost)}
                  helperText={formik.touched.cost && formik.errors.cost}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>

              <Grid item xs={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    label="Status"
                  >
                    <MenuItem value="Planned">Planned</MenuItem>
                    <MenuItem value="InProgress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  label="Clinical Notes"
                  name="notes"
                  placeholder="Additional observations, instructions, follow-up plan…"
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  error={formik.touched.notes && Boolean(formik.errors.notes)}
                  helperText={formik.touched.notes && formik.errors.notes}
                />
              </Grid>

            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingTreatment ? 'Update' : 'Save Treatment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Treatments;
