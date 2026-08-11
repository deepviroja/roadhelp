import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface AuditLogEntry {
  adminEmail: string;
  adminName?: string;
  action: string;
  module: string;
  details?: string;
  targetId?: string;
}

export async function logAdminAction(entry: AuditLogEntry) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      ...entry,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[AuditLogger] Failed to record log entry:', err);
  }
}
