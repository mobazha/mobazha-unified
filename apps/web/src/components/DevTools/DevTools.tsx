'use client';

import React, { useState } from 'react';
import { useConfig } from '@mobazha/core';

/**
 * DevTools Component
 *
 * A floating development tools panel that allows switching between
 * mock data and real API mode. Only visible in development environment.
 */
export function DevTools() {
  const { isMockMode, toggleMock, config } = useConfig();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="mb-2 bg-slate-900 text-white rounded-lg shadow-2xl p-4 w-72 animate-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-sm">🛠️ Dev Tools</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Data Source Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Data Source</p>
                <p className="text-xs text-slate-400">
                  {isMockMode ? 'Using mock data' : 'Using real API'}
                </p>
              </div>
              <button
                onClick={toggleMock}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  isMockMode ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${
                    isMockMode ? 'translate-x-0' : 'translate-x-7'
                  }`}
                >
                  {isMockMode ? '🎭' : '🔗'}
                </span>
              </button>
            </div>

            {/* Status Indicator */}
            <div
              className={`p-2 rounded-lg text-xs ${
                isMockMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${isMockMode ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}
                />
                <span>{isMockMode ? 'Mock Mode Active' : 'API Mode Active'}</span>
              </div>
            </div>

            {/* Config Info */}
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>API URL:</span>
                <span className="text-slate-300 truncate max-w-[150px]">{config.apiBaseUrl}</span>
              </div>
              <div className="flex justify-between">
                <span>Debug:</span>
                <span className="text-slate-300">{config.debug ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                Clear Storage
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
          isMockMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
        }`}
        title={`${isMockMode ? 'Mock' : 'API'} Mode - Click to configure`}
      >
        <span className="text-xl">{isMockMode ? '🎭' : '🔗'}</span>
      </button>
    </div>
  );
}

export default DevTools;
