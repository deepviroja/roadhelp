import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface SystemLogEntry {
  type: 'navigation' | 'error' | 'warning' | 'info';
  message: string;
  componentName?: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
  pagePath: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

export function parseErrorStack(stack?: string) {
  if (!stack) return { file: 'Unknown', line: 0, column: 0 };
  
  const lines = stack.split('\n');
  // Look for the first line that belongs to our src code
  const srcLine = lines.find(line => line.includes('/src/') || line.includes('.tsx') || line.includes('.ts'));
  if (srcLine) {
    // Matches patterns like "/src/pages/admin/ManageProviders.tsx:50:23"
    const match = srcLine.match(/(\/src\/[^\s\?:]+)(?:\?[^\s:]+)?(?::(\d+))(?::(\d+))?/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : 0
      };
    }
  }
  return { file: 'Unknown', line: 0, column: 0 };
}

export async function logSystemEvent(entry: Omit<SystemLogEntry, 'pagePath'>) {
  try {
    const pagePath = window.location.pathname + window.location.search;
    await addDoc(collection(db, 'systemLogs'), {
      ...entry,
      pagePath,
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[SystemLogger] Failed to write system log:', err);
  }
}
