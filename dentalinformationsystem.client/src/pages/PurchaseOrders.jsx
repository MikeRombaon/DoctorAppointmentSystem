import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select,
  MenuItem, FormControl, InputLabel, Tooltip, TablePagination, InputAdornment,
  Divider,
} from '@mui/material';
import { Add, Delete, Refresh, Search, Visibility, LocalShipping } from '@mui/icons-material';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { inventoryService } from '../services/inventoryService';

const STATUS_COLORS = { Draft: 'default', Submitted: 'info', Approved: 'warning', Ordered: 'primary', PartiallyReceived: 'warning', Received: 'success', Cancelled: 'error' };
const STATUSES = ['Draft', 'Submitted', 'Approved', 'Ordered', 'PartiallyReceived', 'Received', 'Cancelled'];

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [form, setForm] = useState({ supplierId: '', branchId: '', expectedDeliveryDate: '', notes: '', items: [] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);

  // Receive dialog
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchaseOrderService.getAll({ page: page + 1, pageSize: 20, status: statusFilter || undefined });
      setOrders(data.items || []);
      setTotal(data.totalCount || 0);
    } catch { setError('Failed to load purchase orders.'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const loadInventory = async () => {
    try { const d = await inventoryService.getAll(1, 200); setInventoryItems(d.items || []); }
    catch { /* non-critical */ }
  };

  const openCreate = async () => {
    await loadInventory();
    setForm({ supplierId: '', branchId: '', expectedDeliveryDate: '', notes: '', items: [{ inventoryItemId: '', quantity: 1, unitCost: '' }] });
    setFormError('');
    setCreateOpen(true);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { inventoryItemId: '', quantity: 1, unitCost: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));

  const handleCreate = async () => {
    if (!form.supplierId || form.items.length === 0 || form.items.some(i => !i.inventoryItemId || !i.quantity || !i.unitCost)) {
      setFormError('Supplier and at least one complete item are required.'); return;
    }
    setSaving(true);
    try {
      await purchaseOrderService.create({
        supplierId: Number(form.supplierId),
        branchId: form.branchId ? Number(form.branchId) : null,
        expectedDeliveryDate: form.expectedDeliveryDate || null,
        notes: form.notes,
        items: form.items.map(i => ({ inventoryItemId: Number(i.inventoryItemId), quantity: Number(i.quantity), unitCost: Number(i.unitCost), notes: i.notes || null }))
      });
      setCreateOpen(false);
      setSuccess('Purchase order created.');
      load();
    } catch (err) { setFormError(err?.response?.data?.message || 'Create failed.'); }
    finally { setSaving(false); }
  };

  const openDetail = async (id) => {
    try {
      const d = await purchaseOrderService.getById(id);
      setDetailOrder(d);
      setReceiveQtys(Object.fromEntries(d.items.map(i => [i.id, i.quantityOrdered - i.quantityReceived])));
      setDetailOpen(true);
    } catch { setError('Failed to load PO detail.'); }
  };

  const handleReceive = async () => {
    const items = Object.entries(receiveQtys)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([id, qty]) => ({ itemId: Number(id), quantityReceived: Number(qty), unitCost: null }));
    if (items.length === 0) { setError('No quantities to receive.'); return; }
    try {
      await purchaseOrderService.receive(detailOrder.id, items);
      setDetailOpen(false);
      setSuccess('Items received and inventory updated.');
      load();
    } catch { setError('Receive failed.'); }
  };

  const handleStatusChange = async (id, status) => {
    try { await purchaseOrderService.updateStatus(id, status); setSuccess(`Status updated to ${status}.`); load(); }
    catch { setError('Status update failed.'); }
  };

  const filtered = orders.filter(o =>
    !search || o.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.supplierName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Purchase Orders</Typography>
          <Typography variant="body2" color="text.secondary">Procurement from suppliers with inventory auto-update on receipt</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>New PO</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField size="small" placeholder="Search PO / supplier…" value={search}
          onChange={e => setSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 280 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} label="Status">
            <MenuItem value="">All</MenuItem>
            {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Paper variant="outlined">
        {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PO Number</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Order Date</TableCell>
                    <TableCell>Expected</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center"><Box py={3} color="text.secondary">No purchase orders found.</Box></TableCell></TableRow>
                  ) : filtered.map(o => (
                    <TableRow key={o.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={500}>{o.poNumber}</Typography></TableCell>
                      <TableCell>{o.supplierName}</TableCell>
                      <TableCell>{new Date(o.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>{o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell align="right">₱{Number(o.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="center">
                        <Chip label={o.status} size="small" color={STATUS_COLORS[o.status] || 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View / Receive">
                          <IconButton size="small" onClick={() => openDetail(o.id)}><Visibility fontSize="small" /></IconButton>
                        </Tooltip>
                        {(o.status === 'Ordered' || o.status === 'Approved') && (
                          <Tooltip title="Mark Received">
                            <IconButton size="small" color="success" onClick={() => openDetail(o.id)}>
                              <LocalShipping fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {o.status === 'Draft' && (
                          <Tooltip title="Submit">
                            <IconButton size="small" color="primary" onClick={() => handleStatusChange(o.id, 'Submitted')}>
                              <Add fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={total} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]} />
          </>
        )}
      </Paper>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Purchase Order</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Box display="flex" gap={2}>
              <TextField label="Supplier ID *" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
                size="small" sx={{ width: 150 }} helperText="Enter supplier ID" />
              <TextField label="Expected Delivery" type="date" value={form.expectedDeliveryDate}
                onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                size="small" InputLabelProps={{ shrink: true }} />
            </Box>
            <TextField label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              size="small" multiline rows={2} fullWidth />
            <Divider />
            <Typography variant="subtitle2" fontWeight={600}>Items</Typography>
            {form.items.map((item, i) => (
              <Box key={i} display="flex" gap={1} alignItems="center">
                <FormControl size="small" sx={{ flex: 2, minWidth: 200 }}>
                  <InputLabel>Item</InputLabel>
                  <Select value={item.inventoryItemId} onChange={e => updateItem(i, 'inventoryItemId', e.target.value)} label="Item">
                    {inventoryItems.map(it => <MenuItem key={it.id} value={it.id}>{it.name} ({it.sku})</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Qty" type="number" size="small" value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)} sx={{ width: 80 }} inputProps={{ min: 1 }} />
                <TextField label="Unit Cost" type="number" size="small" value={item.unitCost}
                  onChange={e => updateItem(i, 'unitCost', e.target.value)} sx={{ width: 120 }} />
                <IconButton size="small" color="error" onClick={() => removeItem(i)} disabled={form.items.length === 1}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<Add />} onClick={addItem} size="small">Add Item</Button>
            <Typography variant="body2" fontWeight={600}>
              Total: ₱{form.items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Add />}>
            {saving ? 'Creating…' : 'Create PO'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail / Receive Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>PO: {detailOrder?.poNumber} — {detailOrder?.status}</DialogTitle>
        <DialogContent>
          {detailOrder && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>Supplier: {detailOrder.supplierName}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Ordered</TableCell>
                      <TableCell align="right">Received</TableCell>
                      <TableCell align="right">Receive Now</TableCell>
                      <TableCell align="right">Unit Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailOrder.items?.map(it => (
                      <TableRow key={it.id}>
                        <TableCell>{it.itemName}</TableCell>
                        <TableCell align="right">{it.quantityOrdered}</TableCell>
                        <TableCell align="right">{it.quantityReceived}</TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" value={receiveQtys[it.id] || 0}
                            onChange={e => setReceiveQtys(q => ({ ...q, [it.id]: e.target.value }))}
                            sx={{ width: 80 }} inputProps={{ min: 0, max: it.quantityOrdered - it.quantityReceived }} />
                        </TableCell>
                        <TableCell align="right">₱{Number(it.unitCost).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          {detailOrder && ['Ordered', 'Approved', 'PartiallyReceived'].includes(detailOrder.status) && (
            <Button variant="contained" color="success" startIcon={<LocalShipping />} onClick={handleReceive}>
              Receive Items
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
