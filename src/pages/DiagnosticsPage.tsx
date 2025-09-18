/**
 * Diagnostics Page
 * 
 * Provides access to various diagnostic tools including RLS diagnostics
 */

import React from 'react';
import { RLSDiagnostics } from '../components/RLSDiagnostics';
import { Header } from '../components/Header';

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-8">
        <RLSDiagnostics />
      </main>
    </div>
  );
}