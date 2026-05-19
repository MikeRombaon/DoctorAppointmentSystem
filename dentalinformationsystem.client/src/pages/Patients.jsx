import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import patientService from '../services/patientService';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phoneNumber: Yup.string().required('Phone is required'),
  dateOfBirth: Yup.date().required('Date of birth is required'),
  address: Yup.string().required('Address is required'),
  city: Yup.string().required('City is required'),
  postalCode: Yup.string().required('Postal code is required'),
});

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: '',
      gender: 0,
      address: '',
      city: '',
      state: '',
      postalCode: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      bloodType: '',
      allergies: '',
      medicalHistory: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (editingPatient) {
          await patientService.update(editingPatient.id, values);
          toast.success('Patient updated successfully');
        } else {
          await patientService.create(values);
          toast.success('Patient created successfully');
        }
        handleCloseDialog();
        loadPatients();
      } catch (error) {
        console.error('Error saving patient:', error);
        toast.error('Error saving patient');
      }
    },
  });

  useEffect(() => {
    loadPatients();
  }, [page, pageSize, search]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await patientService.getAll(page + 1, pageSize, search);
      setPatients(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Error loading patients');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (patient = null) => {
    if (patient) {
      setEditingPatient(patient);
      formik.setValues({
        ...patient,
        dateOfBirth: patient.dateOfBirth?.split('T')[0] || '',
      });
    } else {
      setEditingPatient(null);
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPatient(null);
    formik.resetForm();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        await patientService.delete(id);
        toast.success('Patient deleted successfully');
        loadPatients();
      } catch (error) {
        console.error('Error deleting patient:', error);
        toast.error('Error deleting patient');
      }
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'fullName', headerName: 'Full Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phoneNumber', headerName: 'Phone', width: 150 },
    {
      field: 'dateOfBirth',
      headerName: 'Date of Birth',
      width: 120,
      valueFormatter: (params) => new Date(params).toLocaleDateString(),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value ? 'Active' : 'Inactive'} color={params.value ? 'success' : 'default'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)} color="primary">
            <EditIcon />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(params.row.id)} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Patients</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button startIcon={<RefreshIcon />} onClick={loadPatients}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Patient
          </Button>
        </Box>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={patients}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>{editingPatient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
              <TextField
                label="First Name"
                name="firstName"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                helperText={formik.touched.firstName && formik.errors.firstName}
                required
              />
              <TextField
                label="Last Name"
                name="lastName"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                helperText={formik.touched.lastName && formik.errors.lastName}
                required
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                required
              />
              <TextField
                label="Phone Number"
                name="phoneNumber"
                value={formik.values.phoneNumber}
                onChange={formik.handleChange}
                error={formik.touched.phoneNumber && Boolean(formik.errors.phoneNumber)}
                helperText={formik.touched.phoneNumber && formik.errors.phoneNumber}
                required
              />
              <TextField
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formik.values.dateOfBirth}
                onChange={formik.handleChange}
                error={formik.touched.dateOfBirth && Boolean(formik.errors.dateOfBirth)}
                helperText={formik.touched.dateOfBirth && formik.errors.dateOfBirth}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="Gender"
                name="gender"
                select
                value={formik.values.gender}
                onChange={formik.handleChange}
              >
                <MenuItem value={0}>Male</MenuItem>
                <MenuItem value={1}>Female</MenuItem>
                <MenuItem value={2}>Other</MenuItem>
              </TextField>
              <TextField
                label="Address"
                name="address"
                value={formik.values.address}
                onChange={formik.handleChange}
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
                required
              />
              <TextField
                label="City"
                name="city"
                value={formik.values.city}
                onChange={formik.handleChange}
                required
              />
              <TextField
                label="State"
                name="state"
                value={formik.values.state}
                onChange={formik.handleChange}
              />
              <TextField
                label="Postal Code"
                name="postalCode"
                value={formik.values.postalCode}
                onChange={formik.handleChange}
                required
              />
              <TextField
                label="Blood Type"
                name="bloodType"
                value={formik.values.bloodType}
                onChange={formik.handleChange}
              />
              <TextField
                label="Emergency Contact"
                name="emergencyContactName"
                value={formik.values.emergencyContactName}
                onChange={formik.handleChange}
              />
              <TextField
                label="Emergency Phone"
                name="emergencyContactPhone"
                value={formik.values.emergencyContactPhone}
                onChange={formik.handleChange}
              />
              <TextField
                label="Allergies"
                name="allergies"
                value={formik.values.allergies}
                onChange={formik.handleChange}
                multiline
                rows={2}
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
              />
              <TextField
                label="Medical History"
                name="medicalHistory"
                value={formik.values.medicalHistory}
                onChange={formik.handleChange}
                multiline
                rows={3}
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingPatient ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Patients;
