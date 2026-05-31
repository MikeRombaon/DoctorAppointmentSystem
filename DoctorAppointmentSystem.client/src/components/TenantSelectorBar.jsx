import React, { useState } from 'react';
import {
  Box,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Typography,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BusinessIcon from '@mui/icons-material/Business';
import PublicIcon from '@mui/icons-material/Public';
import { useSuperAdminTenant } from '../contexts/SuperAdminTenantContext';

/**
 * A sticky banner rendered below the main topbar (SuperAdmin only).
 * Lets the operator pick which tenant they are investigating, or
 * stay in "All Tenants" cross-tenant mode.
 */
const TenantSelectorBar = () => {
  const { tenants, loading, selectedTenant, selectedTenantId, selectTenant } =
    useSuperAdminTenant();

  const handleChange = (event) => {
    const value = event.target.value;
    if (value === '') {
      selectTenant(null);
    } else {
      const found = tenants.find((t) => t.id === value);
      selectTenant(found ?? null);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 3,
        py: 0.75,
        bgcolor: 'warning.dark',
        color: 'warning.contrastText',
        borderBottom: '1px solid',
        borderColor: 'warning.main',
        minHeight: 44,
      }}
    >
      {/* Label */}
      <AdminPanelSettingsIcon fontSize="small" />
      <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
        SUPERADMIN MODE
      </Typography>

      <Box sx={{ width: 1, height: 20, bgcolor: 'warning.main', borderRadius: 1, opacity: 0.4, mx: 0.5 }} />

      <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.85 }}>
        Viewing tenant:
      </Typography>

      {loading ? (
        <CircularProgress size={16} sx={{ color: 'warning.contrastText' }} />
      ) : (
        <FormControl size="small" variant="outlined" sx={{ minWidth: 220 }}>
          <Select
            value={loading || tenants.length === 0 ? '' : (selectedTenantId ?? '')}
            onChange={handleChange}
            displayEmpty
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              color: 'warning.contrastText',
              fontSize: 13,
              fontWeight: 600,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.35)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.7)' },
              '& .MuiSvgIcon-root': { color: 'warning.contrastText' },
            }}
            renderValue={(val) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {val === '' ? (
                  <>
                    <PublicIcon fontSize="inherit" />
                    <span>All Tenants</span>
                  </>
                ) : (
                  <>
                    <BusinessIcon fontSize="inherit" />
                    <span>{selectedTenant?.name ?? val}</span>
                  </>
                )}
              </Box>
            )}
          >
            <MenuItem value="">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PublicIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>All Tenants</Typography>
                  <Typography variant="caption" color="text.secondary">Cross-tenant view</Typography>
                </Box>
              </Box>
            </MenuItem>

            {tenants.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{t.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.contactEmail}</Typography>
                  </Box>
                  {!t.isActive && (
                    <Chip label="Inactive" size="small" color="error" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {selectedTenant && (
        <Tooltip title="Click the dropdown and choose 'All Tenants' to clear">
          <Chip
            label={`Scoped to: ${selectedTenant.name}`}
            size="small"
            color="warning"
            variant="filled"
            icon={<BusinessIcon />}
            sx={{
              bgcolor: 'rgba(255,255,255,0.25)',
              color: 'warning.contrastText',
              fontWeight: 700,
              '& .MuiChip-icon': { color: 'warning.contrastText' },
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
};

export default TenantSelectorBar;
