import React, { useState, useEffect } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
import {
  Box,
  Button,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { 
  Add as AddIcon, 
  Refresh as RefreshIcon,
  DirectionsWalk as WalkInIcon,
  WarningAmber as EmergencyIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import appointmentService from '../services/appointmentService';
import patientService from '../services/patientService';
import userService from '../services/userService';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  patientId: Yup.number().required('Patient is required'),
  dentistId: Yup.number().required('Dentist is required'),
  appointmentDate: Yup.date().required('Date is required'),
  startTime: Yup.string().required('Start time is required'),
  endTime: Yup.string().required('End time is required'),
  purpose: Yup.string().required('Purpose is required'),
});

const walkInValidationSchema = Yup.object({
  patientId: Yup.number().required('Patient is required'),
  dentistId: Yup.number().required('Dentist is required'),
});

const Appointments = () => {
  const { tenantVersion } = useSuperAdminTenant();
  const [appointments, setAppointments] = useState([]);
  const [walkIns, setWalkIns] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [walkInCount, setWalkInCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openWalkInDialog, setOpenWalkInDialog] = useState(false);
  const [openEmergencyDialog, setOpenEmergencyDialog] = useState(false);
  const [emergencyDoctorId, setEmergencyDoctorId] = useState('');
  const [emergencyDate, setEmergencyDate] = useState(new Date().toISOString().split('T')[0]);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  const formik = useFormik({
    initialValues: {
      patientId: '',
      dentistId: '',
      appointmentDate: '',
      startTime: '',
      endTime: '',
      purpose: '',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        await appointmentService.create(values);
        toast.success('Appointment created successfully');
        handleCloseDialog();
        loadAppointments();
      } catch (error) {
        console.error('Error creating appointment:', error);
        toast.error('Error creating appointment');
      }
    },
  });

  const walkInFormik = useFormik({
    initialValues: {
      patientId: '',
      dentistId: '',
      purpose: '',
      notes: '',
    },
    validationSchema: walkInValidationSchema,
    onSubmit: async (values) => {
      try {
        await appointmentService.createWalkIn(values);
        toast.success('Walk-in patient registered successfully! 🚶');
        handleCloseWalkInDialog();
        loadWalkIns();
        loadAppointments();
      } catch (error) {
        console.error('Error registering walk-in:', error);
        toast.error('Error registering walk-in patient');
      }
    },
  });

  useEffect(() => {
    loadAppointments();
    loadWalkIns();
    loadPatients();
    loadDentists();
  }, [page, pageSize, tenantVersion]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getAll(page + 1, pageSize);
      setAppointments(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Error loading appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadWalkIns = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await appointmentService.getWalkIns(today, 1, 50);
      setWalkIns(data.items || []);
      setWalkInCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading walk-ins:', error);
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

  const loadDentists = async () => {
    try {
      const data = await userService.getDentists();
      setDentists(data || []);
    } catch (error) {
      console.error('Error loading dentists:', error);
    }
  };

  const handleEmergencyCancel = async () => {
    if (!emergencyDoctorId || !emergencyDate || !emergencyReason.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }
    setEmergencyLoading(true);
    try {
      const result = await appointmentService.bulkCancel(emergencyDoctorId, emergencyDate, emergencyReason.trim());
      toast.success(`🚨 ${result.message}`);
      setOpenEmergencyDialog(false);
      setEmergencyDoctorId('');
      setEmergencyReason('');
      setEmergencyDate(new Date().toISOString().split('T')[0]);
      loadAppointments();
    } catch (error) {
      console.error('Error cancelling appointments:', error);
      toast.error('Failed to cancel appointments. Please try again.');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    formik.resetForm();
  };

  const handleCloseWalkInDialog = () => {
    setOpenWalkInDialog(false);
    walkInFormik.resetForm();
  };

  const getStatusColor = (status) => {
    const colors = {
      0: 'default', // Scheduled
      1: 'info',    // Confirmed
      2: 'warning', // CheckedIn
      3: 'success', // InProgress
      4: 'success', // Completed
      5: 'error',   // Cancelled
      6: 'error',   // NoShow
      7: 'info',    // Rescheduled
      8: 'warning', // WalkIn
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      0: 'Scheduled',
      1: 'Confirmed',
      2: 'Checked In',
      3: 'In Progress',
      4: 'Completed',
      5: 'Cancelled',
      6: 'No Show',
      7: 'Rescheduled',
      8: 'Walk-In',
    };
    return labels[status] || 'Unknown';
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'appointmentDate',
      headerName: 'Date',
      width: 120,
      valueFormatter: (params) => new Date(params).toLocaleDateString(),
    },
    { field: 'startTime', headerName: 'Start', width: 100 },
    { field: 'endTime', headerName: 'End', width: 100 },
    {
      field: 'patient',
      headerName: 'Patient',
      width: 200,
      valueGetter: (params) => params?.fullName || 'N/A',
    },
    {
      field: 'dentist',
      headerName: 'Doctor',
      width: 180,
      valueGetter: (params) => params?.fullName || 'N/A',
    },
    { field: 'purpose', headerName: 'Purpose', width: 200 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip label={getStatusLabel(params.value)} color={getStatusColor(params.value)} size="small" />
      ),
    },
    {
      field: 'isWalkIn',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        params.value ? (
          <Chip 
            icon={<WalkInIcon />}
            label="Walk-in" 
            color="warning" 
            size="small"
            variant="outlined"
          />
        ) : null
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Appointments</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<RefreshIcon />} onClick={() => {
            loadAppointments();
            loadWalkIns();
          }}>
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<EmergencyIcon />}
            onClick={() => setOpenEmergencyDialog(true)}
          >
            Emergency Cancel
          </Button>
          <Button 
            variant="outlined" 
            color="warning"
            startIcon={<WalkInIcon />} 
            onClick={() => setOpenWalkInDialog(true)}
          >
            Walk-In Patient
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
            Schedule Appointment
          </Button>
        </Box>
      </Box>

      {/* Tabs for Scheduled vs Walk-ins */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label={`Scheduled (${totalCount})`} />
          <Tab 
            label={
              <Badge badgeContent={walkInCount} color="warning" max={99}>
                <Box sx={{ pr: walkInCount > 0 ? 2 : 0 }}>Today's Walk-ins</Box>
              </Badge>
            }
          />
        </Tabs>
      </Box>

      {/* Appointments Table */}
      {currentTab === 0 && (
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={appointments}
            columns={columns}
            loading={loading}
            rowCount={totalCount}
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </Paper>
      )}

      {/* Walk-ins Table */}
      {currentTab === 1 && (
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={walkIns}
            columns={columns}
            loading={loading}
            paginationMode="client"
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Paper>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Patient"
                name="patientId"
                select
                value={formik.values.patientId ?? ''}
                onChange={formik.handleChange}
                error={formik.touched.patientId && Boolean(formik.errors.patientId)}
                helperText={formik.touched.patientId && formik.errors.patientId}
                required
              >
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Doctor"
                name="dentistId"
                select
                value={formik.values.dentistId ?? ''}
                onChange={formik.handleChange}
                error={formik.touched.dentistId && Boolean(formik.errors.dentistId)}
                helperText={formik.touched.dentistId && formik.errors.dentistId}
                required
              >
                {dentists.map((dentist) => (
                  <MenuItem key={dentist.id} value={dentist.id}>
                    {dentist.fullName} - {dentist.specialization || 'General'}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Appointment Date"
                name="appointmentDate"
                type="date"
                value={formik.values.appointmentDate ?? ''}
                onChange={formik.handleChange}
                error={formik.touched.appointmentDate && Boolean(formik.errors.appointmentDate)}
                helperText={formik.touched.appointmentDate && formik.errors.appointmentDate}
                InputLabelProps={{ shrink: true }}
                required
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Start Time"
                  name="startTime"
                  type="time"
                  value={formik.values.startTime ?? ''}
                  onChange={formik.handleChange}
                  error={formik.touched.startTime && Boolean(formik.errors.startTime)}
                  helperText={formik.touched.startTime && formik.errors.startTime}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  label="End Time"
                  name="endTime"
                  type="time"
                  value={formik.values.endTime ?? ''}
                  onChange={formik.handleChange}
                  error={formik.touched.endTime && Boolean(formik.errors.endTime)}
                  helperText={formik.touched.endTime && formik.errors.endTime}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Box>

              <TextField
                label="Purpose"
                name="purpose"
                value={formik.values.purpose ?? ''}
                onChange={formik.handleChange}
                error={formik.touched.purpose && Boolean(formik.errors.purpose)}
                helperText={formik.touched.purpose && formik.errors.purpose}
                required
              />

              <TextField
                label="Notes"
                name="notes"
                value={formik.values.notes ?? ''}
                onChange={formik.handleChange}
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">Schedule</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Walk-In Dialog */}
      <Dialog open={openWalkInDialog} onClose={handleCloseWalkInDialog} maxWidth="sm" fullWidth>
        <form onSubmit={walkInFormik.handleSubmit}>
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}>
            <WalkInIcon />
            Register Walk-In Patient
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'warning.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'warning.main',
              }}>
                <Typography variant="body2" color="warning.dark">
                  🚶 Walk-in patients are registered immediately for today with current time.
                </Typography>
              </Box>

              <TextField
                label="Patient"
                name="patientId"
                select
                value={walkInFormik.values.patientId ?? ''}
                onChange={walkInFormik.handleChange}
                error={walkInFormik.touched.patientId && Boolean(walkInFormik.errors.patientId)}
                helperText={walkInFormik.touched.patientId && walkInFormik.errors.patientId}
                required
              >
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Doctor"
                name="dentistId"
                select
                value={walkInFormik.values.dentistId ?? ''}
                onChange={walkInFormik.handleChange}
                error={walkInFormik.touched.dentistId && Boolean(walkInFormik.errors.dentistId)}
                helperText={walkInFormik.touched.dentistId && walkInFormik.errors.dentistId}
                required
              >
                {dentists.map((dentist) => (
                  <MenuItem key={dentist.id} value={dentist.id}>
                    {dentist.fullName} - {dentist.specialization || 'General'}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Purpose (Optional)"
                name="purpose"
                placeholder="e.g., Toothache, Emergency consultation"
                value={walkInFormik.values.purpose ?? ''}
                onChange={walkInFormik.handleChange}
              />

              <TextField
                label="Notes (Optional)"
                name="notes"
                value={walkInFormik.values.notes ?? ''}
                onChange={walkInFormik.handleChange}
                multiline
                rows={3}
                placeholder="Any additional information..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseWalkInDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="warning"
              startIcon={<WalkInIcon />}
            >
              Register Walk-In
            </Button>
          </DialogActions>
        </form>
      </Dialog>
          {/* Emergency Cancel Dialog */}
          <Dialog open={openEmergencyDialog} onClose={() => setOpenEmergencyDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmergencyIcon />
              Emergency Appointment Cancellation
            </DialogTitle>
            <DialogContent>
              <Box sx={{ p: 1.5, mt: 1, mb: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.light', borderRadius: 1 }}>
                <Typography variant="body2" color="error.dark">
                  🚨 This will cancel ALL active appointments (Scheduled, Confirmed, Checked-In) for the selected doctor on the chosen date. This action cannot be undone.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Doctor"
                  select
                  fullWidth
                  value={emergencyDoctorId}
                  onChange={(e) => setEmergencyDoctorId(e.target.value)}
                  required
                >
                  {dentists.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.fullName} — {d.specialization || 'General'}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  value={emergencyDate}
                  onChange={(e) => setEmergencyDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  label="Reason for Emergency Cancellation"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="e.g. Doctor is in emergency surgery and unavailable for the rest of the day."
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  required
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenEmergencyDialog(false)} disabled={emergencyLoading}>Cancel</Button>
              <Button
                variant="contained"
                color="error"
                startIcon={emergencyLoading ? null : <EmergencyIcon />}
                onClick={handleEmergencyCancel}
                disabled={emergencyLoading || !emergencyDoctorId || !emergencyDate || !emergencyReason.trim()}
              >
                {emergencyLoading ? 'Cancelling...' : 'Cancel All Appointments'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    };

    export default Appointments;
