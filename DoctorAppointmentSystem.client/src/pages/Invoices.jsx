import React, { useState, useEffect } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Checkbox,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Payment as PaymentIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import invoiceService from '../services/invoiceService';
import patientService from '../services/patientService';
import treatmentService from '../services/treatmentService';

const validationSchema = yup.object({
  patientId: yup.number().required('Patient is required'),
  invoiceDate: yup.date().required('Invoice date is required'),
  dueDate: yup.date().nullable(),
});

const paymentValidationSchema = yup.object({
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  paymentMethod: yup.string().required('Payment method is required'),
  paymentDate: yup.date().required('Payment date is required'),
});

const statusColors = {
  Pending: 'warning',
  PartiallyPaid: 'info',
  Paid: 'success',
  Overdue: 'error',
  Cancelled: 'default',
};

const Invoices = () => {
  const { tenantVersion } = useSuperAdminTenant();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [patients, setPatients] = useState([]);
  const [patientTreatments, setPatientTreatments] = useState([]);
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  const [taxRate, setTaxRate] = useState(0); // Tax percentage (e.g., 8 for 8%)
  const [discount, setDiscount] = useState(0);

  const formik = useFormik({
    initialValues: {
      patientId: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Validate that treatments are selected
        if (selectedTreatments.length === 0) {
          toast.error('Please select at least one treatment to bill');
          return;
        }

        // Build invoice items from selected treatments — use procedure defaultCost as price if treatment cost is 0
        const invoiceItems = selectedTreatments.flatMap(t => {
          const procedures = t.treatmentProcedures?.length > 0
            ? t.treatmentProcedures.map(tp => ({
                treatmentId: t.id,
                description: tp.procedure?.name || t.procedure?.name || 'Treatment',
                quantity: 1,
                unitPrice: tp.procedure?.defaultCost ?? t.procedure?.defaultCost ?? t.cost ?? 0,
                totalPrice: tp.procedure?.defaultCost ?? t.procedure?.defaultCost ?? t.cost ?? 0,
              }))
            : [{
                treatmentId: t.id,
                description: t.procedure?.name || 'Treatment',
                quantity: 1,
                unitPrice: t.procedure?.defaultCost ?? t.cost ?? 0,
                totalPrice: t.procedure?.defaultCost ?? t.cost ?? 0,
              }];
          return procedures;
        });

        // Calculate totals based on actual item prices
        const subTotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const taxAmount = (subTotal - discount) * (taxRate / 100);
        const totalAmount = subTotal - discount + taxAmount;

        // Build complete invoice object
        const invoiceData = {
          patientId: values.patientId,
          invoiceDate: values.invoiceDate,
          dueDate: values.dueDate || null,
          subTotal: subTotal,
          taxAmount: taxAmount,
          discount: discount,
          totalAmount: totalAmount,
          notes: values.notes,
          invoiceItems: invoiceItems,
        };

        await invoiceService.create(invoiceData);
        toast.success('Invoice created successfully! 🧾');
        handleCloseDialog();
        loadInvoices();
      } catch (error) {
        console.error('Error creating invoice:', error);
        toast.error(error.response?.data?.message || 'Error creating invoice');
      }
    },
  });

  const paymentFormik = useFormik({
    initialValues: {
      amount: '',
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0],
      transactionReference: '',
      notes: '',
    },
    validationSchema: paymentValidationSchema,
    onSubmit: async (values) => {
      try {
        await invoiceService.addPayment(selectedInvoice.id, values);
        toast.success('Payment recorded successfully');
        handleClosePaymentDialog();
        loadInvoices();
      } catch (error) {
        console.error('Error recording payment:', error);
        toast.error('Error recording payment');
      }
    },
  });

  useEffect(() => {
    loadInvoices();
    loadPatients();
  }, [page, pageSize, tenantVersion]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getAll(page + 1, pageSize);
      setInvoices(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Error loading invoices');
    } finally {
      setLoading(false);
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

  const handleOpenDialog = () => {
    formik.resetForm();
    setSelectedTreatments([]);
    setPatientTreatments([]);
    setTaxRate(0);
    setDiscount(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    formik.resetForm();
    setSelectedTreatments([]);
    setPatientTreatments([]);
    setTaxRate(0);
    setDiscount(0);
  };

  // Load patient's treatments available for billing
  const loadPatientTreatments = async (patientId) => {
    if (!patientId) {
      setPatientTreatments([]);
      setSelectedTreatments([]);
      return;
    }

    try {
      // Fetch all treatments for this patient (any status can be billed)
      const data = await treatmentService.getAll(1, 100, null, patientId, null);

      // Filter out already billed treatments (if you have that info)
      // For now, showing all completed treatments
      setPatientTreatments(data.items || []);
      setSelectedTreatments([]); // Reset selection when patient changes
    } catch (error) {
      console.error('Error loading patient treatments:', error);
      toast.error('Error loading patient treatments');
      setPatientTreatments([]);
    }
  };

  // Handle treatment selection
  const handleTreatmentToggle = (treatment) => {
    const isSelected = selectedTreatments.some(t => t.id === treatment.id);
    if (isSelected) {
      setSelectedTreatments(selectedTreatments.filter(t => t.id !== treatment.id));
    } else {
      setSelectedTreatments([...selectedTreatments, treatment]);
    }
  };

  // Calculate invoice totals
  const calculateTotals = () => {
    const subTotal = selectedTreatments.reduce((sum, t) => sum + t.cost, 0);
    const taxAmount = (subTotal - discount) * (taxRate / 100);
    const totalAmount = subTotal - discount + taxAmount;

    return {
      subTotal: subTotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  };

  const handleOpenPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    paymentFormik.setFieldValue('amount', invoice.balanceAmount);
    setOpenPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setSelectedInvoice(null);
    paymentFormik.resetForm();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoiceService.delete(id);
        toast.success('Invoice deleted successfully');
        loadInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Error deleting invoice');
      }
    }
  };

  const columns = [
    { field: 'id', headerName: 'Invoice#', width: 90 },
    {
      field: 'patient',
      headerName: 'Patient',
      width: 200,
      valueGetter: (value, row) => row.patient?.fullName || 'N/A',
    },
    {
      field: 'invoiceDate',
      headerName: 'Date',
      width: 120,
      valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 110,
      valueFormatter: (value) => `$${value?.toFixed(2) || '0.00'}`,
    },
    {
      field: 'paidAmount',
      headerName: 'Paid',
      width: 110,
      valueFormatter: (value) => `$${value?.toFixed(2) || '0.00'}`,
    },
    {
      field: 'balanceAmount',
      headerName: 'Balance',
      width: 110,
      valueFormatter: (value) => `$${value?.toFixed(2) || '0.00'}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value} color={statusColors[params.value] || 'default'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {params.row.balanceAmount > 0 && (
            <Button
              size="small"
              startIcon={<PaymentIcon />}
              onClick={() => handleOpenPaymentDialog(params.row)}
            >
              Pay
            </Button>
          )}
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
        <Typography variant="h4">Invoices & Billing</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          New Invoice
        </Button>
      </Box>

      <DataGrid
        rows={invoices}
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

      {/* Create Invoice Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>New Invoice</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Patient Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Patient *</InputLabel>
                  <Select
                    name="patientId"
                    value={formik.values.patientId}
                    onChange={(e) => {
                      formik.handleChange(e);
                      loadPatientTreatments(e.target.value);
                    }}
                    error={formik.touched.patientId && Boolean(formik.errors.patientId)}
                    label="Patient *"
                  >
                    {patients.map((patient) => (
                      <MenuItem key={patient.id} value={patient.id}>
                        {patient.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Treatment Selection */}
              {formik.values.patientId && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Select Treatments to Bill ({selectedTreatments.length} selected)
                  </Typography>
                  {patientTreatments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No treatments available for billing.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">Select</TableCell>
                            <TableCell>Procedure</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Cost</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {patientTreatments.map((treatment) => (
                            <TableRow key={treatment.id} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedTreatments.some(t => t.id === treatment.id)}
                                  onChange={() => handleTreatmentToggle(treatment)}
                                />
                              </TableCell>
                              <TableCell>{treatment.procedure?.name || 'N/A'}</TableCell>
                              <TableCell>
                                {treatment.treatmentDate 
                                  ? new Date(treatment.treatmentDate).toLocaleDateString()
                                  : 'N/A'}
                              </TableCell>
                              <TableCell align="right">${treatment.cost?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Grid>
              )}

              {/* Invoice Details */}
              {selectedTreatments.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Invoice Details
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Invoice Date"
                      name="invoiceDate"
                      value={formik.values.invoiceDate}
                      onChange={formik.handleChange}
                      error={formik.touched.invoiceDate && Boolean(formik.errors.invoiceDate)}
                      helperText={formik.touched.invoiceDate && formik.errors.invoiceDate}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Due Date"
                      name="dueDate"
                      value={formik.values.dueDate}
                      onChange={formik.handleChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Tax Rate (%)"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      InputProps={{ inputProps: { min: 0, max: 100, step: 0.1 } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Discount ($)"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Notes"
                      name="notes"
                      value={formik.values.notes}
                      onChange={formik.handleChange}
                    />
                  </Grid>

                  {/* Invoice Summary */}
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Invoice Summary
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">Subtotal:</Typography>
                        <Typography variant="body2">${calculateTotals().subTotal}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">Discount:</Typography>
                        <Typography variant="body2" color="error">-${discount.toFixed(2)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">Tax ({taxRate}%):</Typography>
                        <Typography variant="body2">${calculateTotals().taxAmount}</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">Total:</Typography>
                        <Typography variant="h6" color="primary">
                          ${calculateTotals().totalAmount}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={selectedTreatments.length === 0}
            >
              Create Invoice
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment - Invoice #{selectedInvoice?.id}</DialogTitle>
        <form onSubmit={paymentFormik.handleSubmit}>
          <DialogContent>
            {selectedInvoice && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2">
                  Patient: <strong>{selectedInvoice.patient?.fullName}</strong>
                </Typography>
                <Typography variant="body2">
                  Total: <strong>${selectedInvoice.totalAmount?.toFixed(2)}</strong>
                </Typography>
                <Typography variant="body2">
                  Paid: <strong>${selectedInvoice.paidAmount?.toFixed(2)}</strong>
                </Typography>
                <Typography variant="body2" color="error">
                  Balance Due: <strong>${selectedInvoice.balanceAmount?.toFixed(2)}</strong>
                </Typography>
              </Box>
            )}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Payment Amount"
                  name="amount"
                  value={paymentFormik.values.amount}
                  onChange={paymentFormik.handleChange}
                  error={paymentFormik.touched.amount && Boolean(paymentFormik.errors.amount)}
                  helperText={paymentFormik.touched.amount && paymentFormik.errors.amount}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={paymentFormik.values.paymentMethod}
                    onChange={paymentFormik.handleChange}
                    label="Payment Method"
                  >
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="CreditCard">Credit Card</MenuItem>
                    <MenuItem value="DebitCard">Debit Card</MenuItem>
                    <MenuItem value="BankTransfer">Bank Transfer</MenuItem>
                    <MenuItem value="Check">Check</MenuItem>
                    <MenuItem value="Insurance">Insurance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Payment Date"
                  name="paymentDate"
                  value={paymentFormik.values.paymentDate}
                  onChange={paymentFormik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Transaction Reference"
                  name="transactionReference"
                  value={paymentFormik.values.transactionReference}
                  onChange={paymentFormik.handleChange}
                  placeholder="Check #, Card last 4 digits, etc."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes"
                  name="notes"
                  value={paymentFormik.values.notes}
                  onChange={paymentFormik.handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Record Payment
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Invoices;
