# Phase 2: Power BI Integration - Step-by-Step Guide

## Overview

This guide will walk you through integrating Power BI into your PQMAP application. We'll implement both embedding (for viewing Power BI reports) and data push (for syncing data to Power BI).

**Timeline**: 2-4 weeks  
**Effort Level**: Medium to Advanced  
**Prerequisites**: Power BI Pro licenses (✅ You have 100)

---

## 🎯 Integration Approach

We'll implement a **hybrid approach**:
1. **Report Builder** (Phase 1 - ✅ Done): 80% of use cases
2. **Power BI Embed** (Phase 2): 20% of advanced dashboards
3. **Data Push Service**: Sync Supabase → Power BI every 15 minutes

---

## Step 1: Test Power BI Embedding (Quick Win - 1 hour)

### 1.1 Create a Test Report

**In Power BI Desktop:**

1. Open Power BI Desktop
2. Click "Get Data" → "Text/CSV"
3. Export sample data from PQMAP:
   ```sql
   -- Run in Supabase SQL Editor
   COPY (
     SELECT 
       id,
       timestamp,
       event_type,
       severity,
       duration_ms,
       magnitude,
       customer_count,
       substation_id
       root_cause
     FROM pq_events
     WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days' AND is_mother_event = true
     ORDER BY timestamp DESC
     LIMIT 5000
   ) TO STDOUT WITH CSV HEADER;
   ```
4. Load the CSV into Power BI Desktop
5. Create a simple dashboard with:
   - Bar chart: Events by Severity
   - Line chart: Events over Time
   - Table: Top Substations by Event Count
6. Save as `PQMAP_Test.pbix`

### 1.2 Publish to Power BI Service

1. Click "Publish" in Power BI Desktop
2. Sign in with your Pro account
3. Select your workspace (or create new: "PQMAP Reports")
4. Wait for publish to complete
5. Click "Open 'PQMAP_Test' in Power BI"

### 1.3 Get Embed Information

**In Power BI Service (app.powerbi.com):**

1. Open your report
2. Click "File" → "Embed report" → "Website or portal"
3. Copy the **Embed URL** (looks like: `https://app.powerbi.com/reportEmbed?reportId=xxx&groupId=yyy`)
4. Keep this URL handy

### 1.4 Quick Test with Iframe

Let's test the embed URL works:

1. Create temporary test file:

```tsx
// src/components/Dashboard/PowerBITest.tsx
export default function PowerBITest() {
  const embedUrl = "PASTE_YOUR_EMBED_URL_HERE";
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Power BI Test</h2>
      <iframe
        src={embedUrl}
        width="100%"
        height="600px"
        frameBorder="0"
        allowFullScreen
      />
    </div>
  );
}
```

2. Temporarily add to Dashboard.tsx:
```tsx
import PowerBITest from './PowerBITest';

// In renderWidget():
case 'power-bi-test':
  return <PowerBITest />;
```

3. Test in browser - you should see your Power BI report!

**Note**: This basic iframe approach works but requires users to authenticate separately. We'll improve this with SSO in the next steps.

---

## Step 2: Set Up Azure AD (1-2 hours)

### 2.1 Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: **Azure Active Directory** → **App registrations** → **New registration**

**Registration Details:**
```
Name: PQMAP-PowerBI
Supported account types: Single tenant (Accounts in this organizational directory only)
Redirect URI: 
  - Platform: Single-page application (SPA)
  - URL: http://localhost:5173/auth/callback (for dev)
  - URL: https://your-production-domain.com/auth/callback (add later)
```

3. Click **Register**
4. **Save these values** (you'll need them):
   - Application (client) ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Directory (tenant) ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 2.2 Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft APIs** → **Power BI Service**
4. Select **Delegated permissions**
5. Check these permissions:
   - ✅ `Report.Read.All`
   - ✅ `Report.ReadWrite.All`
   - ✅ `Dataset.Read.All`
   - ✅ `Dataset.ReadWrite.All`
   - ✅ `Workspace.Read.All`
   - ✅ `Workspace.ReadWrite.All`
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]** (requires admin rights)

### 2.3 Configure Authentication

1. Go to **Authentication** in your app
2. Under **Implicit grant and hybrid flows**, check:
   - ✅ Access tokens
   - ✅ ID tokens
3. Under **Allow public client flows**: Set to **No**
4. Click **Save**

### 2.4 Save Configuration

Create `.env.local` file (add to `.gitignore`):

```env
# Power BI Azure AD Configuration
VITE_AZURE_CLIENT_ID=your-client-id-here
VITE_AZURE_TENANT_ID=your-tenant-id-here
VITE_REDIRECT_URI=http://localhost:5173/auth/callback
```

**Production**: Create `.env.production` with production redirect URI.

---

## Step 3: Implement SSO Authentication (2-3 hours)

### 3.1 Install Required Packages

```bash
npm install @azure/msal-browser @azure/msal-react @microsoft/powerbi-client-react powerbi-client
```

### 3.2 Create Auth Configuration

Create `src/lib/powerbi/authConfig.ts`:

```typescript
import { Configuration, PopupRequest } from '@azure/msal-browser';

// Load from environment variables
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
const redirectUri = import.meta.env.VITE_REDIRECT_URI || window.location.origin + '/auth/callback';

if (!clientId || !tenantId) {
  console.error('Missing Azure AD configuration. Please set VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID');
}

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId || '',
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: ['https://analysis.windows.net/powerbi/api/Report.Read.All'],
};

export const tokenRequest: PopupRequest = {
  scopes: ['https://analysis.windows.net/powerbi/api/.default'],
};
```

### 3.3 Create Power BI Auth Context

Create `src/contexts/PowerBIAuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { msalConfig, loginRequest, tokenRequest } from '../lib/powerbi/authConfig';

interface PowerBIAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  account: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  error: string | null;
}

const PowerBIAuthContext = createContext<PowerBIAuthContextType | undefined>(undefined);

let msalInstance: PublicClientApplication | null = null;

const initializeMsal = async () => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }
  return msalInstance;
};

export function PowerBIAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const msal = await initializeMsal();
      const accounts = msal.getAllAccounts();

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await acquireTokenSilently(accounts[0]);
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err);
      setError('Failed to initialize authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const acquireTokenSilently = async (accountInfo: AccountInfo) => {
    try {
      const msal = await initializeMsal();
      const response = await msal.acquireTokenSilent({
        ...tokenRequest,
        account: accountInfo,
      });

      setAccessToken(response.accessToken);
      setIsAuthenticated(true);
      setError(null);
      return response.accessToken;
    } catch (err) {
      console.error('Silent token acquisition failed:', err);
      setAccessToken(null);
      setIsAuthenticated(false);
      return null;
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const msal = await initializeMsal();
      const response = await msal.loginPopup(loginRequest);

      if (response.account) {
        setAccount(response.account);
        const token = await acquireTokenSilently(response.account);
        
        if (token) {
          console.log('Successfully authenticated with Power BI');
        }
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const msal = await initializeMsal();
      await msal.logoutPopup();
      
      setAccessToken(null);
      setIsAuthenticated(false);
      setAccount(null);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!account) return null;
    return await acquireTokenSilently(account);
  };

  return (
    <PowerBIAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        accessToken,
        account,
        login,
        logout,
        getAccessToken,
        error,
      }}
    >
      {children}
    </PowerBIAuthContext.Provider>
  );
}

export const usePowerBIAuth = () => {
  const context = useContext(PowerBIAuthContext);
  if (!context) {
    throw new Error('usePowerBIAuth must be used within PowerBIAuthProvider');
  }
  return context;
};
```

### 3.4 Wrap App with Provider

Update `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PowerBIAuthProvider } from './contexts/PowerBIAuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <PowerBIAuthProvider>
        <App />
      </PowerBIAuthProvider>
    </AuthProvider>
  </React.StrictMode>
);
```

---

## Step 4: Create Power BI Embed Component (2-3 hours)

### 4.1 Create PowerBIEmbed Component

Create `src/components/Dashboard/PowerBI/PowerBIEmbed.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { PowerBIEmbed as PowerBIEmbedComponent } from 'powerbi-client-react';
import { models, Report, Embed } from 'powerbi-client';
import { usePowerBIAuth } from '../../../contexts/PowerBIAuthContext';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';

interface PowerBIEmbedProps {
  embedUrl: string;
  reportId: string;
  groupId?: string;
  pageName?: string;
  filters?: models.IFilter[];
}

export default function PowerBIEmbed({
  embedUrl,
  reportId,
  groupId,
  pageName,
  filters = [],
}: PowerBIEmbedProps) {
  const { isAuthenticated, isLoading, accessToken, login, error } = usePowerBIAuth();
  const [report, setReport] = useState<Report | null>(null);

  const embedConfig: models.IReportEmbedConfiguration = {
    type: 'report',
    id: reportId,
    embedUrl: embedUrl,
    accessToken: accessToken || '',
    tokenType: models.TokenType.Aad,
    permissions: models.Permissions.Read,
    viewMode: models.ViewMode.View,
    settings: {
      panes: {
        filters: {
          expanded: false,
          visible: true,
        },
        pageNavigation: {
          visible: true,
        },
      },
      background: models.BackgroundType.Transparent,
      layoutType: models.LayoutType.Custom,
      customLayout: {
        displayOption: models.DisplayOption.FitToWidth,
      },
    },
    ...(groupId && { groupId }),
    ...(pageName && { pageName }),
    ...(filters.length > 0 && { filters }),
  };

  const handleEmbedded = (embedObject: Embed) => {
    setReport(embedObject as Report);
    console.log('Power BI report embedded successfully');
  };

  const handleError = (error: any) => {
    console.error('Power BI embed error:', error);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading Power BI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 font-semibold mb-2">Authentication Error</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 rounded-lg">
        <div className="text-center">
          <LogIn className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Sign in to Power BI
          </h3>
          <p className="text-slate-600 mb-6">
            Sign in with your organizational account to view Power BI reports
          </p>
          <button
            onClick={login}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="power-bi-container rounded-lg overflow-hidden border border-slate-200">
      <PowerBIEmbedComponent
        embedConfig={embedConfig}
        eventHandlers={
          new Map([
            ['loaded', () => console.log('Report loaded')],
            ['rendered', () => console.log('Report rendered')],
            ['error', handleError],
          ])
        }
        cssClassName="power-bi-frame"
        getEmbeddedComponent={handleEmbedded}
      />
    </div>
  );
}
```

### 4.2 Add CSS for Power BI Frame

Add to `src/index.css`:

```css
/* Power BI Embed Styles */
.power-bi-frame {
  width: 100%;
  height: 600px;
  border: none;
}

.power-bi-container {
  background: white;
}
```

### 4.3 Create Power BI Widget

Create `src/components/Dashboard/PowerBI/PowerBIWidget.tsx`:

```typescript
import { useState } from 'react';
import PowerBIEmbed from './PowerBIEmbed';
import { usePowerBIAuth } from '../../../contexts/PowerBIAuthContext';
import { LogOut, RefreshCw } from 'lucide-react';

export default function PowerBIWidget() {
  const { isAuthenticated, logout, account } = usePowerBIAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // TODO: Replace with your actual Power BI report details
  const embedUrl = "YOUR_EMBED_URL_HERE";
  const reportId = "YOUR_REPORT_ID_HERE";
  const groupId = "YOUR_WORKSPACE_ID_HERE";

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Power BI Reports</h2>
          {isAuthenticated && account && (
            <p className="text-sm text-slate-600 mt-1">
              Signed in as: {account.username}
            </p>
          )}
        </div>
        {isAuthenticated && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh report"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Power BI Embed */}
      <PowerBIEmbed
        key={refreshKey}
        embedUrl={embedUrl}
        reportId={reportId}
        groupId={groupId}
      />

      {/* Info */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This report is synchronized with PQMAP data every 15 minutes.
          For real-time analysis, use the Report Builder.
        </p>
      </div>
    </div>
  );
}
```

### 4.4 Add to Dashboard

Update `src/types/dashboard.ts`:

```typescript
export type WidgetId = 
  | 'stats-cards'
  | 'substation-map'
  | 'sarfi-chart'
  | 'root-cause-chart'
  | 'insight-chart'
  | 'affected-customer-chart'
  | 'event-list'
  | 'sarfi-70-monitor'
  | 'report-builder'
  | 'power-bi-reports'; // Add this

// Add to WIDGET_CATALOG:
'power-bi-reports': {
  id: 'power-bi-reports',
  title: 'Power BI Reports',
  description: 'Advanced Power BI dashboards and reports',
  defaultSize: 'full',
  locked: true,
},
```

Update `src/components/Dashboard/Dashboard.tsx`:

```typescript
import PowerBIWidget from './PowerBI/PowerBIWidget';

// In renderWidget():
case 'power-bi-reports':
  return <PowerBIWidget />;
```

---

## Step 5: Implement Data Push Service (3-4 hours)

### 5.1 Get Power BI REST API Credentials

You'll need a **Service Principal** for automated data push:

1. In Azure Portal, go to your app registration
2. Go to **Certificates & secrets**
3. Click **New client secret**
4. Description: "PQMAP Data Push Service"
5. Expires: 24 months
6. Click **Add**
7. **Copy the secret value** immediately (you can't see it again!)

Add to `.env.local`:
```env
VITE_AZURE_CLIENT_SECRET=your-client-secret-here
```

### 5.2 Create Power BI Service Client

Create `src/lib/powerbi/powerbiService.ts`:

```typescript
interface PowerBIConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

interface PowerBIDataset {
  id: string;
  name: string;
  tables: {
    name: string;
    rows: any[];
  }[];
}

export class PowerBIService {
  private config: PowerBIConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: PowerBIConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new token
    const tokenEndpoint = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
    
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://analysis.windows.net/powerbi/api/.default',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return this.accessToken;
  }

  async createDataset(workspaceId: string, dataset: any): Promise<string> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataset),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create dataset: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  async pushData(
    workspaceId: string,
    datasetId: string,
    tableName: string,
    rows: any[]
  ): Promise<void> {
    const token = await this.getAccessToken();
    
    // Clear existing rows first
    await this.clearTable(workspaceId, datasetId, tableName);

    // Push new rows in batches of 10,000 (Power BI limit)
    const batchSize = 10000;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      const response = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rows: batch }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to push data: ${response.statusText}`);
      }
    }
  }

  async clearTable(
    workspaceId: string,
    datasetId: string,
    tableName: string
  ): Promise<void> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to clear table: ${response.statusText}`);
    }
  }

  async refreshDataset(workspaceId: string, datasetId: string): Promise<void> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to refresh dataset: ${response.statusText}`);
    }
  }
}
```

### 5.3 Create Supabase Edge Function for Data Push

Create `supabase/functions/push-to-powerbi/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PowerBIConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  workspaceId: string;
  datasetId: string;
}

async function getPowerBIToken(config: PowerBIConfig): Promise<string> {
  const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://analysis.windows.net/powerbi/api/.default',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json();
  return data.access_token;
}

async function pushDataToPowerBI(
  token: string,
  workspaceId: string,
  datasetId: string,
  tableName: string,
  rows: any[]
): Promise<void> {
  // Clear existing data
  await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  // Push new data in batches
  const batchSize = 10000;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows: batch }),
      }
    );
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get configuration from environment
    const config: PowerBIConfig = {
      clientId: Deno.env.get('POWERBI_CLIENT_ID')!,
      clientSecret: Deno.env.get('POWERBI_CLIENT_SECRET')!,
      tenantId: Deno.env.get('POWERBI_TENANT_ID')!,
      workspaceId: Deno.env.get('POWERBI_WORKSPACE_ID')!,
      datasetId: Deno.env.get('POWERBI_DATASET_ID')!,
    };

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch data from Supabase
    const { data: events, error } = await supabaseClient
      .from('pq_events')
      .select(`
        event_id,
        event_date,
        event_type,
        severity,
        duration_ms,
        affected_customers,
        substation_name,
        root_cause,
        false_event
      `)
      .order('event_date', { ascending: false });

    if (error) throw error;

    // Transform data for Power BI
    const transformedData = events.map(event => ({
      EventID: event.event_id,
      EventDate: event.event_date,
      EventType: event.event_type,
      Severity: event.severity,
      DurationMs: event.duration_ms,
      AffectedCustomers: event.affected_customers || 0,
      SubstationName: event.substation_name,
      RootCause: event.root_cause || 'Unknown',
      IsFalseEvent: event.false_event || false,
    }));

    // Get Power BI access token
    const token = await getPowerBIToken(config);

    // Push data to Power BI
    await pushDataToPowerBI(
      token,
      config.workspaceId,
      config.datasetId,
      'Events',
      transformedData
    );

    console.log(`Successfully pushed ${transformedData.length} events to Power BI`);

    return new Response(
      JSON.stringify({
        success: true,
        recordsPushed: transformedData.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error pushing to Power BI:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

### 5.4 Deploy Edge Function

```bash
# Deploy to Supabase
supabase functions deploy push-to-powerbi

# Set environment variables in Supabase Dashboard
# Settings → Edge Functions → push-to-powerbi → Secrets:
POWERBI_CLIENT_ID=your-client-id
POWERBI_CLIENT_SECRET=your-client-secret
POWERBI_TENANT_ID=your-tenant-id
POWERBI_WORKSPACE_ID=your-workspace-id
POWERBI_DATASET_ID=your-dataset-id
```

### 5.5 Schedule Regular Sync (15 minutes)

Use Supabase pg_cron extension:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule function to run every 15 minutes
SELECT cron.schedule(
  'push-to-powerbi-every-15-min',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/push-to-powerbi',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## Step 6: Testing & Validation (1-2 hours)

### 6.1 Test SSO Authentication

1. Start dev server: `npm run dev`
2. Navigate to Dashboard
3. Add "Power BI Reports" widget
4. Click "Sign in with Microsoft"
5. Verify popup appears
6. Sign in with your Pro account
7. Verify report loads successfully

### 6.2 Test Data Push

```bash
# Manually trigger edge function
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/push-to-powerbi \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Check response
# Should see: {"success": true, "recordsPushed": XXXX, "timestamp": "..."}
```

### 6.3 Verify in Power BI Service

1. Open Power BI Service
2. Go to your workspace
3. Open dataset
4. Click "Refresh now"
5. Check refresh history
6. Verify data is up to date

### 6.4 Test Auto-Refresh

Wait 15 minutes and check:
```sql
-- Check last sync time
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'push-to-powerbi-every-15-min')
ORDER BY start_time DESC 
LIMIT 1;
```

---

## Step 7: Production Deployment

### 7.1 Environment Variables

Create `.env.production`:

```env
# Power BI Azure AD Configuration
VITE_AZURE_CLIENT_ID=your-prod-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_REDIRECT_URI=https://your-production-domain.com/auth/callback

# These should be in Supabase Edge Function secrets, NOT in frontend
# POWERBI_CLIENT_SECRET=xxx
# POWERBI_WORKSPACE_ID=xxx
# POWERBI_DATASET_ID=xxx
```

### 7.2 Update Azure AD Redirect URIs

1. Go to Azure Portal → Your App → Authentication
2. Add production redirect URI
3. Save

### 7.3 Build and Deploy

```bash
# Build production bundle
npm run build

# Deploy to your hosting platform (Vercel, Netlify, etc.)
# Example for Vercel:
vercel --prod
```

### 7.4 Monitor Performance

Track these metrics:
- Power BI embed load time
- Data push duration
- Sync success rate
- User authentication errors

---

## Troubleshooting

### Issue: "AADSTS65001: The user or administrator has not consented"
**Solution**: Go to Azure AD app → API permissions → Grant admin consent

### Issue: "Dataset not found"
**Solution**: Verify dataset ID in Power BI Service → Dataset → Settings → Copy Dataset ID

### Issue: "401 Unauthorized" when pushing data
**Solution**: Check client secret hasn't expired, verify service principal permissions

### Issue: Report not loading
**Solution**: Check embed URL is correct, verify user has Pro license, check browser console

### Issue: Sync not running
**Solution**: Check pg_cron schedule, verify edge function deployed, check Supabase logs

---

## Summary

**You now have:**
- ✅ Power BI SSO authentication
- ✅ Embedded Power BI reports in PQMAP
- ✅ Automated data push every 15 minutes
- ✅ Seamless user experience

**Total Implementation Time**: 10-15 hours spread over 2-4 weeks

**Next Steps**:
1. Start with Step 1 (Quick test)
2. Set up Azure AD (Step 2)
3. Implement one step at a time
4. Test thoroughly before moving to next step
5. Deploy to production

Need help with any specific step? Let me know!
