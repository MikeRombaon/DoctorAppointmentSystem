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
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import userService, { UserRoles, RoleDisplayInfo, getRoleDisplayName } from '../services/userService';

const validationSchema = yup.object({
  fullName: yup.string().required('Full name is required').max(200),
  email: yup.string().email('Invalid email').required('Email is required'),
  phoneNumber: yup.string().required('Phone number is required'),
  role: yup.string().required('Role is required'),
  password: yup.string().when('isNew', {
    is: true,
    then: (schema) => schema.required('Password is required').min(8, 'Password must be at least 8 characters'),
  }),
});

// New 5-role system with descriptions
const roles = [
  { 
    value: UserRoles.SuperAdmin, 
    label: RoleDisplayInfo.SuperAdmin.name,
    description: RoleDisplayInfo.SuperAdmin.description,
    icon: RoleDisplayInfo.SuperAdmin.icon
  },
  { 
    value: UserRoles.Admin, 
    label: RoleDisplayInfo.Admin.name,
    description: RoleDisplayInfo.Admin.description,
    icon: RoleDisplayInfo.Admin.icon
  },
  { 
    value: UserRoles.ClinicalStaff, 
    label: RoleDisplayInfo.ClinicalStaff.name,
    description: RoleDisplayInfo.ClinicalStaff.description,
    icon: RoleDisplayInfo.ClinicalStaff.icon
  },
  { 
    value: UserRoles.SupportStaff, 
    label: RoleDisplayInfo.SupportStaff.name,
    description: RoleDisplayInfo.SupportStaff.description,
    icon: RoleDisplayInfo.SupportStaff.icon
  },
  { 
    value: UserRoles.Patient, 
    label: RoleDisplayInfo.Patient.name,
    description: RoleDisplayInfo.Patient.description,
    icon: RoleDisplayInfo.Patient.icon
  },
];

const roleColors = {
  SuperAdmin: 'error',
  Admin: 'error',
  ClinicalStaff: 'primary',
  SupportStaff: 'success',
  Patient: 'secondary',
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      role: '',
      specialization: '',
      licenseNumber: '',
      password: '',
      isActive: true,
      isNew: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const { isNew: _isNew, ...submitData } = values; // isNew removed from API payload
        if (editingUser) {
          await userService.update(editingUser.id, submitData);
          toast.success('User updated successfully');
        } else {
          await userService.create(submitData);
          toast.success('User created successfully');
        }
        handleCloseDialog();
        loadUsers();
      } catch (error) {
        console.error('Error saving user:', error);
        toast.error(error.response?.data?.message || 'Error saving user');
      }
    },
  });

  useEffect(() => {
    loadUsers();
  }, [page, pageSize]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAll(page + 1, pageSize);
      setUsers(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      formik.setValues({
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role || '',
        specialization: user.specialization || '',
        licenseNumber: user.licenseNumber || '',
        password: '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        isNew: false,
      });
    } else {
      setEditingUser(null);
      formik.resetForm();
      formik.setFieldValue('isNew', true);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    formik.resetForm();
  };

  const handleToggleActive = async (id, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        await userService.toggleActive(id);
        toast.success(`User ${action}d successfully`);
        loadUsers();
      } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        toast.error(`Error ${action}ing user`);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await userService.delete(id);
        toast.success('User deleted successfully');
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Error deleting user');
      }
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'fullName', headerName: 'Full Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phoneNumber', headerName: 'Phone', width: 140 },
    {
      field: 'role',
      headerName: 'Role',
      width: 180,
      renderCell: (params) => {
        const roleInfo = RoleDisplayInfo[params.value];
        return (
          <Tooltip title={roleInfo?.description || ''} arrow>
            <Chip
              label={`${roleInfo?.icon || ''} ${getRoleDisplayName(params.value)}`}
              color={roleColors[params.value] || 'default'}
              size="small"
            />
          </Tooltip>
        );
      },
    },
    { field: 'specialization', headerName: 'Specialization', width: 150 },
    { field: 'licenseNumber', headerName: 'License No.', width: 140 },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
          icon={params.value ? <CheckCircleIcon /> : <BlockIcon />}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Button size="small" onClick={() => handleOpenDialog(params.row)}>
            Edit
          </Button>
          <Button
            size="small"
            color={params.row.isActive ? 'warning' : 'success'}
            onClick={() => handleToggleActive(params.row.id, params.row.isActive)}
          >
            {params.row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="small" color="error" onClick={() => handleDelete(params.row.id)}>
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Staff Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          New User
        </Button>
      </Box>

      <DataGrid
        rows={users}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'New User'}</DialogTitle>
        <form onSubmit={formik.handleSubmit} autoComplete="off">
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="fullName"
                  value={formik.values.fullName}
                  onChange={formik.handleChange}
                  error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                  helperText={formik.touched.fullName && formik.errors.fullName}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email"
                  name="email"
                  autoComplete="new-password"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phoneNumber"
                  value={formik.values.phoneNumber}
                  onChange={formik.handleChange}
                  error={formik.touched.phoneNumber && Boolean(formik.errors.phoneNumber)}
                  helperText={formik.touched.phoneNumber && formik.errors.phoneNumber}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="role"
                    value={formik.values.role}
                    onChange={formik.handleChange}
                    error={formik.touched.role && Boolean(formik.errors.role)}
                    label="Role"
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{role.icon}</span>
                            <Typography variant="body1">{role.label}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {role.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Specialization"
                  name="specialization"
                  value={formik.values.specialization}
                  onChange={formik.handleChange}
                  placeholder="e.g., Orthodontics, Pediatrics"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="License / PRC Number"
                  name="licenseNumber"
                  value={formik.values.licenseNumber}
                  onChange={formik.handleChange}
                  placeholder="e.g., 0123456"
                />
              </Grid>
              {!editingUser && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Password"
                    name="password"
                    autoComplete="new-password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    error={formik.touched.password && Boolean(formik.errors.password)}
                    helperText={formik.touched.password && formik.errors.password}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.isActive}
                      onChange={(e) => formik.setFieldValue('isActive', e.target.checked)}
                      name="isActive"
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Users;
