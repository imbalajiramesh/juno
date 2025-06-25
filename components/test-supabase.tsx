'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function TestSupabase() {
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing connection...');
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function testConnection() {
      try {
        console.log('Testing Supabase connection...');
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        console.log('Base URL:', baseUrl);
        addDiagnostic(`Testing connection to ${baseUrl}`);
        
        // Try different health check endpoints
        const healthEndpoints = [
          '/rest/v1/health',
          '/api/health',
          '/health'
        ];

        let healthCheckSucceeded = false;
        for (const endpoint of healthEndpoints) {
          try {
            addDiagnostic(`Trying health check at ${endpoint}...`);
            const response = await fetch(`${baseUrl}${endpoint}`);
            const health = await response.json();
            console.log(`Health check response from ${endpoint}:`, health);
            addDiagnostic(`Health check succeeded at ${endpoint}`);
            healthCheckSucceeded = true;
            break;
          } catch (healthError) {
            console.error(`Health check failed at ${endpoint}:`, healthError);
            addDiagnostic(`Health check failed at ${endpoint}: ${(healthError as any)?.message || 'Unknown error'}`);
          }
        }

        if (!healthCheckSucceeded) {
          setConnectionStatus('All health checks failed');
          setError({
            message: 'All health checks failed',
            details: 'Could not connect to any health check endpoint',
            hint: 'The server might be down, unreachable, or the URL might be incorrect. Try these troubleshooting steps:\n1. Check if the URL is correct\n2. Verify the server is running\n3. Check for any network/firewall issues\n4. Verify CORS settings'
          });
          return;
        }

        // If health check passes, test database query
        setConnectionStatus('Testing database query...');
        addDiagnostic('Attempting database query...');
        
        const { data: interactionsData, error: interactionsError } = await supabase
          .from('interactions')
          .select('*')
          .limit(1);

        if (interactionsError) {
          console.error('Query error:', interactionsError);
          setConnectionStatus('Database query failed');
          addDiagnostic(`Database query failed: ${interactionsError.message}`);
          setError(interactionsError);
          return;
        }

        console.log('Query successful:', interactionsData);
        setConnectionStatus('Connection successful');
        addDiagnostic('Database query succeeded');
        setData(interactionsData);

      } catch (err: any) {
        console.error('Caught error:', err);
        setConnectionStatus('Connection failed');
        addDiagnostic(`Connection failed: ${err?.message || 'Unknown error'}`);
        setError({
          message: err?.message || 'Unknown error',
          details: err?.toString(),
          hint: 'Check your network connection and Supabase configuration'
        });
      }
    }

    function addDiagnostic(message: string) {
      setDiagnostics(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    }

    testConnection();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Supabase Connection Test</h2>
      <div className="mb-4">
        <strong>URL being used:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
      </div>
      <div className="mb-4">
        <strong>Connection Status:</strong> {connectionStatus}
      </div>
      <div className="mb-4">
        <h3 className="font-bold mb-2">Diagnostic Log:</h3>
        <pre className="bg-gray-100 p-2 rounded text-sm">
          {diagnostics.join('\n')}
        </pre>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold mb-2">Error Details:</h3>
          <pre className="whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      {data && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <h3 className="font-bold mb-2">Data Received:</h3>
          <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
} 