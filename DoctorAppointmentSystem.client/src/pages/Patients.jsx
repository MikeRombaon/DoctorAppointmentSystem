import React, { useState, useEffect, useMemo } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
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
  InputAdornment,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  PersonAdd as NewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
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

const STAT_CARDS = (patients, totalCount) => {
  const now = new Date();
  const thisMonth = patients.filter(p => {
    const d = new Date(p.createdAt || p.dateOfBirth);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  return [
    { label: 'Total Patients', value: totalCount, icon: <PeopleIcon />, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Active', value: patients.filter(p => p.isActive).length, icon: <ActiveIcon />, color: '#10b981', bg: '#f0fdf4' },
    { label: 'Inactive', value: patients.filter(p => !p.isActive).length, icon: <InactiveIcon />, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'New This Month', value: thisMonth, icon: <NewIcon />, color: '#8b5cf6', bg: '#faf5ff' },
  ];
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#fff',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#93c5fd' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
};

const FormSection = ({ title, children }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5 }}>
      {title}
    </Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      {children}
    </Box>
  </Box>
);

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const { tenantVersion } = useSuperAdminTenant();

  const stats = useMemo(() => STAT_CARDS(patients, totalCount), [patients, totalCount]);

  const formik = useFormik({
    initialValues: {
      firstName: '', lastName: '', email: '', phoneNumber: '',
      dateOfBirth: '', gender: '', address: '', city: '',
      state: '', postalCode: '', emergencyContactName: '',
      emergencyContactPhone: '', bloodType: '', allergies: '', medicalHistory: '',
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
      } catch {
        toast.error('Error saving patient');
      }
    },
  });

  // Reset to first page and reload whenever SuperAdmin switches tenant
  useEffect(() => {
    setPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantVersion]);

  useEffect(() => { loadPatients(); }, [page, pageSize, search, tenantVersion]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await patientService.getAll(page + 1, pageSize, search);
      setPatients(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      toast.error('Error loading patients');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (patient = null) => {
    if (patient) {
      setEditingPatient(patient);
      formik.setValues({ ...patient, dateOfBirth: patient.dateOfBirth?.split('T')[0] || '' });
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
    if (window.confirm('Delete this patient? This action cannot be undone.')) {
      try {
        await patientService.delete(id);
        toast.success('Patient deleted');
        loadPatients();
      } catch {
        toast.error('Error deleting patient');
      }
    }
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 64,
      renderCell: (params) => (
        <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>#{params.value}</Typography>
      ),
    },
    {
      field: 'fullName',
      headerName: 'Patient',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {params.value?.charAt(0)}
          </Box>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography sx={{ fontSize: '0.8375rem', color: '#475569' }}>{params.value}</Typography>
      ),
    },
    {
      field: 'phoneNumber',
      headerName: 'Phone',
      width: 140,
      renderCell: (params) => (
        <Typography sx={{ fontSize: '0.8375rem', color: '#475569', fontFamily: 'monospace' }}>{params.value}</Typography>
      ),
    },
    {
      field: 'dateOfBirth',
      headerName: 'Date of Birth',
      width: 130,
      valueFormatter: (params) => new Date(params).toLocaleDateString('en-GB'),
      renderCell: (params) => (
        <Typography sx={{ fontSize: '0.8375rem', color: '#475569' }}>
          {new Date(params.value).toLocaleDateString('en-GB')}
        </Typography>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 700,
            borderRadius: '6px',
            bgcolor: params.value ? '#dcfce7' : '#fef3c7',
            color: params.value ? '#15803d' : '#b45309',
            border: `1px solid ${params.value ? '#bbf7d0' : '#fde68a'}`,
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleOpenDialog(params.row)}
              sx={{
                color: '#3b82f6',
                width: 30,
                height: 30,
                borderRadius: '7px',
                '&:hover': { background: '#eff6ff' },
              }}
            >
              <EditIcon sx={{ fontSize: '0.95rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              sx={{
                color: '#ef4444',
                width: 30,
                height: 30,
                borderRadius: '7px',
                '&:hover': { background: '#fff1f2' },
              }}
            >
              <DeleteIcon sx={{ fontSize: '0.95rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Patients
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.5 }}>
            Manage and view all registered patients
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1rem', color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 230,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontSize: '0.875rem',
                background: 'white',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#cbd5e1' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
            }}
          />
          <Tooltip title="Refresh">
            <IconButton
              onClick={loadPatients}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#475569',
                '&:hover': { background: '#f8fafc', borderColor: '#cbd5e1' },
              }}
            >
              <RefreshIcon sx={{ fontSize: '1.05rem' }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              px: 2.25,
              py: 0.875,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 12px rgba(59,130,246,0.45)',
              },
            }}
          >
            Add Patient
          </Button>
        </Box>
      </Box>

      {/* ── Stat Cards ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        {stats.map((stat) => (
          <Paper
            key={stat.label}
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              border: '1px solid #e8edf2',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              transition: 'box-shadow 0.15s',
              '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.07)' },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
                '& svg': { fontSize: '1.35rem' },
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {stat.value}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, mt: 0.25 }}>
                {stat.label}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Data Table ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid #e8edf2',
          overflow: 'hidden',
          background: 'white',
        }}
      >
        <DataGrid
          rows={patients}
          columns={columns}
          loading={loading}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            border: 'none',
            fontFamily: 'inherit',
            '& .MuiDataGrid-columnHeaders': {
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              borderRadius: 0,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
            '& .MuiDataGrid-row': {
              borderBottom: '1px solid #f1f5f9',
              '&:hover': { background: '#f8fafc' },
              '&:last-child': { borderBottom: 'none' },
            },
            '& .MuiDataGrid-cell': {
              borderBottom: 'none',
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
            },
            '& .MuiDataGrid-virtualScroller': {
              minHeight: 200,
            },
          }}
        />
      </Paper>

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '18px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
            overflow: 'hidden',
          },
        }}
      >
        <form onSubmit={formik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Dialog Header */}
          <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#0f172a' }}>
                {editingPatient ? 'Edit Patient' : 'Add New Patient'}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', mt: 0.25 }}>
                {editingPatient ? 'Update patient information below' : 'Fill in the details to register a new patient'}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDialog} size="small" sx={{ color: '#94a3b8', borderRadius: '8px', '&:hover': { background: '#f1f5f9' } }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ px: 3, py: 2.5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <FormSection title="Personal Information">
              <TextField fullWidth label="First Name" name="firstName" size="small" value={formik.values.firstName} onChange={formik.handleChange}
                error={formik.touched.firstName && Boolean(formik.errors.firstName)} helperText={formik.touched.firstName && formik.errors.firstName} required sx={fieldSx} />
              <TextField fullWidth label="Last Name" name="lastName" size="small" value={formik.values.lastName} onChange={formik.handleChange}
                error={formik.touched.lastName && Boolean(formik.errors.lastName)} helperText={formik.touched.lastName && formik.errors.lastName} required sx={fieldSx} />
              <TextField fullWidth label="Date of Birth" name="dateOfBirth" type="date" size="small" value={formik.values.dateOfBirth} onChange={formik.handleChange}
                error={formik.touched.dateOfBirth && Boolean(formik.errors.dateOfBirth)} helperText={formik.touched.dateOfBirth && formik.errors.dateOfBirth}
                InputLabelProps={{ shrink: true }} required sx={fieldSx} />
              <TextField fullWidth label="Gender" name="gender" select size="small" value={formik.values.gender} onChange={formik.handleChange} sx={fieldSx}>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
                <MenuItem value="PreferNotToSay">Prefer Not To Say</MenuItem>
              </TextField>
            </FormSection>

            <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />

            <FormSection title="Contact Details">
              <TextField fullWidth label="Email" name="email" type="email" size="small" value={formik.values.email} onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)} helperText={formik.touched.email && formik.errors.email} required sx={fieldSx} />
              <TextField fullWidth label="Phone Number" name="phoneNumber" size="small" value={formik.values.phoneNumber} onChange={formik.handleChange}
                error={formik.touched.phoneNumber && Boolean(formik.errors.phoneNumber)} helperText={formik.touched.phoneNumber && formik.errors.phoneNumber} required sx={fieldSx} />
              <TextField fullWidth label="Address" name="address" size="small" value={formik.values.address} onChange={formik.handleChange}
                error={formik.touched.address && Boolean(formik.errors.address)} helperText={formik.touched.address && formik.errors.address}
                required sx={{ gridColumn: '1 / -1', ...fieldSx }} />
              <TextField fullWidth label="City" name="city" size="small" value={formik.values.city} onChange={formik.handleChange}
                error={formik.touched.city && Boolean(formik.errors.city)} helperText={formik.touched.city && formik.errors.city} required sx={fieldSx} />
              <TextField fullWidth label="State / Province" name="state" size="small" value={formik.values.state} onChange={formik.handleChange} sx={fieldSx} />
              <TextField fullWidth label="Postal Code" name="postalCode" size="small" value={formik.values.postalCode} onChange={formik.handleChange}
                error={formik.touched.postalCode && Boolean(formik.errors.postalCode)} helperText={formik.touched.postalCode && formik.errors.postalCode} required sx={fieldSx} />
              <TextField fullWidth label="Blood Type" name="bloodType" size="small" value={formik.values.bloodType} onChange={formik.handleChange} sx={fieldSx} />
            </FormSection>

            <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />

            <FormSection title="Emergency Contact">
              <TextField fullWidth label="Contact Name" name="emergencyContactName" size="small" value={formik.values.emergencyContactName} onChange={formik.handleChange} sx={fieldSx} />
              <TextField fullWidth label="Contact Phone" name="emergencyContactPhone" size="small" value={formik.values.emergencyContactPhone} onChange={formik.handleChange} sx={fieldSx} />
            </FormSection>

            <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />

            <Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5 }}>
                Medical Notes
              </Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField fullWidth label="Allergies" name="allergies" size="small" value={formik.values.allergies} onChange={formik.handleChange} multiline rows={2} sx={fieldSx} />
                <TextField fullWidth label="Medical History" name="medicalHistory" size="small" value={formik.values.medicalHistory} onChange={formik.handleChange} multiline rows={3} sx={fieldSx} />
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9', gap: 1.25, flexShrink: 0 }}>
            <Button
              onClick={handleCloseDialog}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                color: '#64748b',
                border: '1px solid #e2e8f0',
                px: 2.5,
                '&:hover': { background: '#f8fafc' },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                px: 2.5,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
              }}
            >
              {editingPatient ? 'Save Changes' : 'Register Patient'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Patients;
