'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getWorkspaceFocusMode, setWorkspaceFocusMode } from './workspaceLayoutStorage';

interface WorkspaceFocusContextValue {
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => boolean;
}

const WorkspaceFocusContext = createContext<WorkspaceFocusContextValue | null>(null);

export function WorkspaceFocusProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusModeState] = useState(() => getWorkspaceFocusMode());

  const setFocusMode = useCallback((value: boolean) => {
    setFocusModeState(value);
    setWorkspaceFocusMode(value);
  }, []);

  const toggleFocusMode = useCallback(() => {
    let next = false;
    setFocusModeState(prev => {
      next = !prev;
      setWorkspaceFocusMode(next);
      return next;
    });
    return next;
  }, []);

  useEffect(() => {
    if (focusMode) {
      document.documentElement.dataset.workspaceFocus = 'true';
    } else {
      delete document.documentElement.dataset.workspaceFocus;
    }
    return () => {
      delete document.documentElement.dataset.workspaceFocus;
    };
  }, [focusMode]);

  return (
    <WorkspaceFocusContext.Provider value={{ focusMode, setFocusMode, toggleFocusMode }}>
      {children}
    </WorkspaceFocusContext.Provider>
  );
}

export function useWorkspaceFocus(): WorkspaceFocusContextValue {
  const ctx = useContext(WorkspaceFocusContext);
  if (!ctx) {
    throw new Error('useWorkspaceFocus must be used within WorkspaceFocusProvider');
  }
  return ctx;
}

export function useWorkspaceFocusOptional(): WorkspaceFocusContextValue | null {
  return useContext(WorkspaceFocusContext);
}
