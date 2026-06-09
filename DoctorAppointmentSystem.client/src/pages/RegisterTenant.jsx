import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress,
  InputAdornment, IconButton, Divider, Paper, Stepper, Step, StepLabel,
  Chip, Tabs, Tab,
} from '@mui/material';
import bpiQr from '../assets/bpi-qr.png';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../services/api';

const BRAND = {
  primary: '#1a5eb8',
  primaryDark: '#134a94',
  primaryLight: '#e8f0fc',
  accent: '#f0a500',
  bg: '#f7f8fc',
};

const STEPS = ['Clinic Information', 'Admin Account', 'Subscription'];



const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#fff',
    fontSize: '0.95rem',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: BRAND.primary },
    '&.Mui-focused fieldset': { borderColor: BRAND.primary, borderWidth: 1.5 },
  },
};

const Field = ({ label, children }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', mb: 0.75 }}>
      {label}
    </Typography>
    {children}
  </Box>
);

export default function RegisterTenant() {
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentMode, setPaymentMode] = useState('trial'); // 'qr' | 'trial'
  const [qrRef, setQrRef] = useState('');

  const [form, setForm] = useState({
    clinicName: '', slug: '', phone: '', address: '', city: '', country: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '', confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'slug') v = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setForm((p) => ({ ...p, [name]: v }));
    setError('');
  };

  const handleClinicNameChange = (e) => {
    const name = e.target.value;
    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm((p) => ({
      ...p,
      clinicName: name,
      slug: p.slug === '' || p.slug === p.clinicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        ? autoSlug : p.slug,
    }));
    setError('');
  };

  const validateStep0 = () => {
    if (!form.clinicName.trim()) return 'Clinic name is required.';
    if (!form.slug.trim()) return 'URL slug is required.';
    if (!/^[a-z0-9-]+$/.test(form.slug)) return 'Slug may only contain lowercase letters, numbers, and hyphens.';
    return null;
  };

  const validateStep1 = () => {
    if (!form.adminFirstName.trim()) return 'First name is required.';
    if (!form.adminLastName.trim()) return 'Last name is required.';
    if (!form.adminEmail.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) return 'Enter a valid email address.';
    if (form.adminPassword.length < 8) return 'Password must be at least 8 characters.';
    if (form.adminPassword !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const validateStep2 = () => null; // trial only — no payment required

  const handleNext0 = () => { const e = validateStep0(); if (e) { setError(e); return; } setActiveStep(1); };
  const handleNext1 = () => { const e = validateStep1(); if (e) { setError(e); return; } setActiveStep(2); };
  const handleBack  = (to) => { setActiveStep(to); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const qrPaid = paymentMode === 'qr' && qrRef.trim().length > 0;
      await api.post('/tenants/register', {
        clinicName:    form.clinicName,
        slug:          form.slug,
        phone:         form.phone,
        address:       form.address,
        city:          form.city,
        country:       form.country,
        adminFirstName: form.adminFirstName,
        adminLastName:  form.adminLastName,
        adminEmail:     form.adminEmail,
        adminPassword:  form.adminPassword,
        cardBrand:            qrPaid ? 'QR' : null,
        transactionReference: qrPaid ? qrRef.trim() : null,
      });
      const msg = qrPaid
        ? 'Registration successful! QR payment reference recorded. Sign in to get started.'
        : 'Clinic registered! Your 14-day free trial has started. Sign in to get started.';
      toast.success(msg);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabelSx = {
    '& .MuiStepLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
    '& .MuiStepIcon-root.Mui-active': { color: BRAND.primary },
    '& .MuiStepIcon-root.Mui-completed': { color: BRAND.primary },
  };

  const backBtn = (to) => (
    <Button fullWidth variant="outlined" onClick={() => handleBack(to)}
      startIcon={<ArrowBackIcon />} disabled={loading}
      sx={{ py: 1.4, borderRadius: '10px', textTransform: 'none', fontWeight: 600,
            borderColor: '#e2e8f0', color: '#4a5568',
            '&:hover': { borderColor: BRAND.primary, color: BRAND.primary } }}>
      Back
    </Button>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BRAND.bg, display: 'flex', alignItems: 'flex-start',
               justifyContent: 'center', py: 6, px: 2 }}>
      <Box sx={{ width: '100%', maxWidth: activeStep === 2 ? 680 : 560 }}>

        {/* Brand header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: BRAND.primaryLight,
                     display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
            🏥
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: BRAND.primary, fontSize: '1.1rem', lineHeight: 1 }}>
              Doctor Appointment System
            </Typography>
            <Typography sx={{ color: '#718096', fontSize: '0.78rem' }}>Clinic Registration</Typography>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a202c', mb: 0.5 }}>
            Register your clinic
          </Typography>
          <Typography sx={{ color: '#718096', fontSize: '0.9rem', mb: 3 }}>
            Set up your clinic account and get started in minutes.
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel sx={stepLabelSx}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          {/* ── Step 0: Clinic Information ─────────────────────────────── */}
          {activeStep === 0 && (
            <Box>
              <Field label="Clinic / Organisation Name *">
                <TextField fullWidth required name="clinicName" size="small"
                  placeholder="e.g. Sunrise Family Clinic"
                  value={form.clinicName} onChange={handleClinicNameChange} sx={inputSx}
                  InputProps={{ startAdornment: <InputAdornment position="start"><BusinessOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} /></InputAdornment> }}
                />
              </Field>
              <Field label="URL Slug *">
                <TextField fullWidth required name="slug" size="small"
                  placeholder="e.g. sunrise-family-clinic"
                  value={form.slug} onChange={handleChange} sx={inputSx}
                  helperText="Used to identify your clinic. Lowercase letters, numbers, and hyphens only."
                  InputProps={{ startAdornment: <InputAdornment position="start"><LinkOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} /></InputAdornment> }}
                />
              </Field>
              <Field label="Phone">
                <TextField fullWidth name="phone" size="small" placeholder="+63 917 000 1234"
                  value={form.phone} onChange={handleChange} sx={inputSx}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PhoneOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} /></InputAdornment> }}
                />
              </Field>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Field label="City">
                  <TextField fullWidth name="city" size="small" placeholder="Manila"
                    value={form.city} onChange={handleChange} sx={inputSx} />
                </Field>
                <Field label="Country">
                  <TextField fullWidth name="country" size="small" placeholder="Philippines"
                    value={form.country} onChange={handleChange} sx={inputSx} />
                </Field>
              </Box>
              <Field label="Address">
                <TextField fullWidth name="address" size="small" placeholder="123 Main St"
                  value={form.address} onChange={handleChange} sx={inputSx} />
              </Field>
              <Button fullWidth variant="contained" onClick={handleNext0}
                sx={{ mt: 1, py: 1.4, borderRadius: '10px', textTransform: 'none',
                      fontWeight: 600, fontSize: '0.95rem', bgcolor: BRAND.primary,
                      boxShadow: '0 4px 14px rgba(26,94,184,0.35)',
                      '&:hover': { bgcolor: BRAND.primaryDark } }}>
                Continue
              </Button>
            </Box>
          )}

          {/* ── Step 1: Admin Account ──────────────────────────────────── */}
          {activeStep === 1 && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Field label="First Name *">
                  <TextField fullWidth required name="adminFirstName" size="small" placeholder="Juan"
                    value={form.adminFirstName} onChange={handleChange} sx={inputSx}
                    InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineIcon sx={{ fontSize: 18, color: '#a0aec0' }} /></InputAdornment> }}
                  />
                </Field>
                <Field label="Last Name *">
                  <TextField fullWidth required name="adminLastName" size="small" placeholder="Dela Cruz"
                    value={form.adminLastName} onChange={handleChange} sx={inputSx} />
                </Field>
              </Box>
              <Field label="Email Address *">
                <TextField fullWidth required name="adminEmail" type="email" size="small"
                  placeholder="admin@yourclinic.com"
                  value={form.adminEmail} onChange={handleChange} sx={inputSx}
                  InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} /></InputAdornment> }}
                />
              </Field>
              <Field label="Password *">
                <TextField fullWidth required name="adminPassword" size="small"
                  type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
                  value={form.adminPassword} onChange={handleChange} sx={inputSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPass(!showPass)} edge="end">
                          {showPass ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <Field label="Confirm Password *">
                <TextField fullWidth required name="confirmPassword" size="small"
                  type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={handleChange} sx={inputSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowConfirm(!showConfirm)} edge="end">
                          {showConfirm ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                {backBtn(0)}
                <Button fullWidth variant="contained" onClick={handleNext1}
                  sx={{ py: 1.4, borderRadius: '10px', textTransform: 'none',
                        fontWeight: 600, fontSize: '0.95rem', bgcolor: BRAND.primary,
                        boxShadow: '0 4px 14px rgba(26,94,184,0.35)',
                        '&:hover': { bgcolor: BRAND.primaryDark } }}>
                  Continue
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Step 2: Payment / Subscription ────────────────────────── */}
          {activeStep === 2 && (
            <Box component="form" onSubmit={handleSubmit} noValidate>

              {/* Pricing summary bar */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                         bgcolor: BRAND.primaryLight, borderRadius: '10px', px: 2, py: 1.25, mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.85rem', color: '#2d3748' }}>
                  Monthly Subscription
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: BRAND.primary }}>
                  $100
                  <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 400, color: '#718096', ml: 0.5 }}>
                    / month
                  </Typography>
                </Typography>
              </Box>

              {/* Payment mode tabs */}
              <Tabs
                value={paymentMode}
                onChange={(_, v) => { setPaymentMode(v); setQrRef(''); setError(''); }}
                sx={{ mb: 2.5, borderBottom: '1px solid #e2e8f0',
                      '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
                      '& .Mui-selected': { color: BRAND.primary },
                      '& .MuiTabs-indicator': { bgcolor: BRAND.primary } }}
              >
                <Tab value="qr" label="📱  Pay via QR Code" />
                <Tab value="trial" label="🎁  Start Free Trial" />
              </Tabs>

              {/* ── QR tab ── */}
              {paymentMode === 'qr' && (
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', color: '#4a5568', mb: 2 }}>
                    Scan the QR code below with your GCash, Maya, or banking app to pay the first month.
                    After payment, enter your reference number to confirm.
                  </Typography>

                  {/* QR code */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
                    <Box sx={{ p: 2, bgcolor: '#fff', border: '2px solid #e2e8f0',
                               borderRadius: '16px', display: 'inline-flex', flexDirection: 'column',
                               alignItems: 'center', gap: 1.5 }}>
                      <img src={bpiQr} alt="BPI InstaPay QR" style={{ width: 180, height: 180, objectFit: 'contain' }} />
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 700, color: '#1a202c', fontSize: '0.9rem' }}>
                          Doctor Appointment System
                        </Typography>
                        <Typography sx={{ color: '#718096', fontSize: '0.75rem' }}>Amount: $100.00 USD</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Reference number */}
                  <Field label="Payment Reference Number *">
                    <TextField
                      fullWidth size="small"
                      placeholder="e.g. GCash ref: 1234567890"
                      value={qrRef}
                      onChange={(e) => { setQrRef(e.target.value); setError(''); }}
                      sx={inputSx}
                      helperText="Enter the reference number shown in your payment app after a successful transfer."
                    />
                  </Field>

                  <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.82rem' }}>
                    Your account will be activated once payment is verified by our team (usually within a few hours).
                    You can start using the system immediately on a 14-day trial while we confirm.
                  </Alert>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {backBtn(1)}
                    <Button type="submit" fullWidth variant="contained" disabled={loading || !qrRef.trim()}
                      sx={{ py: 1.4, borderRadius: '10px', textTransform: 'none',
                            fontWeight: 600, fontSize: '0.95rem', bgcolor: BRAND.primary,
                            boxShadow: '0 4px 14px rgba(26,94,184,0.35)',
                            '&:hover': { bgcolor: BRAND.primaryDark },
                            '&:disabled': { bgcolor: '#cbd5e0' } }}>
                      {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Confirm Payment & Register'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* ── Trial tab ── */}
              {paymentMode === 'trial' && (
                <Box>
                  <Box sx={{ border: `2px solid ${BRAND.primary}`, borderRadius: '14px', p: 3, mb: 3,
                             bgcolor: BRAND.primaryLight, position: 'relative' }}>
                    <Chip label="No credit card needed" size="small"
                      sx={{ position: 'absolute', top: -11, left: 16, bgcolor: BRAND.primary,
                            color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: BRAND.primary, fontSize: '1.05rem' }}>
                        14-Day Free Trial
                      </Typography>
                      <CheckCircleIcon sx={{ color: BRAND.primary, fontSize: 22 }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: '#1a202c' }}>$0</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#718096' }}>for 14 days, then $100/month</Typography>
                    </Box>
                    {[
                      'Full access to all features during the trial',
                      'No credit card required to start',
                      'Pay via QR before trial ends to keep access',
                      'Email reminder 14 days before expiry',
                    ].map((f) => (
                      <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
                        <CheckCircleIcon sx={{ fontSize: 13, color: BRAND.primary, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#2d3748' }}>{f}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Alert severity="success" sx={{ mb: 3, borderRadius: 2, fontSize: '0.875rem' }}>
                    Your 14-day free trial starts immediately — no payment required now.
                  </Alert>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {backBtn(1)}
                    <Button type="submit" fullWidth variant="contained" disabled={loading}
                      sx={{ py: 1.4, borderRadius: '10px', textTransform: 'none',
                            fontWeight: 600, fontSize: '0.95rem', bgcolor: BRAND.primary,
                            boxShadow: '0 4px 14px rgba(26,94,184,0.35)',
                            '&:hover': { bgcolor: BRAND.primaryDark },
                            '&:disabled': { bgcolor: '#cbd5e0' } }}>
                      {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Start Free Trial'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography sx={{ textAlign: 'center', color: '#718096', fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: BRAND.primary, fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </Typography>

          <Box sx={{ mt: 2.5, p: 2, bgcolor: '#f0f4ff', borderRadius: 2, border: '1px solid #d0ddf7' }}>
            <Typography sx={{ textAlign: 'center', color: '#4a5568', fontSize: '0.82rem', lineHeight: 1.8 }}>
              Need a demo or support?{' '}
              <Box component="span" sx={{ display: { xs: 'block', sm: 'inline' } }}>
                Email us at{' '}
                <a
                  href="mailto:mikromtelsupplies@gmail.com"
                  style={{ color: BRAND.primary, fontWeight: 600, textDecoration: 'none' }}
                >
                  mikromtelsupplies@gmail.com
                </a>
              </Box>
              {' '}or visit{' '}
              <a
                href="https://mikromsolutions.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: BRAND.primary, fontWeight: 600, textDecoration: 'none' }}
              >
                mikromsolutions.com
              </a>
            </Typography>
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', mt: 3, color: '#a0aec0', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} Doctor Appointment System · Secure &amp; RBAC Protected
        </Typography>
      </Box>
    </Box>
  );
}
