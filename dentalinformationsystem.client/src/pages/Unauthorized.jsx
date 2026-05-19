import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Lock as LockIcon } from '@mui/icons-material';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: 'center',
          maxWidth: 500,
        }}
      >
        <LockIcon
          sx={{
            fontSize: 100,
            color: 'error.main',
            mb: 2,
          }}
        />
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Access Denied
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          You don't have permission to access this page.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          If you believe this is an error, please contact your system administrator.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Unauthorized;
