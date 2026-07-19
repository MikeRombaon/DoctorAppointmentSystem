import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

const BRAND = {
  primary: '#1a5eb8',
  primaryDark: '#134a94',
  primaryLight: '#e8f0fc',
  accent: '#f0a500',
  bg: '#f7f8fc',
};

const SLIDES = [
  { url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1200&q=85', caption: 'Doctor Consultations' },
  { url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&q=85', caption: 'Prescription Management' },
  { url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=85', caption: 'Lab Results & Diagnostics' },
  { url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1200&q=85', caption: 'Medicine & Pharmacy' },
  { url: 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=1200&q=85', caption: 'Patient Health Records' },
  { url: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&q=85', caption: 'Clinical Consultations' },
  { url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=1200&q=85', caption: 'Medical Laboratory' },
  { url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1200&q=85', caption: 'Compassionate Care' },
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [errorSeverity, setErrorSeverity] = useState('error'); // 'error' | 'warning'
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [slideIndex, setSlideIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setErrorSeverity('error');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrorSeverity('error');
    try {
      const userData = await login(formData.email, formData.password);
      toast.success('Welcome back!');
      navigate(userData?.role === 'Patient' ? '/portal' : '/dashboard');
    } catch (err) {
      const status  = err.response?.status;
      const data    = err.response?.data;
      const code    = data?.code;

      if (code === 'SUBSCRIPTION_EXPIRED') {
        setErrorSeverity('warning');
        setError(data.message);
      } else if (code === 'CLINIC_DEACTIVATED' || (status === 401 && data?.message?.toLowerCase().includes('deactivated'))) {
        setErrorSeverity('warning');
        setError(data.message);
      } else {
        setErrorSeverity('error');
        setError(data?.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: BRAND.bg }}>

      {/* ── Left brand panel ────────────────────────────────────────────── */}
      {!isMobile && (
        <Box
          sx={{
            width: '42%',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            px: 7,
            py: 8,
          }}
        >
          {/* Slideshow background — full-panel crossfade */}
          {SLIDES.map((slide, i) => (
            <Box
              key={slide.url}
              sx={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${slide.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: i === slideIndex ? 1 : 0,
                transition: 'opacity 1.2s ease-in-out',
              }}
            />
          ))}

          {/* Dark green overlay for text readability */}
          <Box sx={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(160deg, rgba(26,94,184,0.88) 0%, rgba(19,74,148,0.92) 100%)`,
          }} />

          {/* Decorative circles */}
          <Box sx={{
            position: 'absolute', width: 420, height: 420, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', top: -100, right: -140,
          }} />
          <Box sx={{
            position: 'absolute', width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', bottom: -80, left: -60,
          }} />

          {/* Content — sits above the overlay */}
          <Box sx={{ position: 'relative', zIndex: 1, width: '100%' }}>
            {/* Logo mark */}
            <Box
              sx={{
                width: 64, height: 64,
                borderRadius: '18px',
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                mb: 5,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              🏥
            </Box>

            <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2, mb: 2 }}>
              Doctor Appointment<br />System
            </Typography>

            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', maxWidth: 320, mb: 6 }}>
              Comprehensive healthcare management — appointments, prescriptions,
              lab results, consultations, and patient care all in one place.
            </Typography>

            {['Appointment Scheduling', 'Prescriptions & Medicines', 'Lab Results & Diagnostics', 'Consultations & Clinical Notes', 'Patient Health Records', 'Billing & Insurance'].map((f) => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRAND.accent, flexShrink: 0 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>{f}</Typography>
              </Box>
            ))}

            <Typography
              sx={{ mt: 6, color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}
            >
              © {new Date().getFullYear()} Doctor Appointment System · Secure &amp; RBAC Protected
            </Typography>

            {/* Slide indicator dots */}
            <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
              {SLIDES.map((_, i) => (
                <Box
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  sx={{
                    width: i === slideIndex ? 20 : 8,
                    height: 8,
                    borderRadius: '4px',
                    bgcolor: i === slideIndex ? BRAND.accent : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.4s ease',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 3, sm: 6, md: 8 },
          py: 6,
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          {isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
              <Box
                sx={{
                  width: 44, height: 44,
                  borderRadius: '12px',
                  bgcolor: BRAND.primaryLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem',
                    }}
                  >
                    🏥
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: BRAND.primary, fontSize: '1.1rem' }}>
                    Doctor Appointment System
                  </Typography>
            </Box>
          )}

          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a202c', mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography sx={{ color: '#718096', mb: 4, fontSize: '0.95rem' }}>
            Sign in to your account to continue
          </Typography>

          {error && (
            <Alert
              severity={errorSeverity}
              sx={{ mb: 3, borderRadius: 2, alignItems: 'flex-start', fontSize: '0.875rem' }}
            >
              {error}
              {errorSeverity === 'warning' && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.85 }}>
                  {error.toLowerCase().includes('subscription') || error.toLowerCase().includes('expired') ? (
                    <>
                      Your trial or subscription has ended.{' '}
                      <Link
                        to="/renew-subscription"
                        state={{ email: formData.email }}
                        style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        Renew now &rarr;
                      </Link>
                    </>
                  ) : error.toLowerCase().includes('deactivated') ? null : (
                    'Please contact your system administrator to resolve this.'
                  )}
                </Typography>
              )}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', mb: 0.75 }}>
              Email address
            </Typography>
            <TextField
              required fullWidth
              name="email" type="email"
              autoComplete="email" autoFocus
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5, ...inputSx }}
            />

            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', mb: 0.75 }}>
              Password
            </Typography>
            <TextField
              required fullWidth
              name="password"
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass(!showPass)} edge="end">
                      {showPass
                        ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: '#a0aec0' }} />
                        : <VisibilityOutlinedIcon   sx={{ fontSize: 18, color: '#a0aec0' }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3, ...inputSx }}
            />

            {import.meta.env.DEV && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f0f7ff', borderRadius: '8px', border: '1px dashed #93c5fd' }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600, mb: 0.5 }}>
                  Dev Credentials
                </Typography>
                {[
                  { label: 'Super Admin', email: 'superadmin@doctorsappointment.com', pass: 'D3v0p$0808' },
                  { label: 'Admin',       email: 'admin@doctorsappointment.com',       pass: 'Admin@1234' },
                ].map(c => (
                  <Box
                    key={c.label}
                    onClick={() => { setFormData({ email: c.email, password: c.pass }); }}
                    sx={{ cursor: 'pointer', fontSize: '0.72rem', color: '#2563eb', '&:hover': { textDecoration: 'underline' }, mb: 0.25 }}
                  >
                    <strong>{c.label}:</strong> {c.email} / {c.pass}
                  </Box>
                ))}
              </Box>
            )}

            <Button
              type="submit" fullWidth variant="contained"
              disabled={loading}
              sx={{
                py: 1.4,
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: BRAND.primary,
                boxShadow: '0 4px 14px rgba(26,94,184,0.35)',
                '&:hover': {
                  bgcolor: BRAND.primaryDark,
                  boxShadow: '0 6px 20px rgba(26,94,184,0.45)',
                },
                '&:disabled': { bgcolor: '#cbd5e0' },
              }}
            >
                {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign in'}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography sx={{ textAlign: 'center', color: '#718096', fontSize: '0.875rem' }}>
                New clinic?{' '}
                <Link
                  to="/register-tenant"
                  style={{ color: BRAND.primary, fontWeight: 600, textDecoration: 'none' }}
                >
                  Register your clinic →
                </Link>
              </Typography>



        </Box>
      </Box>
    </Box>
  );
};

export default Login;
