import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Divider, Alert,
  CircularProgress, TextField, MenuItem, Select, InputLabel,
  FormControl, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SavingsIcon from '@mui/icons-material/Savings';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useAuth } from '../contexts/AuthContext';
import tenantService from '../services/tenantService';
import bpiQr from '../assets/bpi-qr.png';

// ── Plan definitions ─────────────────────────────────────────────────────────
const MONTHLY_PRICE = 1000;
const PLANS = [
  {
    key: '1',
    label: '1 Month',
    months: 1,
    price: 1000,
    perMonth: 1000,
    badge: null,
    savings: null,
    color: '#1a5eb8',
    bg: '#eef4ff',
    border: '#1a5eb8',
  },
  {
    key: '6',
    label: '6 Months',
    months: 6,
    price: 5500,
    perMonth: Math.round(5500 / 6),
    badge: 'Save ₱500',
    badgeColor: '#f59e0b',
    savings: 500,
    color: '#374151',
    bg: '#fff',
    border: '#e5e7eb',
  },
  {
    key: '12',
    label: '12 Months',
    months: 12,
    price: 11000,
    perMonth: Math.round(11000 / 12),
    badge: 'Best Value',
    badgeColor: '#7c3aed',
    savings: 1000,
    color: '#374151',
    bg: '#fff',
    border: '#e5e7eb',
  },
];

const PAYMENT_METHODS = ['BPI InstaPay', 'GCash', 'Maya', 'QR Ph', 'Cash', 'Other'];

function daysRemaining(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Subscription() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [paymentMethod, setPaymentMethod] = useState('BPI InstaPay');
  const [refNumber, setRefNumber] = useState('');
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successDialog, setSuccessDialog] = useState(false);
  const [myPayments, setMyPayments] = useState([]);
  const fileRef = useRef();

  const loadTenant = async () => {
    if (!user?.tenantId) { setLoading(false); return; }
    try {
      const tenants = await tenantService.getAll();
      const t = tenants.find(x => x.id === user.tenantId);
      setTenant(t || null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const loadPayments = async () => {
    if (!user?.tenantId) return;
    try {
      const all = await tenantService.getPayments('');
      setMyPayments(all.filter(p => p.tenantId === user.tenantId));
    } catch { /* silent */ }
  };

  useEffect(() => { loadTenant(); loadPayments(); }, [user]);

  const handleSubmit = async () => {
    if (!refNumber.trim()) { setSubmitError('Reference / transaction number is required.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const fd = new FormData();
      fd.append('amountPaid', selectedPlan.price);
      fd.append('currency', 'PHP');
      fd.append('referenceNumber', refNumber.trim());
      fd.append('paymentMethod', paymentMethod);
      fd.append('tenantNote', note || `Paying for ${selectedPlan.label} plan`);
      if (proofFile) fd.append('proofFile', proofFile);
      await tenantService.submitPayment(user.tenantId, fd);
      setSuccessDialog(true);
      setRefNumber('');
      setNote('');
      setProofFile(null);
      loadPayments();
    } catch {
      setSubmitError('Failed to submit payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;

  const days = daysRemaining(tenant?.subscriptionExpiresAt);
  const status = tenant?.subscriptionStatus || 'Active';
  const renewDate = tenant?.subscriptionExpiresAt
    ? fmtDate(new Date(new Date(tenant.subscriptionExpiresAt).setMonth(new Date(tenant.subscriptionExpiresAt).getMonth() + 1)))
    : '—';

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, md: 0 } }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>Billing &amp; Subscription</Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your clinic subscription for <strong>{tenant?.name || '—'}</strong>.
        </Typography>
      </Box>

      {/* ── Current Status Card ─────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          Current Status
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mt={0.5}>
          <Typography variant="h6" fontWeight={700}>{tenant?.name || '—'}</Typography>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Chip
              icon={<CheckCircleIcon fontSize="small" />}
              label={status}
              color={status === 'Active' ? 'success' : status === 'ExpiringSoon' ? 'warning' : 'error'}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            />
            {days !== null && (
              <Chip
                label={`${days} day${days !== 1 ? 's' : ''} remaining`}
                variant="outlined"
                sx={{ borderRadius: 2, fontWeight: 600 }}
              />
            )}
            {tenant?.subscriptionExpiresAt && (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Renews: {fmtDate(tenant.subscriptionExpiresAt)}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* ── Choose Plan ─────────────────────────────────────────────────── */}
      <Box mb={4}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Choose Subscription Plan</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Select a billing period. Longer plans save you money.
        </Typography>
        <Grid container spacing={2}>
          {PLANS.map(plan => {
            const active = selectedPlan.key === plan.key;
            return (
              <Grid item xs={12} sm={4} key={plan.key}>
                <Paper
                  onClick={() => setSelectedPlan(plan)}
                  variant="outlined"
                  sx={{
                    p: 2.5, borderRadius: 3, cursor: 'pointer', position: 'relative',
                    border: active ? `2px solid ${plan.color}` : `1px solid ${plan.border}`,
                    bgcolor: active ? plan.bg : '#fff',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: plan.color, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
                  }}
                >
                  {plan.badge && (
                    <Chip
                      label={plan.badge}
                      size="small"
                      sx={{
                        position: 'absolute', top: 12, right: 12,
                        bgcolor: plan.badgeColor, color: '#fff',
                        fontWeight: 700, fontSize: '0.7rem', borderRadius: 1,
                      }}
                    />
                  )}
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {active
                      ? <CheckCircleOutlineIcon sx={{ color: plan.color, fontSize: 20 }} />
                      : <RadioButtonUncheckedIcon sx={{ color: '#9ca3af', fontSize: 20 }} />}
                    <Typography variant="subtitle1" fontWeight={700} color={active ? plan.color : 'text.primary'}>
                      {plan.label}
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={800} color={active ? plan.color : 'text.primary'} mb={0.25}>
                    ₱{plan.price.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ₱{plan.perMonth.toLocaleString()} / mo
                  </Typography>
                  {plan.savings && (
                    <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                      <SavingsIcon sx={{ fontSize: 14, color: plan.badgeColor }} />
                      <Typography variant="caption" sx={{ color: plan.badgeColor, fontWeight: 600 }}>
                        Save ₱{plan.savings.toLocaleString()} vs monthly
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* ── Payment Section ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Grid container spacing={3}>
          {/* QR Code */}
          <Grid item xs={12} sm={5} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
            <Box
              component="img"
              src={bpiQr}
              alt="BPI InstaPay QR"
              sx={{ width: 180, height: 180, borderRadius: 2, border: '1px solid #e5e7eb', objectFit: 'contain' }}
            />
            <Typography variant="caption" color="text.secondary" mt={1} display="flex" alignItems="center" gap={0.5}>
              <LocalOfferIcon sx={{ fontSize: 13 }} /> BPI InstaPay QR
            </Typography>
          </Grid>

          {/* Payment Details */}
          <Grid item xs={12} sm={7}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Pay via BPI InstaPay</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Scan the QR code using your BPI app or any InstaPay-enabled banking app.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1, mb: 2 }}>
              {[
                ['Account Name', 'mikrom'],
                ['Bank', 'BPI'],
                ['Plan', selectedPlan.label],
                ['Amount to Pay', `₱${selectedPlan.price.toLocaleString()}`],
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={700} textAlign="right">{value}</Typography>
                </React.Fragment>
              ))}
            </Box>

            <Paper sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2, p: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                After payment, fill in your reference number below and click{' '}
                <strong>"I've Paid — Notify Admin"</strong>. Our team will activate your subscription within{' '}
                <strong>1 business day</strong>.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        {/* Form */}
        {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>{submitError}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Reference / Transaction No. *"
              value={refNumber}
              onChange={e => setRefNumber(e.target.value)}
              size="small" fullWidth
              placeholder="e.g. 1234567890"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select label="Payment Method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              size="small" fullWidth multiline rows={2}
              placeholder={`e.g. Paying for ${selectedPlan.label} plan`}
            />
          </Grid>
          <Grid item xs={12}>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
              onChange={e => setProofFile(e.target.files?.[0] || null)} />
            <Button variant="outlined" size="small" onClick={() => fileRef.current.click()}>
              {proofFile ? proofFile.name : '📎 Attach Screenshot / Receipt'}
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={submitting}
              onClick={handleSubmit}
              startIcon={submitting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <CheckCircleOutlineIcon />}
              sx={{ borderRadius: 2, py: 1.5, fontWeight: 700, fontSize: '1rem',
                    bgcolor: '#1a5eb8', '&:hover': { bgcolor: '#134a94' } }}
            >
              {submitting ? 'Submitting…' : "I've Paid — Notify Admin"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Payment History ─────────────────────────────────────────────── */}
      {myPayments.length > 0 && (
        <Box mb={4}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Payment History</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {myPayments.map((p, i) => (
              <Box key={p.id}>
                {i > 0 && <Divider />}
                <Box display="flex" justifyContent="space-between" alignItems="center" px={3} py={1.5} flexWrap="wrap" gap={1}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      ₱{Number(p.amountPaid).toLocaleString()} — {p.paymentMethod}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ref: {p.referenceNumber} · {new Date(p.submittedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      size="small" label={p.status}
                      color={p.status === 'Approved' ? 'success' : p.status === 'Rejected' ? 'error' : 'warning'}
                      sx={{ fontWeight: 700 }}
                    />
                    {p.status === 'Rejected' && p.rejectionNote && (
                      <Typography variant="caption" color="error.main">({p.rejectionNote})</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Paper>
        </Box>
      )}

      {/* ── Success Dialog ───────────────────────────────────────────────── */}
      <Dialog open={successDialog} onClose={() => setSuccessDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main' }} />
          <Typography variant="h6" fontWeight={700} mt={1}>Payment Submitted!</Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Your payment has been submitted successfully. Our team will review and activate your subscription within <strong>1 business day</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button variant="contained" onClick={() => setSuccessDialog(false)}
            sx={{ borderRadius: 2, px: 4, bgcolor: '#1a5eb8', '&:hover': { bgcolor: '#134a94' } }}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
