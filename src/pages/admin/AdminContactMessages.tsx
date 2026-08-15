import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Reply, CheckCircle2, Clock, Trash2, Send, Search, User } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db } from '@/config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { getAuth } from 'firebase/auth';

import { logAdminAction } from '@/lib/auditLogger';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: 'pending' | 'replied';
  replyText?: string;
  repliedAt?: string;
  repliedBy?: string;
  createdAt: string;
}

import { useSystemStore } from '@/stores/systemStore';

export default function AdminContactMessages() {
  const { profile } = useAuth();
  const { appName, supportEmail, smtpFromEmail } = useSystemStore();
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMessage, setSelectedMessage] = useState<ContactSubmission | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'contactSubmissions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactSubmission));
      setMessages(docs);
      setIsLoading(false);
    }, (err) => {
      console.warn('[AdminContactMessages] Read error:', err);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredMessages = messages.filter((msg) => {
    const matchesFilter = filter === 'all' || msg.status === filter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (msg.name || '').toLowerCase().includes(q) ||
      (msg.email || '').toLowerCase().includes(q) ||
      (msg.subject || '').toLowerCase().includes(q) ||
      (msg.message || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const handleOpenReplyModal = (msg: ContactSubmission) => {
    setSelectedMessage(msg);
    const activeSender = smtpFromEmail || supportEmail || profile?.email || 'admin@roadhelp.com';
    setReplyText(msg.replyText || `Hello ${msg.name},\n\nThank you for contacting ${appName} Support regarding "${msg.subject || 'your inquiry'}". We have reviewed your message and would like to assist you.\n\nBest regards,\n${appName} Support Team (${activeSender})`);
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) {
      toast.error('Please enter a response message');
      return;
    }

    setIsSending(true);
    try {
      const docRef = doc(db, 'contactSubmissions', selectedMessage.id);
      const repliedAt = new Date().toISOString();
      const repliedBy = smtpFromEmail || supportEmail || profile?.email || 'admin@roadhelp.com';

      await updateDoc(docRef, {
        status: 'replied',
        replyText: replyText.trim(),
        repliedAt,
        repliedBy,
      });

      await logAdminAction({
        adminEmail: repliedBy,
        adminName: profile?.fullName || 'Super Admin',
        action: 'REPLY_CONTACT_INQUIRY',
        module: 'Contact Messages',
        details: `Sent reply to ${selectedMessage.name} (${selectedMessage.email})`,
        targetId: selectedMessage.id,
      });

      // Call backend API instead of mailto:
      const token = await getAuth().currentUser?.getIdToken(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/contact/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: selectedMessage.email,
          subject: `RE: ${selectedMessage.subject || 'RoadHelp Inquiry'}`,
          replyText: replyText.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to dispatch email via server');
      }

      toast.success(`Reply email sent successfully to ${selectedMessage.email}`);
      setSelectedMessage(null);
      setReplyText('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msg: ContactSubmission) => {
    if (!confirm(`Delete message from ${msg.name}?`)) return;
    try {
      await deleteDoc(doc(db, 'contactSubmissions', msg.id));
      await logAdminAction({
        adminEmail: profile?.email || 'admin@roadhelp.com',
        action: 'DELETE_CONTACT_INQUIRY',
        module: 'Contact Messages',
        details: `Deleted message from ${msg.name}`,
        targetId: msg.id,
      });
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
                <MessageSquare className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Contact Messages & Inquiries</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Review messages submitted via the Contact page and send email replies directly within the dashboard.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, email, subject..."
              className="h-12 rounded-2xl pl-12 bg-white border-slate-200 font-semibold"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 border-b border-slate-200 pb-4">
          <button onClick={() => setFilter('all')} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            All Messages ({messages.length})
          </button>
          <button onClick={() => setFilter('pending')} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${filter === 'pending' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            Pending ({messages.filter((m) => m.status === 'pending').length})
          </button>
          <button onClick={() => setFilter('replied')} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${filter === 'replied' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            Replied ({messages.filter((m) => m.status === 'replied').length})
          </button>
        </div>

        {/* Reply Modal */}
        <Modal
          isOpen={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          title={`Reply to ${selectedMessage?.name || 'Customer'}`}
          subtitle={`${selectedMessage?.email || ''} ${selectedMessage?.phone ? `â€¢ ${selectedMessage?.phone}` : ''}`}
          icon={<MessageSquare className="w-6 h-6" />}
          footer={
            <>
              <Button variant="outline" onClick={() => setSelectedMessage(null)} className="rounded-xl h-11 px-5 font-black text-xs uppercase tracking-widest">
                Cancel
              </Button>
              <Button onClick={handleSendReply} disabled={isSending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20">
                <Send className="w-4 h-4 mr-2" /> {isSending ? 'Sending...' : 'Save & Send Reply'}
              </Button>
            </>
          }
        >
          {selectedMessage && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">User Inquiry ({selectedMessage.subject || 'General'})</p>
                <p className="text-xs text-slate-700 font-medium italic">"{selectedMessage.message}"</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Email Response</Label>
                <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={6} className="rounded-2xl bg-slate-50 border-slate-200 font-medium text-xs leading-relaxed" />
              </div>
            </div>
          )}
        </Modal>

        {/* Messages List */}
        <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Submitted Inquiries</h3>
            <span className="text-xs font-bold text-slate-500">{filteredMessages.length} Messages</span>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs">Loading contact messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs">No contact inquiries found.</div>
            ) : (
              filteredMessages.map((msg) => (
                <div key={msg.id} className="p-6 space-y-3 hover:bg-slate-50/60 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">{msg.name}</h4>
                          <span className="text-xs text-slate-500 font-medium">({msg.email})</span>
                        </div>
                        <p className="text-xs text-slate-400 font-semibold">{msg.phone ? `Phone: ${msg.phone} â€¢ ` : ''}Subject: {msg.subject || 'General Inquiry'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${msg.status === 'replied' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {msg.status === 'replied' ? 'Replied' : 'Pending'}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenReplyModal(msg)} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-blue-600">
                        <Reply className="w-4 h-4 mr-1" /> {msg.status === 'replied' ? 'View / Re-reply' : 'Reply'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteMessage(msg)} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">"{msg.message}"</p>
                  </div>

                  {msg.status === 'replied' && msg.replyText && (
                    <div className="bg-green-50/60 p-4 rounded-2xl border border-green-200 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Admin Response ({msg.repliedBy || 'Admin'})</p>
                      <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">{msg.replyText}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

