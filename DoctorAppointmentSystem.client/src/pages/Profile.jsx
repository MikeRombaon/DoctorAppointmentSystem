import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        My Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Name: {user?.fullName}</Typography>
        <Typography>Email: {user?.email}</Typography>
        <Typography>Role: {user?.role}</Typography>
      </Paper>
    </Box>
  );
};

export default Profile;
