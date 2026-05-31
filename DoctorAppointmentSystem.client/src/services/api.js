import axios from 'axios';

// Frontend is served by the same .NET API container — always use relative /api path.
// In development the Vite proxy rewrites /api → backend (vite.config.js).
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and SuperAdmin tenant scope header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // When SuperAdmin has selected a specific tenant to investigate, forward
    // the tenant id so the backend can scope queries appropriately.
    const superAdminTenant = localStorage.getItem('superadmin_selected_tenant');
    if (superAdminTenant) {
      try {
        const parsed = JSON.parse(superAdminTenant);
        if (parsed?.id) {
          config.headers['X-Tenant-Id'] = String(parsed.id);
        }
      } catch {
        // ignore malformed value
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginPage = window.location.pathname === '/login';
    const hasToken = !!localStorage.getItem('token');

    if (status === 401) {
      if (!hasToken && !isLoginPage) {
        // No token at all — send to login
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (hasToken && !isLoginPage) {
        // Inspect WWW-Authenticate header for token-level rejection vs permission denial.
        // ASP.NET Core JwtBearer sends:
        //   Bearer error="invalid_token", error_description="The token expired at ..."
        //   Bearer error="invalid_token", error_description="The signature key was not found"
        //   Bearer  (no params — missing/malformed token)
        const wwwAuth = (error.response?.headers?.['www-authenticate'] ?? '').toLowerCase();

        const isTokenProblem =
          wwwAuth.includes('error="invalid_token"') ||
          wwwAuth.includes("error='invalid_token'") ||
          wwwAuth.includes('invalid_token') ||
          wwwAuth.includes('expired') ||
          wwwAuth.includes('signature') ||
          wwwAuth.includes('malformed') ||
          // Plain "Bearer" with nothing after = token missing/unparseable
          /^bearer\s*$/.test(wwwAuth.trim());

        if (isTokenProblem) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('superadmin_selected_tenant');
          window.location.href = '/login';
        }
        // else: 401 due to insufficient role/policy — let the caller handle it
      }
    }

    // 403 = authenticated but not authorized — never force logout
    // Let individual pages/components handle this gracefully

    return Promise.reject(error);
  }
);

export default apiClient;
