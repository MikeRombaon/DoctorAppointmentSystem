import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { SuperAdminTenantProvider } from './contexts/SuperAdminTenantContext';
import AppRoutes from './routes/AppRoutes';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0f6cbd',
      light: '#3a86d4',
      dark: '#0a4a8f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00897b',
      light: '#26a69a',
      dark: '#00695c',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
    },
    error: {
      main: '#c62828',
      light: '#ef5350',
    },
    warning: {
      main: '#e65100',
      light: '#ff9800',
    },
    info: {
      main: '#0277bd',
      light: '#29b6f6',
    },
    background: {
      default: '#f0f4f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a202c',
      secondary: '#4a5568',
    },
    divider: 'rgba(0,0,0,0.08)',
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    button: { fontWeight: 600, letterSpacing: '0.02em' },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 2px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
    '0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
    '0 6px 16px rgba(0,0,0,0.09)',
    '0 8px 20px rgba(0,0,0,0.10)',
    '0 10px 24px rgba(0,0,0,0.10)',
    '0 12px 28px rgba(0,0,0,0.11)',
    '0 14px 32px rgba(0,0,0,0.11)',
    '0 16px 36px rgba(0,0,0,0.12)',
    '0 18px 40px rgba(0,0,0,0.12)',
    '0 20px 44px rgba(0,0,0,0.13)',
    '0 22px 48px rgba(0,0,0,0.13)',
    '0 24px 52px rgba(0,0,0,0.14)',
    '0 26px 56px rgba(0,0,0,0.14)',
    '0 28px 60px rgba(0,0,0,0.14)',
    '0 30px 64px rgba(0,0,0,0.15)',
    '0 32px 68px rgba(0,0,0,0.15)',
    '0 34px 72px rgba(0,0,0,0.15)',
    '0 36px 76px rgba(0,0,0,0.16)',
    '0 38px 80px rgba(0,0,0,0.16)',
    '0 40px 84px rgba(0,0,0,0.16)',
    '0 42px 88px rgba(0,0,0,0.17)',
    '0 44px 92px rgba(0,0,0,0.17)',
    '0 46px 96px rgba(0,0,0,0.18)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: 'Inter, sans-serif',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          letterSpacing: '0.02em',
        },
        contained: {
          boxShadow: '0 2px 6px rgba(15,108,189,0.25)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(15,108,189,0.35)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            backgroundColor: '#f8fafc',
            color: '#4a5568',
            fontSize: '0.8125rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <SuperAdminTenantProvider>
            <AppRoutes />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </SuperAdminTenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;