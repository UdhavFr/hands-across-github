/**
 * RLS Diagnostics Component
 * 
 * Helps diagnose and fix Row Level Security policy violations
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Copy, Database, Shield, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { COMPLETE_RLS_SETUP, RLS_DIAGNOSTICS, QUICK_FIXES } from '../utils/rlsFixes';
import toast from 'react-hot-toast';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export function RLSDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showSQLFix, setShowSQLFix] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Test 1: Check user authentication
      try {
        const { data: authData, error: authError } = await supabase.rpc('auth.uid');
        if (authError) throw authError;
        
        diagnosticResults.push({
          test: 'User Authentication',
          status: authData ? 'success' : 'error',
          message: authData ? `Authenticated as user: ${authData}` : 'User not authenticated',
          data: authData
        });
      } catch (error) {
        diagnosticResults.push({
          test: 'User Authentication',
          status: 'error',
          message: `Auth check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }

      // Test 2: Check NGO profile access
      try {
        const { data: ngoData, error: ngoError } = await supabase
          .from('ngo_profiles')
          .select('id, user_id, name')
          .limit(1);

        if (ngoError) throw ngoError;
        
        diagnosticResults.push({
          test: 'NGO Profile Access',
          status: 'success',
          message: `Can access NGO profiles. Found ${ngoData?.length || 0} profiles.`,
          data: ngoData
        });
      } catch (error) {
        diagnosticResults.push({
          test: 'NGO Profile Access',
          status: 'error',
          message: `NGO profile access failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }

      // Test 3: Check events access
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, title, ngo_id')
          .limit(1);

        if (eventsError) throw eventsError;
        
        diagnosticResults.push({
          test: 'Events Access',
          status: 'success',
          message: `Can access events. Found ${eventsData?.length || 0} events.`,
          data: eventsData
        });
      } catch (error) {
        diagnosticResults.push({
          test: 'Events Access',
          status: 'error',
          message: `Events access failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }

      // Test 4: Try to insert a test record (will fail with RLS error if policies are wrong)
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('user_preferences')
          .insert({ preferences: { test: true } })
          .select();

        if (insertError) throw insertError;
        
        // Clean up test record
        if (insertData && insertData.length > 0) {
          await supabase
            .from('user_preferences')
            .delete()
            .eq('id', insertData[0].id);
        }
        
        diagnosticResults.push({
          test: 'Insert Test',
          status: 'success',
          message: 'Can insert records successfully',
        });
      } catch (error) {
        diagnosticResults.push({
          test: 'Insert Test',
          status: 'error',
          message: `Insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }

    } catch (error) {
      diagnosticResults.push({
        test: 'General Error',
        status: 'error',
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL copied to clipboard!');
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const hasErrors = results.some(r => r.status === 'error');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">RLS Diagnostics</h2>
          </div>
          
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Database className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Diagnostic Results</h3>
            
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success' ? 'bg-green-50 border-green-200' :
                  result.status === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{result.test}</h4>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.data && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasErrors && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900">RLS Policy Issues Detected</h4>
                <p className="text-sm text-red-700 mt-1">
                  Row Level Security policies may be missing or incorrectly configured. 
                  Use the SQL fix below to resolve these issues.
                </p>
                
                <button
                  onClick={() => setShowSQLFix(!showSQLFix)}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                >
                  {showSQLFix ? 'Hide' : 'Show'} SQL Fix
                </button>
              </div>
            </div>
          </div>
        )}

        {showSQLFix && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Complete RLS Setup SQL</h4>
              <button
                onClick={() => copyToClipboard(COMPLETE_RLS_SETUP)}
                className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy SQL
              </button>
            </div>
            
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm whitespace-pre-wrap">{COMPLETE_RLS_SETUP}</pre>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">How to apply this fix:</h5>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Copy the SQL above</li>
                <li>Go to your Supabase dashboard</li>
                <li>Navigate to the SQL Editor</li>
                <li>Paste and run the SQL script</li>
                <li>Run the diagnostics again to verify the fix</li>
              </ol>
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Click "Run Diagnostics" to check your RLS configuration</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => copyToClipboard(RLS_DIAGNOSTICS.checkUserAuth)}
            className="flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <User className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <div className="font-medium text-gray-900">Check User Auth</div>
              <div className="text-sm text-gray-500">Copy SQL to check current user</div>
            </div>
          </button>
          
          <button
            onClick={() => copyToClipboard(QUICK_FIXES.checkRLSStatus)}
            className="flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Shield className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <div className="font-medium text-gray-900">Check RLS Status</div>
              <div className="text-sm text-gray-500">Copy SQL to check table policies</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}