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
  Alert,
  Tabs,
  Tab,
  Paper,
  IconButton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Warning as WarningIcon,
  RemoveCircleOutline as IssueIcon,
  AddCircleOutline as ReceiveIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import inventoryService from '../services/inventoryService';

const validationSchema = yup.object({
  name: yup.string().required('Name is required').max(200),
  sku: yup.string().required('SKU is required').max(50),
  category: yup.string().required('Category is required'),
  quantityOnHand: yup.number().min(0, 'Quantity cannot be negative').required('Quantity is required'),
  minimumQuantity: yup.number().min(0).required('Minimum quantity is required'),
  reorderQuantity: yup.number().min(0).required('Reorder quantity is required'),
  unit: yup.string().required('Unit is required').max(20),
  unitCost: yup.number().min(0, 'Cost cannot be negative').required('Unit cost is required'),
});

const categories = [
  'DentalSupplies',
  'Pharmaceuticals',
  'Equipment',
  'Instruments',
  'OfficeSupplies',
  'SterlizationSupplies',
];

const stockLevelColor = (quantityOnHand, minimumQuantity) => {
  if (quantityOnHand === 0) return 'error';
  if (quantityOnHand <= minimumQuantity / 2) return 'error';
  if (quantityOnHand <= minimumQuantity) return 'warning';
  return 'success';
};

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openIssueDialog, setOpenIssueDialog] = useState(false);
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [issuingItem, setIssuingItem] = useState(null);
  const [receivingItem, setReceivingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);

  const formik = useFormik({
    initialValues: {
      name: '',
      sku: '',
      description: '',
      category: '',
      quantityOnHand: 0,
      minimumQuantity: 0,
      reorderQuantity: 0,
      unit: '',
      unitCost: 0,
      location: '',
      supplierId: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (editingItem) {
          await inventoryService.updateItem(editingItem.id, values);
          toast.success('Inventory item updated successfully');
        } else {
          await inventoryService.createItem(values);
          toast.success('Inventory item created successfully');
        }
        handleCloseDialog();
        loadItems();
        loadLowStockItems();
      } catch (error) {
        console.error('Error saving inventory item:', error);
        toast.error('Error saving inventory item');
      }
    },
  });

  useEffect(() => {
    loadItems();
    loadLowStockItems();
  }, [page, pageSize]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getItems(page + 1, pageSize);
      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Error loading inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadLowStockItems = async () => {
    try {
      const data = await inventoryService.getLowStock();
      setLowStockItems(data.items || data || []);
    } catch (error) {
      console.error('Error loading low stock items:', error);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      formik.setValues({
        name: item.name || '',
        sku: item.sku || '',
        description: item.description || '',
        category: item.category || '',
        quantityOnHand: item.quantityOnHand || 0,
        minimumQuantity: item.minimumQuantity || 0,
        reorderQuantity: item.reorderQuantity || 0,
        unit: item.unit || '',
        unitCost: item.unitCost || 0,
        location: item.location || '',
        supplierId: item.supplierId || '',
      });
    } else {
      setEditingItem(null);
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
    formik.resetForm();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await inventoryService.deleteItem(id);
        toast.success('Inventory item deleted successfully');
        loadItems();
        loadLowStockItems();
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        toast.error('Error deleting inventory item');
      }
    }
  };

  const handleOpenIssueDialog = (item) => {
    setIssuingItem(item);
    issueFormik.resetForm();
    setOpenIssueDialog(true);
  };

  const handleCloseIssueDialog = () => {
    setOpenIssueDialog(false);
    setIssuingItem(null);
    issueFormik.resetForm();
  };

  const handleOpenReceiveDialog = (item) => {
    setReceivingItem(item);
    receiveFormik.resetForm();
    receiveFormik.setFieldValue('unitCost', item.unitCost);
    setOpenReceiveDialog(true);
  };

  const handleCloseReceiveDialog = () => {
    setOpenReceiveDialog(false);
    setReceivingItem(null);
    receiveFormik.resetForm();
  };

  const issueFormik = useFormik({
    initialValues: {
      quantity: 1,
      reason: '',
      notes: '',
    },
    validationSchema: yup.object({
      quantity: yup
        .number()
        .min(1, 'Quantity must be at least 1')
        .required('Quantity is required')
        .test('max', 'Insufficient stock', function (value) {
          return !issuingItem || value <= issuingItem.quantityOnHand;
        }),
      reason: yup.string().required('Reason is required'),
    }),
    onSubmit: async (values) => {
      try {
        await inventoryService.issueStock(
          issuingItem.id,
          values.quantity,
          values.reason,
          values.notes
        );
        toast.success(`Issued ${values.quantity} ${issuingItem.unit} of ${issuingItem.name}`);
        handleCloseIssueDialog();
        loadItems();
        loadLowStockItems();
      } catch (error) {
        console.error('Error issuing stock:', error);
        toast.error(error.response?.data?.message || 'Error issuing stock');
      }
    },
  });

  const receiveFormik = useFormik({
    initialValues: {
      quantity: 1,
      unitCost: 0,
      supplierName: '',
      invoiceNumber: '',
      notes: '',
    },
    validationSchema: yup.object({
      quantity: yup
        .number()
        .min(1, 'Quantity must be at least 1')
        .required('Quantity is required'),
      unitCost: yup
        .number()
        .min(0, 'Unit cost cannot be negative')
        .nullable(),
      supplierName: yup.string(),
      invoiceNumber: yup.string(),
    }),
    onSubmit: async (values) => {
      try {
        await inventoryService.receiveStock(
          receivingItem.id,
          values.quantity,
          values.unitCost || null,
          values.supplierName,
          values.invoiceNumber,
          values.notes
        );
        toast.success(`Received ${values.quantity} ${receivingItem.unit} of ${receivingItem.name}`);
        handleCloseReceiveDialog();
        loadItems();
        loadLowStockItems();
      } catch (error) {
        console.error('Error receiving stock:', error);
        toast.error(error.response?.data?.message || 'Error receiving stock');
      }
    },
  });

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'sku', headerName: 'SKU', width: 120 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'category', headerName: 'Category', width: 150 },
    { field: 'quantityOnHand', headerName: 'Qty', width: 80 },
    { field: 'unit', headerName: 'Unit', width: 80 },
    {
      field: 'stockLevel',
      headerName: 'Stock Level',
      width: 130,
      renderCell: (params) => {
        const color = stockLevelColor(params.row.quantityOnHand, params.row.minimumQuantity);
        const label =
          params.row.quantityOnHand === 0
            ? 'Out of Stock'
            : params.row.quantityOnHand <= params.row.minimumQuantity / 2
            ? 'Critical'
            : params.row.quantityOnHand <= params.row.minimumQuantity
            ? 'Low'
            : 'Good';
        return <Chip label={label} color={color} size="small" />;
      },
    },
    {
      field: 'unitCost',
      headerName: 'Unit Cost',
      width: 100,
      valueFormatter: (value) => `$${value?.toFixed(2) || '0.00'}`,
    },
    {
      field: 'totalValue',
      headerName: 'Total Value',
      width: 120,
      valueGetter: (value, row) => row.quantityOnHand * row.unitCost,
      valueFormatter: (value) => `$${value?.toFixed(2) || '0.00'}`,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 320,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={() => handleOpenDialog(params.row)}>
            Edit
          </Button>
          <Button
            size="small"
            color="success"
            variant="outlined"
            startIcon={<ReceiveIcon />}
            onClick={() => handleOpenReceiveDialog(params.row)}
          >
            Receive
          </Button>
          <Button
            size="small"
            color="primary"
            variant="outlined"
            startIcon={<IssueIcon />}
            onClick={() => handleOpenIssueDialog(params.row)}
            disabled={params.row.quantityOnHand === 0}
          >
            Issue
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
        <Typography variant="h4">Inventory Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          New Item
        </Button>
      </Box>

      {lowStockItems.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <strong>{lowStockItems.length} items</strong> are low on stock or out of stock. Please
          review and reorder.
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="All Items" />
          <Tab
            label={`Low Stock (${lowStockItems.length})`}
            icon={lowStockItems.length > 0 ? <WarningIcon color="warning" /> : null}
            iconPosition="end"
          />
        </Tabs>

        {tabValue === 0 && (
          <DataGrid
            rows={items}
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
        )}

        {tabValue === 1 && (
          <DataGrid
            rows={lowStockItems}
            columns={columns}
            loading={loading}
            autoHeight
            disableRowSelectionOnClick
            hideFooter
          />
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Inventory Item' : 'New Inventory Item'}</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Item Name"
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="SKU"
                  name="sku"
                  value={formik.values.sku}
                  onChange={formik.handleChange}
                  error={formik.touched.sku && Boolean(formik.errors.sku)}
                  helperText={formik.touched.sku && formik.errors.sku}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formik.values.category}
                    onChange={formik.handleChange}
                    error={formik.touched.category && Boolean(formik.errors.category)}
                    label="Category"
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formik.values.location}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity on Hand"
                  name="quantityOnHand"
                  value={formik.values.quantityOnHand}
                  onChange={formik.handleChange}
                  error={formik.touched.quantityOnHand && Boolean(formik.errors.quantityOnHand)}
                  helperText={formik.touched.quantityOnHand && formik.errors.quantityOnHand}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Quantity"
                  name="minimumQuantity"
                  value={formik.values.minimumQuantity}
                  onChange={formik.handleChange}
                  error={formik.touched.minimumQuantity && Boolean(formik.errors.minimumQuantity)}
                  helperText={formik.touched.minimumQuantity && formik.errors.minimumQuantity}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Reorder Quantity"
                  name="reorderQuantity"
                  value={formik.values.reorderQuantity}
                  onChange={formik.handleChange}
                  error={formik.touched.reorderQuantity && Boolean(formik.errors.reorderQuantity)}
                  helperText={formik.touched.reorderQuantity && formik.errors.reorderQuantity}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Unit"
                  name="unit"
                  placeholder="e.g., box, piece, bottle"
                  value={formik.values.unit}
                  onChange={formik.handleChange}
                  error={formik.touched.unit && Boolean(formik.errors.unit)}
                  helperText={formik.touched.unit && formik.errors.unit}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Unit Cost ($)"
                  name="unitCost"
                  value={formik.values.unitCost}
                  onChange={formik.handleChange}
                  error={formik.touched.unitCost && Boolean(formik.errors.unitCost)}
                  helperText={formik.touched.unitCost && formik.errors.unitCost}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Issue Stock Dialog */}
      <Dialog open={openIssueDialog} onClose={handleCloseIssueDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Issue Stock - {issuingItem?.name}
        </DialogTitle>
        <form onSubmit={issueFormik.handleSubmit}>
          <DialogContent>
            {issuingItem && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Available Stock:</strong> {issuingItem.quantityOnHand} {issuingItem.unit}
                <br />
                <strong>SKU:</strong> {issuingItem.sku}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity to Issue"
                  name="quantity"
                  value={issueFormik.values.quantity}
                  onChange={issueFormik.handleChange}
                  error={issueFormik.touched.quantity && Boolean(issueFormik.errors.quantity)}
                  helperText={issueFormik.touched.quantity && issueFormik.errors.quantity}
                  inputProps={{ min: 1, max: issuingItem?.quantityOnHand || 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Reason</InputLabel>
                  <Select
                    name="reason"
                    value={issueFormik.values.reason}
                    onChange={issueFormik.handleChange}
                    error={issueFormik.touched.reason && Boolean(issueFormik.errors.reason)}
                    label="Reason"
                  >
                    <MenuItem value="Treatment">Treatment</MenuItem>
                    <MenuItem value="Emergency">Emergency</MenuItem>
                    <MenuItem value="Maintenance">Maintenance</MenuItem>
                    <MenuItem value="Testing">Testing</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes (Optional)"
                  name="notes"
                  placeholder="Additional details about this stock issuance..."
                  value={issueFormik.values.notes}
                  onChange={issueFormik.handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseIssueDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={issueFormik.isSubmitting}
            >
              Issue Stock
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Receive Stock Dialog */}
      <Dialog open={openReceiveDialog} onClose={handleCloseReceiveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Receive Stock - {receivingItem?.name}
        </DialogTitle>
        <form onSubmit={receiveFormik.handleSubmit}>
          <DialogContent>
            {receivingItem && (
              <Alert severity="success" sx={{ mb: 3 }}>
                <strong>Current Stock:</strong> {receivingItem.quantityOnHand} {receivingItem.unit}
                <br />
                <strong>SKU:</strong> {receivingItem.sku}
                <br />
                <strong>Current Unit Cost:</strong> ${receivingItem.unitCost.toFixed(2)}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity to Receive"
                  name="quantity"
                  value={receiveFormik.values.quantity}
                  onChange={receiveFormik.handleChange}
                  error={receiveFormik.touched.quantity && Boolean(receiveFormik.errors.quantity)}
                  helperText={receiveFormik.touched.quantity && receiveFormik.errors.quantity}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Unit Cost ($) - Optional"
                  name="unitCost"
                  placeholder="Leave empty to use current cost"
                  value={receiveFormik.values.unitCost}
                  onChange={receiveFormik.handleChange}
                  error={receiveFormik.touched.unitCost && Boolean(receiveFormik.errors.unitCost)}
                  helperText={
                    receiveFormik.touched.unitCost && receiveFormik.errors.unitCost
                      ? receiveFormik.errors.unitCost
                      : 'If provided, this will update the item\'s unit cost'
                  }
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Supplier Name (Optional)"
                  name="supplierName"
                  placeholder="e.g., ABC Medical Supply"
                  value={receiveFormik.values.supplierName}
                  onChange={receiveFormik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Invoice Number (Optional)"
                  name="invoiceNumber"
                  placeholder="e.g., INV-12345"
                  value={receiveFormik.values.invoiceNumber}
                  onChange={receiveFormik.handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes (Optional)"
                  name="notes"
                  placeholder="Additional details about this purchase..."
                  value={receiveFormik.values.notes}
                  onChange={receiveFormik.handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseReceiveDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={receiveFormik.isSubmitting}
            >
              Receive Stock
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Inventory;
