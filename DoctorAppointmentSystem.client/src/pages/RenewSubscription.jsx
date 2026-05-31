import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress,
  Paper, Divider, InputAdornment, Stepper, Step, StepLabel,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import qrphPayment from '../assets/qrph-payment.png';
import { toast } from 'react-toastify';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../services/api';

const BRAND = {
  primary: '#1a5eb8',
  primaryDark: '#134a94',
  primaryLight: '#e8f0fc',
  bg: '#f7f8fc',
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#fff',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: BRAND.primary },
    '&.Mui-focused fieldset': { borderColor: BRAND.primary, borderWidth: 1.5 },
  },
};

const STEPS = ['Enter Email', 'Scan & Pay', 'Confirm'];

export default function RenewSubscription() {
  const location = useLocation();
  const prefillEmail = location.state?.email ?? '';

  const [activeStep, setActiveStep] = useState(prefillEmail ? 1 : 0);
  const [email, setEmail]           = useState(prefillEmail);
  const [qrRef, setQrRef]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [done, setDone]             = useState(false);
  const [clinicName, setClinicName] = useState('');

  const stepLabelSx = {
    '& .MuiStepLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
    '& .MuiStepIcon-root.Mui-active':    { color: BRAND.primary },
    '& .MuiStepIcon-root.Mui-completed': { color: BRAND.primary },
  };

  const handleNext0 = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setActiveStep(1);
  };

  const handleSubmit = async () => {
    if (!qrRef.trim()) { setError('Please enter your payment reference number.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/tenants/renew', {
        email:            email.trim(),
        paymentReference: qrRef.trim(),
      });
      setClinicName(res.data.clinicName ?? '');
      setDone(true);
      setActiveStep(2);
      toast.success('Renewal submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Renewal failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BRAND.bg, display: 'flex',
               alignItems: 'flex-start', justifyContent: 'center', py: 6, px: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 520 }}>

        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: BRAND.primaryLight,
                     display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
            🏥
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: BRAND.primary, fontSize: '1.1rem', lineHeight: 1 }}>
              Doctor Appointment System
            </Typography>
            <Typography sx={{ color: '#718096', fontSize: '0.78rem' }}>Subscription Renewal</Typography>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a202c', mb: 0.5 }}>
            Renew Your Subscription
          </Typography>
          <Typography sx={{ color: '#718096', fontSize: '0.9rem', mb: 3 }}>
            Scan the QR Ph code, pay <strong>₱1,000</strong>, then submit your reference number to restore access.
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel sx={stepLabelSx}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          {/* ── Step 0: Email ── */}
          {activeStep === 0 && (
            <Box>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', mb: 0.75 }}>
                Admin Email Address *
              </Typography>
              <TextField
                fullWidth size="small"
                placeholder="admin@yourclinic.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                sx={{ mb: 3, ...inputSx }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button fullWidth variant="contained" onClick={handleNext0}
                sx={{ py: 1.4, borderRadius: '10px', textTransform: 'none',
                      fontWeight: 600, fontSize: '0.95rem', bgcolor: BRAND.primary,
                      boxShadow: '0 4px 14px rgba(26,94,184,0.35)',
                      '&:hover': { bgcolor: BRAND.primaryDark } }}>
                Continue
              </Button>
            </Box>
          )}

          {/* ── Step 1: Scan & pay ── */}
          {activeStep === 1 && !done && (
            <Box>
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2, fontSize: '0.85rem' }}>
                Scan the QR Ph code below using your banking app, GCash, Maya, or any e-wallet.
                Transfer exactly <strong>₱1,000</strong>, then enter the reference number you receive.
              </Alert>

              {/* QR Code */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box sx={{ p: 2.5, bgcolor: '#fff', border: '2px solid #e2e8f0',
                           borderRadius: '16px', display: 'inline-flex',
                           flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                  <img src={qrphPayment} alt="QR Ph Payment" style={{ width: 220, height: 220, objectFit: 'contain' }} />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: '#1a202c', fontSize: '0.9rem' }}>
                      Doctor Appointment System
                    </Typography>
                    <Typography sx={{ color: '#718096', fontSize: '0.78rem' }}>
                      Monthly Renewal — ₱1,000.00
                    </Typography>
                    <Typography sx={{ color: '#a0aec0', fontSize: '0.72rem', mt: 0.25 }}>
                      {email}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Reference number */}
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', mb: 0.75 }}>
                Payment Reference Number *
              </Typography>
              <TextField
                fullWidth size="small"
                placeholder="e.g. GCash ref: 1234567890"
                value={qrRef}
                onChange={(e) => { setQrRef(e.target.value); setError(''); }}
                helperText="Enter the reference number shown in your payment app after a successful transfer."
                sx={{ mb: 3, ...inputSx }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button fullWidth variant="outlined" onClick={() => { setActiveStep(0); setError(''); }}
                  sx={{ py: 1.4, borderRadius: '10px', textTransform: 'none', fontWeight: 600,
                        borderColor: '#e2e8f0', color: '#4a5568',
                        '&:hover': { borderColor: BRAND.primary, color: BRAND.primary } }}>
                  Back
                </Button>
                <Button fullWidth variant="contained" onClick={handleSubmit}
                  disabled={loading || !qrRef.trim()}
                  sx={{ py: 1.4, borderRadius: '10px', textTransform: 'none',
                        fontWeight: 600, fontSize: '0.95rem', bgcolor: BRAND.primary,
                        boxShadow: '0 4px 14px rgba(26,94,184,0.35)',
                        '&:hover': { bgcolor: BRAND.primaryDark },
                        '&:disabled': { bgcolor: '#cbd5e0' } }}>
                  {loading
                    ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                    : 'Submit & Renew'}
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Step 2: Done ── */}
          {activeStep === 2 && done && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: '#38a169', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a202c', mb: 1 }}>
                Renewal Submitted!
              </Typography>
              {clinicName && (
                <Typography sx={{ color: '#4a5568', mb: 1 }}>
                  Clinic: <strong>{clinicName}</strong>
                </Typography>
              )}
              <Typography sx={{ color: '#718096', fontSize: '0.9rem', mb: 3 }}>
                Your subscription has been extended by <strong>30 days</strong>.
                Our team will verify your payment reference and confirm shortly.
                You can log in now.
              </Typography>
              <Button component={Link} to="/login" variant="contained" fullWidth
                sx={{ py: 1.4, borderRadius: '10px', textTransform: 'none',
                      fontWeight: 600, bgcolor: BRAND.primary,
                      boxShadow: '0 4px 14px rgba(26,94,184,0.35)',
                      '&:hover': { bgcolor: BRAND.primaryDark } }}>
                Go to Sign In
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography sx={{ textAlign: 'center', color: '#718096', fontSize: '0.875rem' }}>
            Already renewed?{' '}
            <Link to="/login" style={{ color: BRAND.primary, fontWeight: 600, textDecoration: 'none' }}>
              Sign in →
            </Link>
          </Typography>
        </Paper>

        <Typography sx={{ textAlign: 'center', mt: 3, color: '#a0aec0', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} Doctor Appointment System · Secure &amp; RBAC Protected
        </Typography>
      </Box>
    </Box>
  );
}
