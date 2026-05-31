import React, { useState, useEffect, useCallback } from 'react';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';
import {
  Box, Typography, Button, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select,
  FormControl, InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Tooltip, Alert, CircularProgress,
  FormHelperText,
} from '@mui/material';
import {
  CloudUpload, Download, Delete, Refresh, InsertDriveFile,
  Image, PictureAsPdf, Article,
} from '@mui/icons-material';
import { documentService } from '../services/documentService';

const CATEGORIES = ['General', 'XRay', 'Photo', 'Consent', 'Lab'];

const categoryColor = {
  XRay: 'secondary', Photo: 'info', Consent: 'warning',
  Lab: 'success', General: 'default',
};

function FileIcon({ contentType }) {
  if (contentType?.startsWith('image/')) return <Image fontSize="small" color="info" />;
  if (contentType === 'application/pdf') return <PictureAsPdf fontSize="small" color="error" />;
  return <Article fontSize="small" color="action" />;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function Documents({ patientId, readOnly = false }) {
  const { tenantVersion } = useSuperAdminTenant();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = patientId
        ? await documentService.getByPatient(patientId, categoryFilter || null)
        : await documentService.getOwn(categoryFilter || null);
      setDocs(data);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [patientId, categoryFilter, tenantVersion]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async () => {
    if (!uploadFile) { setUploadError('Please select a file.'); return; }
    setUploading(true);
    setUploadError('');
    try {
      await documentService.upload(patientId, uploadFile, uploadCategory, uploadDescription);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadCategory('General');
      setUploadDescription('');
      load();
    } catch (err) {
      setUploadError(err?.response?.data || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      await documentService.download(doc.id, doc.fileName);
    } catch {
      setError('Download failed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await documentService.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch {
      setError('Delete failed.');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Patient Documents</Typography>
        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={load}><Refresh /></IconButton>
          </Tooltip>
          {!readOnly && patientId && (
            <Button variant="contained" startIcon={<CloudUpload />} onClick={() => setUploadOpen(true)}>
              Upload
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : docs.length === 0 ? (
        <Box textAlign="center" py={6} color="text.secondary">
          <InsertDriveFile sx={{ fontSize: 48, mb: 1 }} />
          <Typography>No documents found.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <FileIcon contentType={doc.contentType} />
                      <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                        {doc.fileName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={doc.category} size="small" color={categoryColor[doc.category] || 'default'} />
                  </TableCell>
                  <TableCell>{formatBytes(doc.fileSizeBytes)}</TableCell>
                  <TableCell>{new Date(doc.uploadedDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                      {doc.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={() => handleDownload(doc)}>
                        <Download fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!readOnly && (
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(doc)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
            <Button variant="outlined" component="label" startIcon={<CloudUpload />}>
              {uploadFile ? uploadFile.name : 'Choose File'}
              <input hidden type="file" onChange={(e) => setUploadFile(e.target.files[0])} />
            </Button>
            {uploadFile && (
              <FormHelperText>{formatBytes(uploadFile.size)} — {uploadFile.type}</FormHelperText>
            )}
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={uploadCategory} label="Category"
                onChange={(e) => setUploadCategory(e.target.value)}>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Description (optional)"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              multiline rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpload} disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.fileName}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
