"use client";

// ═══════════════════════════════════════════════════════════════
// AdminBroadcast — Broadcast message page for Admin Panel
// Send bulk messages to Messenger/Instagram/LINE/WhatsApp contacts
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocaleStore } from "@/store/useLocaleStore";
import Swal from 'sweetalert2';

// ─── Types ───────────────────────────────────────────────────
interface BroadcastContact {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    platformContactId: string;
    channel: { id: string; type: string; name: string };
    lastMessageAt: string;
    tags: { id: string; name: string; color: string }[];
}

interface TagOption {
    id: string;
    name: string;
    color: string;
}

interface ChannelOption {
    id: string;
    type: string;
    name: string;
}

interface SendResult {
    contactId: string;
    contactName: string;
    success: boolean;
    error?: string;
}

interface BroadcastResult {
    totalTargets: number;
    successCount: number;
    failCount: number;
    results: SendResult[];
    sentAt: string;
    sentBy: string;
}

type BroadcastStep = 'compose' | 'audience' | 'preview' | 'sending' | 'result';

// ─── Channel Icon Map ────────────────────────────────────────
const channelIcons: Record<string, string> = {
    MESSENGER: '💬',
    INSTAGRAM: '📷',
    LINE: '💚',
    WHATSAPP: '🟢',
    ZALO: '🔵',
};

const channelColors: Record<string, string> = {
    MESSENGER: 'bg-blue-100 text-blue-700 border-blue-200',
    INSTAGRAM: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200',
    LINE: 'bg-green-100 text-green-700 border-green-200',
    WHATSAPP: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ZALO: 'bg-sky-100 text-sky-700 border-sky-200',
};

// ─── Facebook MESSAGE_TAG options will be defined in component ────────────────────────────


export default function AdminBroadcast() {
    const { t } = useLocaleStore();
    // ─── State ───────────────────────────────────────────────
    const [step, setStep] = useState<BroadcastStep>('audience');
    const [message, setMessage] = useState('');
    const [selectedTag, setSelectedTag] = useState(''); // default: No TAG (24h)


    // Adverra-style features
    const [sendDelay, setSendDelay] = useState(1); // seconds between each message
    const [sendRangeStart, setSendRangeStart] = useState(1);
    const [sendRangeEnd, setSendRangeEnd] = useState(0); // 0 = all
    const [syncLimit, setSyncLimit] = useState(0); // 0 = all, otherwise limit conversations to fetch

    // Image attachment
    const [attachedImage, setAttachedImage] = useState<{ previewUrl: string; filename: string; size: number } | null>(null);
    const [imageUploading, setImageUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setAttachedImage({
                    previewUrl: data.data.previewUrl,
                    filename: data.data.filename,
                    size: data.data.size,
                });
            } else {
                Swal.fire({ text: String(data.error || 'Upload failed'), icon: 'info' });
            }
        } catch {
            Swal.fire({ text: 'Upload error', icon: 'info' });
        } finally {
            setImageUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    // Audience
    const [contacts, setContacts] = useState<BroadcastContact[]>([]);
    const [allTags, setAllTags] = useState<TagOption[]>([]);
    const [allChannels, setAllChannels] = useState<ChannelOption[]>([]);
    const [channelFilter, setChannelFilter] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [contactPage, setContactPage] = useState(1);
    const [contactTotalPages, setContactTotalPages] = useState(1);
    const [contactTotal, setContactTotal] = useState(0);
    const CONTACTS_LIMIT = 50;

    // Sending
    const [sending, setSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
    const [sendAllMode, setSendAllMode] = useState(false); // Send all
    const [sendError, setSendError] = useState<string | null>(null); // Show error

    // Sync PSID — Realtime progress
    const [syncing, setSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStepLabel, setSyncStepLabel] = useState('');
    const [syncDetails, setSyncDetails] = useState('');
    const [syncResult, setSyncResult] = useState<{
        totalFound: number;
        newContacts: number;
        updatedContacts: number;
        errors: number;
        message: string;
        errorDetail?: string;
    } | null>(null);

    // History
    const [broadcastHistory, setBroadcastHistory] = useState<BroadcastResult[]>([]);

    // Permission Triggers
    const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
    const [triggerResults, setTriggerResults] = useState<Record<string, { success: boolean; message: string }>>({});

    // Auth
    const { accessToken, connectedPage } = useAuthStore();

    // Build auth headers that work with both JWT and Facebook/bypass auth
    const getAuthHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = {};
        const chatToken = localStorage.getItem('chat-auth-token');
        if (chatToken) {
            headers['Authorization'] = `Bearer ${chatToken}`;
        } else if (accessToken && accessToken !== 'demo_token') {
            headers['x-fb-token'] = accessToken;
        } else {
            headers['x-admin-bypass'] = 'true';
        }
        // Send Page Access Token from login
        if (connectedPage?.accessToken && connectedPage.accessToken !== 'demo_page_token') {
            headers['x-page-token'] = connectedPage.accessToken;
        }
        return headers;
    }, [accessToken, connectedPage]);

    // ─── Fetch Contacts (paginated) ────────────────────────────
    const fetchContacts = useCallback(async (page = 1) => {
        setContactsLoading(true);
        try {
            const params = new URLSearchParams();
            if (channelFilter) params.set('channel', channelFilter);
            if (tagFilter) params.set('tag', tagFilter);
            if (searchQuery) params.set('search', searchQuery);
            params.set('page', String(page));
            params.set('limit', String(CONTACTS_LIMIT));
            params.set('_t', String(Date.now()));

            const res = await fetch(`/api/broadcast/contacts?${params.toString()}`, {
                headers: getAuthHeaders(),
                cache: 'no-store',
            });
            const data = await res.json();
            if (data.success) {
                setContacts(data.data.contacts);
                setAllTags(data.data.tags);
                setAllChannels(data.data.channels);
                if (data.pagination) {
                    setContactPage(data.pagination.page);
                    setContactTotalPages(data.pagination.totalPages);
                    setContactTotal(data.pagination.total);
                }
            }
        } catch (err) {
            console.error('Failed to fetch contacts:', err);
        } finally {
            setContactsLoading(false);
        }
    }, [channelFilter, tagFilter, searchQuery, getAuthHeaders]);

    const goToPage = useCallback((page: number) => {
        if (page < 1 || page > contactTotalPages) return;
        fetchContacts(page);
    }, [contactTotalPages, fetchContacts]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    // ─── Sync PSIDs from Facebook (SSE Realtime) ─────────────
    const handleSyncPSIDs = async () => {
        setSyncing(true);
        setSyncResult(null);
        setSyncProgress(0);
        setSyncStepLabel(t('bc.syncStart'));
        setSyncDetails('');

        try {
            const res = await fetch('/api/broadcast/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ limit: syncLimit || 0 }),
            });

            if (!res.ok || !res.body) {
                const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                setSyncResult({
                    totalFound: 0, newContacts: 0, updatedContacts: 0, errors: 1,
                    message: errorData.error || t('bc.syncError'),
                });
                setSyncing(false);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const event = JSON.parse(line.replace('data: ', ''));

                        if (event.type === 'step') {
                            setSyncStepLabel(event.label || '');
                            if (event.completed && event.percent) {
                                setSyncProgress(event.percent);
                            }
                        }

                        if (event.type === 'progress') {
                            setSyncProgress(event.percent || 0);
                            // Build detail text based on step
                            if (event.step === 1) {
                                setSyncDetails(`Page ${event.pagesFetched}/${event.maxPages} — Found ${event.psidsFound} PSID`);
                            } else if (event.step === 2) {
                                setSyncDetails(`Profile ${event.profilesFetched}/${event.totalProfiles}`);
                            } else if (event.step === 3) {
                                setSyncDetails(`Saved ${event.contactsSaved}/${event.totalContacts} — New ${event.newContacts} | Update ${event.updatedContacts}`);
                            }
                        }

                        if (event.type === 'complete') {
                            setSyncProgress(100);
                            setSyncStepLabel(t('bc.syncComplete'));
                            setSyncResult({
                                totalFound: event.totalFound,
                                newContacts: event.newContacts,
                                updatedContacts: event.updatedContacts,
                                errors: event.errors,
                                message: event.message,
                                errorDetail: event.errorDetail,
                            });
                            await fetchContacts();
                        }

                        if (event.type === 'error') {
                            setSyncStepLabel(t('bc.syncError'));
                            setSyncResult({
                                totalFound: 0, newContacts: 0, updatedContacts: 0, errors: 1,
                                message: event.error || t('bc.syncError'),
                            });
                        }
                    } catch {
                        // Skip malformed events
                    }
                }
            }
        } catch (err) {
            setSyncResult({
                totalFound: 0, newContacts: 0, updatedContacts: 0, errors: 1,
                message: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
            });
        } finally {
            setSyncing(false);
            // Wait a moment for DB writes to finish, then refresh contacts
            setTimeout(() => fetchContacts(), 1500);
        }
    };

    // ─── Contact Selection ───────────────────────────────────
    const filteredContacts = contacts.filter(c => {
        if (!searchQuery) return true;
        return c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.platformContactId.includes(searchQuery);
    });

    const toggleContact = (id: string) => {
        setSelectedContactIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedContactIds(new Set());
        } else {
            setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
        }
        setSelectAll(!selectAll);
    };

    useEffect(() => {
        setSelectAll(
            filteredContacts.length > 0 &&
            filteredContacts.every(c => selectedContactIds.has(c.id))
        );
    }, [selectedContactIds, filteredContacts]);

    // ─── Send Broadcast ──────────────────────────────────────
    const handleSendBroadcast = async () => {
        // sendAll bypass contact ids
        if (!sendAllMode && selectedContactIds.size === 0) return;
        // must have msg or img
        if (!message.trim() && !attachedImage) {
            setSendError('Please provide a message or attach an image');
            return;
        }

        setSendError(null);
        setStep('sending');
        setSending(true);
        setSendProgress(0);

        // Animate progress
        const progressInterval = setInterval(() => {
            setSendProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 15;
            });
        }, 500);

        try {
            const res = await fetch('/api/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({
                    // sendall bypass contacts
                    ...(sendAllMode
                        ? { sendAll: true, channelFilter: channelFilter || undefined }
                        : { contactIds: Array.from(selectedContactIds) }
                    ),
                    message: message.trim(),
                    messageType: attachedImage ? 'IMAGE' : 'TEXT',
                    imageUrl: attachedImage?.previewUrl || undefined,
                    tag: selectedTag || undefined,
                    delay: sendDelay,
                }),
            });

            const data = await res.json();

            clearInterval(progressInterval);
            setSendProgress(100);

            if (data.success) {
                setBroadcastResult(data.data);
                setBroadcastHistory(prev => [data.data, ...prev]);
            } else {
                setSendError(data.error || t('bc.sendFailed'));
                setBroadcastResult({
                    totalTargets: sendAllMode ? 0 : selectedContactIds.size,
                    successCount: 0,
                    failCount: sendAllMode ? 0 : selectedContactIds.size,
                    results: [],
                    sentAt: new Date().toISOString(),
                    sentBy: 'Unknown',
                });
            }

            setTimeout(() => setStep('result'), 500);
        } catch (err) {
            clearInterval(progressInterval);
            setSendProgress(100);
            const errMsg = err instanceof Error ? err.message : 'Server Connection Error';
            setSendError(errMsg);
            setBroadcastResult({
                totalTargets: sendAllMode ? 0 : selectedContactIds.size,
                successCount: 0,
                failCount: sendAllMode ? 0 : selectedContactIds.size,
                results: [],
                sentAt: new Date().toISOString(),
                sentBy: 'Unknown',
            });
            setTimeout(() => setStep('result'), 500);
        } finally {
            setSending(false);
        }
    };

    // enable sendall mode
    const handleSendAll = () => {
        setSendAllMode(true);
        setSelectedContactIds(new Set());
        setStep('compose');
    };

    const resetBroadcast = () => {
        setStep('compose');
        setMessage('');
        setSelectedTag('');
        setSelectedContactIds(new Set());
        setSelectAll(false);
        setBroadcastResult(null);
        setSendProgress(0);
        setSendAllMode(false);
        setSendError(null);
    };

    // ─── Permission Trigger Functions ────────────────────────
    const triggerPermission = async (action: string, label: string) => {
        let defaultPsid = '5609436299105172';
        let helperText = "(Leave default if you are using the demo account)";
        
        if (selectedContactIds.size > 0) {
            const firstSelectedId = Array.from(selectedContactIds)[0];
            const selectedContact = contacts.find(c => c.id === firstSelectedId);
            if (selectedContact && selectedContact.platformContactId) {
                defaultPsid = selectedContact.platformContactId;
                helperText = `(Auto-filled from selected contact: ${selectedContact.displayName})`;
            }
        }

        const result = await Swal.fire({
            title: `Enter Target PSID for ${label}`,
            text: helperText,
            input: 'text',
            inputValue: defaultPsid,
            showCancelButton: true,
            confirmButtonColor: '#8B6914',
            cancelButtonColor: '#d33',
            confirmButtonText: 'OK',
            background: '#ffffff',
            customClass: {
                title: 'text-xl font-bold text-gray-800',
                htmlContainer: 'text-sm text-gray-600',
                input: 'border border-gray-300 rounded-lg px-4 py-2 text-sm',
            }
        });
        if (!result.isConfirmed || !result.value) return;
        const targetPsid = result.value;
        setTriggerLoading(action);
        try {
            const res = await fetch('/api/admin/test-messenger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ action, psid: targetPsid }),
            });
            const data = await res.json();
            setTriggerResults(prev => ({
                ...prev,
                [action]: {
                    success: data.success && !data.result?.error,
                    message: data.result?.error?.message || data.result?.recipient_id
                        ? `✅ ${t('bc.sendComplete')} (${data.result?.recipient_id || 'OK'})` 
                        : data.result?.error?.message || `❌ ${t('bc.sendFailed')}`,
                },
            }));
        } catch (err) {
            setTriggerResults(prev => ({
                ...prev,
                [action]: { success: false, message: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` },
            }));
        } finally {
            setTriggerLoading(null);
        }
    };


    // ─── Time formatting ─────────────────────────────────────
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('time.justNow');
        if (diffMins < 60) return `${diffMins} ${t('time.minutes')}`;
        if (diffHours < 24) return `${diffHours} ${t('time.hours')}`;
        if (diffDays < 7) return `${diffDays} ${t('time.days')}`;
        return date.toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' });
    };

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-200">
                    <span className="text-white text-xl">📢</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{t('bc.title')}</h2>
                    <p className="text-xs text-gray-400">{t('bc.subtitle')}</p>
                </div>
            </div>

            {/* Step Progress Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 mb-6">
                <div className="flex items-center gap-2">
                    {[
                        { key: 'audience', label: t('bc.step1'), step: 1 },
                        { key: 'compose', label: t('bc.step2'), step: 2 },
                        { key: 'preview', label: t('bc.step3'), step: 3 },
                    ].map((s, i) => {
                        const isActive = step === s.key;
                        const isCompleted = (step === 'compose' && i === 0) ||
                            (step === 'preview' && i <= 1) ||
                            step === 'sending' || step === 'result';
                        return (
                            <div key={s.key} className="flex items-center flex-1">
                                <button
                                    onClick={() => {
                                        if (isCompleted || isActive) {
                                            setStep(s.key as BroadcastStep);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all w-full ${isActive
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200'
                                        : isCompleted
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-gray-50 text-gray-400 border border-gray-100'
                                        }`}
                                >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive
                                        ? 'bg-white/20 text-white'
                                        : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {isCompleted && !isActive ? '✓' : s.step}
                                    </span>
                                    <span className="hidden sm:inline">{s.label}</span>
                                </button>
                                {i < 2 && (
                                    <div className={`w-8 h-0.5 mx-1 rounded ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Step 1: Compose ──────────────────────────────────── */}
            {step === 'compose' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Message Input */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">✍️</span>
                            {t('bc.compose')}
                            {sendAllMode && (
                                <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                    {t('bc.sendAllMode')}
                                </span>
                            )}
                        </h3>

                        {/* ⚠️ Facebook 24hr Policy Warning */}
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <div className="flex items-start gap-2">
                                <span className="text-yellow-500 flex-shrink-0 text-base">⚠️</span>
                                <div>
                                    <p className="text-xs font-bold text-yellow-800">{t('bc.fbLimit')}</p>
                                    <p className="text-xs text-yellow-700 mt-0.5">
                                        {t('bc.fbLimitDesc1')}<br />
                                        {t('bc.fbLimitDesc2')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>

                                <label className="block text-sm font-medium text-gray-600 mb-2">{t('bc.messageLabel')}</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={t('bc.messagePlaceholder')}
                                    rows={6}
                                    maxLength={2000}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 resize-none transition-all"
                                />
                                <div className="flex justify-between mt-1">
                                    <span className="text-xs text-gray-400">
                                        {t('bc.messageHint')}
                                    </span>
                                    <span className={`text-xs ${message.length > 1800 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {message.length}/2,000
                                    </span>
                                </div>
                            </div>

                            {/* Variable Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    {t('bc.variables')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: '[[name]]', desc: t('bc.fullName') },
                                        { label: '[[first_name]]', desc: t('bc.firstName') },
                                    ].map((v) => (
                                        <button
                                            key={v.label}
                                            onClick={() => setMessage(prev => prev + v.label)}
                                            className="px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 rounded-lg text-indigo-600 font-mono transition-all flex items-center gap-1"
                                        >
                                            <span className="text-indigo-400">➕</span> {v.label}
                                            <span className="text-indigo-400 font-normal">({v.desc})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    {t('bc.attachImage')}
                                    <span className="text-xs text-gray-400 font-normal ml-2">{t('bc.imageHint')}</span>
                                </label>
                                
                                {attachedImage ? (
                                    <div className="relative group">
                                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                                            <img
                                                src={attachedImage.previewUrl}
                                                alt="preview"
                                                className="w-16 h-16 rounded-lg object-cover shadow-sm"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-700 truncate">{attachedImage.filename}</p>
                                                <p className="text-xs text-gray-400">{(attachedImage.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                            <button
                                                onClick={() => setAttachedImage(null)}
                                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-medium transition-colors"
                                            >
                                                🗑️ {t('bc.remove')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                        imageUploading
                                            ? 'border-blue-300 bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 hover:border-pink-300 hover:bg-pink-50'
                                    }`}>
                                        {imageUploading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs text-blue-500">{t('bc.uploading')}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-2xl">🖼️</span>
                                                <span className="text-xs text-gray-500">{t('bc.clickToSelect')}</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleImageUpload}
                                            disabled={imageUploading}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Quick Messages */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">{t('bc.quickMsg')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        t('bc.quick1'),
                                        t('bc.quick2'),
                                        t('bc.quick3'),
                                        t('bc.quick4'),
                                    ].map((quickMsg) => (
                                        <button
                                            key={quickMsg}
                                            onClick={() => setMessage(quickMsg)}
                                            className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-300 rounded-lg text-gray-600 hover:text-pink-600 transition-all"
                                        >
                                            {quickMsg.substring(0, 30)}...
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message Tag for outside 24hr window */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    Facebook Message Tag
                                    <span className="text-xs text-gray-400 font-normal ml-2">{t('bc.msgTagHint')}</span>
                                </label>
                                <select
                                    value={selectedTag}
                                    onChange={(e) => setSelectedTag(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
                                >
                                    {[
                                        { value: '', label: t('bc.noTag') },
                                        { value: 'HUMAN_AGENT', label: t('bc.humanAgent') },
                                        { value: 'POST_PURCHASE_UPDATE', label: t('bc.postPurchase') },
                                        { value: 'CONFIRMED_EVENT_UPDATE', label: t('bc.confirmedEvent') },
                                        { value: 'ACCOUNT_UPDATE', label: t('bc.accountUpdate') }
                                    ].map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                {selectedTag && (
                                    <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-3 py-2 rounded-lg">
                                        ⚠️ {
                                            selectedTag === 'HUMAN_AGENT' ? t('bc.humanAgentDesc') :
                                            selectedTag === 'POST_PURCHASE_UPDATE' ? t('bc.postPurchaseDesc') :
                                            selectedTag === 'CONFIRMED_EVENT_UPDATE' ? t('bc.confirmedEventDesc') :
                                            selectedTag === 'ACCOUNT_UPDATE' ? t('bc.accountUpdateDesc') :
                                            t('bc.noTagDesc')
                                        }
                                    </p>
                                )}
                            </div>

                            {/* Delay settings */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    {t('bc.sendSpeed')}
                                    <span className="text-xs text-gray-400 font-normal ml-2">{t('bc.sendSpeedHint')}</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: 0.5, label: `0.5s (${t('bc.fast')})` },
                                        { value: 1, label: `1s (${t('bc.normal')})` },
                                        { value: 2, label: '2s' },
                                        { value: 5, label: `5s (${t('bc.slow')})` },
                                        { value: 10, label: `10s (${t('bc.imageRecommend')})` },
                                    ].map((d) => (
                                        <button
                                            key={d.value}
                                            onClick={() => setSendDelay(d.value)}
                                            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                                                sendDelay === d.value
                                                    ? 'bg-pink-50 border-pink-300 text-pink-600 font-medium'
                                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-pink-200'
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Selection range */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    {t('bc.sendRange')}
                                    <span className="text-xs text-gray-400 font-normal ml-2">{t('bc.sendRangeHint')}</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{t('bc.start')}</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={sendRangeStart}
                                            onChange={(e) => setSendRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                                        />
                                    </div>
                                    <span className="text-gray-400">→</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{t('bc.end')}</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={sendRangeEnd || ''}
                                            onChange={(e) => setSendRangeEnd(parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                                        />
                                    </div>
                                    <span className="text-xs text-gray-400">({t('bc.allPersons')})</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">📱</span>
                            {t('bc.previewMsgLabel')}
                        </h3>

                        {/* Mock phone preview */}
                        <div className="mx-auto max-w-[280px]">
                            <div className="bg-gray-900 rounded-[2rem] p-3 shadow-2xl">
                                <div className="bg-white rounded-[1.5rem] overflow-hidden">
                                    {/* Status bar */}
                                    <div className="bg-blue-600 px-4 py-2 flex items-center gap-2">
                                        <span className="text-white text-xs">←</span>
                                        <div className="w-6 h-6 rounded-full bg-white/20" />
                                        <span className="text-white text-sm font-medium flex-1">{connectedPage?.name || t('bc.myShop')}</span>
                                        <span className="text-white/60 text-xs">📞</span>
                                    </div>

                                    {/* Chat area */}
                                    <div className="min-h-[280px] bg-gray-50 p-4 flex flex-col justify-end">
                                        {(message || attachedImage) ? (
                                            <div className="flex justify-start mb-2">
                                                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] shadow-sm ring-1 ring-gray-100">
                                                    {attachedImage && (
                                                        <img
                                                            src={attachedImage.previewUrl}
                                                            alt="attached"
                                                            className="w-full rounded-lg mb-2 shadow-sm"
                                                        />
                                                    )}
                                                    {message && (
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                                                            {message}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                                                        {new Date().toLocaleTimeString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <p className="text-gray-400 text-sm text-center">
                                                    {t('bc.previewEmpty')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Next button */}
                        <button
                            onClick={() => (message.trim() || attachedImage) && setStep('preview')}
                            disabled={!message.trim() && !attachedImage}
                            className={`w-full mt-6 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${(message.trim() || attachedImage)
                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {t('bc.preview')} →
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Step 2: Audience ─────────────────────────────────── */}
            {step === 'audience' && (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">

                    {/* Sync PSID Banner */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                    <span className="text-white text-lg">📥</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{t('bc.syncFb')}</p>
                                    <p className="text-xs text-gray-500">
                                        {t('bc.syncDesc')}
                                        {contacts.length > 0 && (
                                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                                {t('bc.saved')} {contacts.length} {t('bc.persons')}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleSyncPSIDs}
                                disabled={syncing}
                                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                                    syncing
                                        ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white/80 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200 hover:shadow-lg active:scale-[0.98]'
                                }`}
                            >
                                {syncing ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        {t('bc.syncing')} ({syncProgress}%)
                                    </>
                                ) : (
                                    <>
                                        📥 {t('bc.syncFb')}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Sync Limit Selector */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">{t('bc.syncLimit')}</span>
                            {[
                                { value: 500, label: '500' },
                                { value: 1000, label: '1K' },
                                { value: 2000, label: '2K' },
                                { value: 3000, label: '3K' },
                                { value: 5000, label: '5K' },
                                { value: 0, label: t('bc.syncAll') },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSyncLimit(opt.value)}
                                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                                        syncLimit === opt.value
                                            ? 'bg-blue-100 border-blue-300 text-blue-700 font-medium'
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <input
                                type="number"
                                min={0}
                                value={syncLimit || ''}
                                onChange={(e) => setSyncLimit(parseInt(e.target.value) || 0)}
                                placeholder={t('bc.customInput')}
                                className="w-24 px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            />
                        </div>

                        {/* Realtime Progress Bar */}
                        {syncing && (
                            <div className="mt-4 space-y-2 animate-in fade-in duration-300">
                                <div className="relative w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${syncProgress}%` }}
                                    />
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full opacity-30"
                                        style={{
                                            width: `${syncProgress}%`,
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                                            animation: 'shimmer 1.5s infinite',
                                        }}
                                    />
                                </div>
                                <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-blue-700">{syncStepLabel}</p>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                        {syncProgress}%
                                    </span>
                                </div>
                                {syncDetails && (
                                    <p className="text-xs text-blue-600/80 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                        {syncDetails}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Sync Error */}
                        {!syncing && syncResult && syncResult.errors > 0 && syncResult.totalFound === 0 && (
                            <div className="mt-3 px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
                                <span>❌</span>
                                <span>{syncResult.message}</span>
                            </div>
                        )}
                        {syncResult?.errorDetail && (
                            <div className="mt-2 px-4 py-2 rounded-xl text-xs bg-red-50 text-red-600 border border-red-200">
                                ⚠️ Error: {syncResult.errorDetail}
                            </div>
                        )}
                    </div>

                    {/* Success Modal */}
                    {!syncing && syncResult && syncResult.totalFound > 0 && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl text-center animate-in zoom-in-95 duration-300">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mx-auto mb-4 flex items-center justify-center border-4 border-green-200">
                                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{t('bc.syncCompleteHd')}</h3>
                                <p className="text-gray-500 text-sm mb-4">{t('bc.syncCompleteDesc')}</p>
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                                        <p className="text-2xl font-bold text-blue-600">{syncResult.totalFound}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{t('bc.syncAll')}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
                                        <p className="text-2xl font-bold text-green-600">{syncResult.newContacts}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{t('bc.new')}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
                                        <p className="text-2xl font-bold text-amber-600">{syncResult.updatedContacts}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{t('bc.updated')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSyncResult(null)}
                                    className="w-full py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200 hover:shadow-lg transition-all active:scale-[0.98]"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('bc.search')}
                                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
                                />
                            </div>

                            {/* Channel Filter */}
                            <select
                                value={channelFilter}
                                onChange={(e) => setChannelFilter(e.target.value)}
                                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                            >
                                <option value="">{t('bc.channelAll')}</option>
                                {allChannels.map(ch => (
                                    <option key={ch.id} value={ch.type}>
                                        {channelIcons[ch.type] || '💬'} {ch.name}
                                    </option>
                                ))}
                            </select>

                            {/* Tag Filter */}
                            <select
                                value={tagFilter}
                                onChange={(e) => setTagFilter(e.target.value)}
                                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                            >
                                <option value="">{t('bc.tagAll')}</option>
                                {allTags.map(tag => (
                                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Selection summary */}
                        <div className="flex items-center justify-between mt-3">
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                                />
                                {t('bc.selectAll')} ({filteredContacts.length})
                            </label>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${selectedContactIds.size > 0 ? 'text-pink-600' : 'text-gray-400'}`}>
                                    {t('bc.selected')} {selectedContactIds.size} {t('bc.persons')}
                                </span>
                                {selectedContactIds.size > 0 && (
                                    <button
                                        onClick={() => { setSelectedContactIds(new Set()); setSelectAll(false); }}
                                        className="text-xs text-red-500 hover:text-red-600"
                                    >
                                        {t('bc.cancelAll')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {contactsLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="text-center">
                                    <div className="w-10 h-10 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">{t('bc.loading')}</p>
                                </div>
                            </div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="text-center">
                                    <span className="text-4xl">👥</span>
                                    <p className="text-sm text-gray-400 mt-2">{t('bc.notFound')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filteredContacts.map((contact) => {
                                    const isSelected = selectedContactIds.has(contact.id);
                                    return (
                                        <label
                                            key={contact.id}
                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-pink-50/50 ${isSelected ? 'bg-pink-50/80' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleContact(contact.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500 flex-shrink-0"
                                            />

                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
                                                {contact.avatarUrl && (
                                                    <img 
                                                        src={contact.avatarUrl} 
                                                        alt="" 
                                                        className="w-full h-full rounded-full object-cover absolute inset-0 z-10 bg-white" 
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                )}
                                                <span className="text-white text-sm font-bold absolute z-0">
                                                    {contact.displayName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-800 truncate">{contact.displayName}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${channelColors[contact.channel.type] || 'bg-gray-100 text-gray-600'}`}>
                                                        {channelIcons[contact.channel.type] || '💬'} {contact.channel.type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-gray-400">
                                                        {t('bc.latestMsg')} {formatTime(contact.lastMessageAt)}
                                                    </span>
                                                    {contact.tags.map(tag => (
                                                        <span
                                                            key={tag.id}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {!contactsLoading && contactTotalPages > 1 && (
                            <div className="p-4 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        {t('bc.page')} {contactPage} {t('bc.of')} {contactTotalPages} ({contactTotal} {t('bc.persons')})
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {/* Previous */}
                                        <button
                                            onClick={() => goToPage(contactPage - 1)}
                                            disabled={contactPage <= 1}
                                            className="px-3 py-1.5 text-xs rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white border-gray-200 text-gray-600 hover:bg-pink-50 hover:border-pink-200"
                                        >
                                            {t('bc.backStep')}
                                        </button>

                                        {/* Page numbers */}
                                        {(() => {
                                            const pages: (number | string)[] = [];
                                            const total = contactTotalPages;
                                            const current = contactPage;

                                            if (total <= 7) {
                                                for (let i = 1; i <= total; i++) pages.push(i);
                                            } else {
                                                pages.push(1);
                                                if (current > 3) pages.push('...');
                                                for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
                                                    pages.push(i);
                                                }
                                                if (current < total - 2) pages.push('...');
                                                pages.push(total);
                                            }

                                            return pages.map((p, i) =>
                                                typeof p === 'string' ? (
                                                    <span key={`dot-${i}`} className="px-1 text-gray-400 text-xs">...</span>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        onClick={() => goToPage(p)}
                                                        className={`min-w-[32px] h-8 text-xs rounded-lg border transition-all ${
                                                            p === current
                                                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-500 font-bold shadow-sm'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-pink-50 hover:border-pink-200'
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            );
                                        })()}

                                        {/* Next */}
                                        <button
                                            onClick={() => goToPage(contactPage + 1)}
                                            disabled={contactPage >= contactTotalPages}
                                            className="px-3 py-1.5 text-xs rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white border-gray-200 text-gray-600 hover:bg-pink-50 hover:border-pink-200"
                                        >
                                            {t('bc.nextStep')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100">
                        <div className="mb-2 text-xs text-gray-400 text-right">
                            {t('bc.page')} {contactPage} {t('bc.of')} {contactTotalPages} ({contactTotal} {t('bc.persons')})
                        </div>
                        {/* ► Send All banner */}
                        <div className="mb-3 p-3 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-200 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-orange-800">📣 {t('bc.sendAllBtn')}</p>
                                <p className="text-xs text-orange-600">{t('bc.sendAllDesc')} {contactTotal > 0 ? `(${contactTotal} ${t('bc.persons')})` : ''}</p>
                            </div>
                            <button
                                onClick={handleSendAll}
                                className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold rounded-xl shadow-md shadow-orange-200 hover:shadow-lg transition-all active:scale-[0.97]"
                            >
                                📤 {t('bc.sendAllBtn')}
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setStep('audience')}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all"
                            >
                                {t('bc.goBack')}
                            </button>
                            <button
                                onClick={() => {
                                    setSendAllMode(false);
                                    if (selectedContactIds.size > 0) setStep('compose');
                                }}
                                disabled={selectedContactIds.size === 0}
                                className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${selectedContactIds.size > 0
                                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200 hover:shadow-lg'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {t('bc.compose')} ({selectedContactIds.size} {t('bc.persons')}) →
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* ─── Step 3: Preview & Confirm ───────────────────────── */}
            {step === 'preview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Summary */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">📋</span>
                            {t('bc.sendSummary')}
                        </h3>

                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 text-center border border-pink-100">
                                    <p className="text-3xl font-bold text-pink-600">{selectedContactIds.size}</p>
                                    <p className="text-xs text-gray-500 mt-1">{t('bc.recipientList')}</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
                                    <p className="text-3xl font-bold text-blue-600">{message.length}</p>
                                    <p className="text-xs text-gray-500 mt-1">{t('bc.characters')}</p>
                                </div>
                            </div>

                            {/* Message Preview */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <p className="text-xs text-gray-500 mb-2">{t('bc.messagePreview')}:</p>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{message}</p>
                            </div>

                            {/* Tag Info */}
                            {selectedTag && (
                                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                                    <p className="text-xs text-amber-700 font-medium">
                                        Message Tag: {
                                            selectedTag === 'HUMAN_AGENT' ? t('bc.humanAgent') :
                                            selectedTag === 'POST_PURCHASE_UPDATE' ? t('bc.postPurchase') :
                                            selectedTag === 'CONFIRMED_EVENT_UPDATE' ? t('bc.confirmedEvent') :
                                            selectedTag === 'ACCOUNT_UPDATE' ? t('bc.accountUpdate') :
                                            t('bc.noTag')
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Recipients list */}
                            <div>
                                <p className="text-xs text-gray-500 mb-2">{t('bc.recipientList')}</p>
                                <div className="max-h-[200px] overflow-y-auto space-y-1">
                                    {contacts.filter(c => selectedContactIds.has(c.id)).map(contact => (
                                        <div key={contact.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center flex-shrink-0">
                                                <span className="text-white text-[10px] font-bold">{contact.displayName.charAt(0)}</span>
                                            </div>
                                            <span className="text-xs text-gray-700 truncate">{contact.displayName}</span>
                                            <span className="text-[9px] text-gray-400 ml-auto">{channelIcons[contact.channel.type]} {contact.channel.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Confirmation */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">⚠️</span>
                            {t('bc.confirmSend')}
                        </h3>

                        {/* sendAll badge */}
                        {sendAllMode && (
                            <div className="mb-4 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
                                <span className="text-xl">📣</span>
                                <div>
                                    <p className="text-sm font-bold text-orange-800">{t('bc.sendAllMode')}
                                        <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] rounded-full">{contacts.length} {t('bc.persons')}</span>
                                    </p>
                                    <p className="text-xs text-orange-600 mt-0.5">{t('bc.sendAllDesc')}</p>
                                </div>
                            </div>
                        )}

                        {/* sendError banner */}
                        {sendError && (
                            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                <span className="text-red-500 flex-shrink-0">❌</span>
                                <p className="text-sm text-red-700 font-medium break-all">{sendError}</p>
                            </div>
                        )}

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-2">
                                <span className="text-lg">⚠️</span>
                                <div>
                                    <p className="text-sm font-medium text-amber-800">{t('bc.caution')}</p>
                                    <ul className="text-xs text-amber-700 mt-1 space-y-1">
                                        <li>{t('bc.caution1')}</li>
                                        <li>{t('bc.caution2')}</li>
                                        <li>{t('bc.caution3')}</li>
                                        <li>{t('bc.caution4')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setStep('compose')}
                                className="w-full py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200"
                            >
                                {t('bc.editMsgBtn')}
                            </button>
                            <button
                                onClick={handleSendBroadcast}
                                className="w-full py-3 rounded-xl font-bold text-base bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-300/40 hover:shadow-xl hover:shadow-pink-400/40 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {sendAllMode ? t('bc.sendAllNowBtn') : t('bc.sendNowBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* ─── Sending Progress ─────────────────────────────────── */}
            {step === 'sending' && (
                <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-100 max-w-lg mx-auto text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                        <span className="text-4xl animate-bounce">📢</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{t('bc.sendingTitle')}</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        {sendAllMode ? t('bc.sendingDesc') + ' ' + t('bc.allInDB') : `${t('bc.sendingDesc')} ${selectedContactIds.size} ${t('bc.persons')}`}
                    </p>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(sendProgress, 100)}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-500">{Math.round(sendProgress)}%</p>
                </div>
            )}

            {/* ─── Result ──────────────────────────────────────────── */}
            {step === 'result' && broadcastResult && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-100 text-center mb-6">
                        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${broadcastResult.failCount === 0
                            ? 'bg-gradient-to-br from-green-100 to-emerald-100'
                            : broadcastResult.successCount > 0
                                ? 'bg-gradient-to-br from-amber-100 to-yellow-100'
                                : 'bg-gradient-to-br from-red-100 to-pink-100'
                            }`}>
                            <span className="text-4xl">
                                {broadcastResult.failCount === 0 ? '🎉' : broadcastResult.successCount > 0 ? '⚠️' : '❌'}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {broadcastResult.failCount === 0
                                ? t('bc.sendComplete')
                                : broadcastResult.successCount > 0
                                    ? t('bc.sendPartial')
                                    : t('bc.sendFailed')
                            }
                        </h3>
                        <p className="text-sm text-gray-500">{t('bc.sentAt')}: {new Date(broadcastResult.sentAt).toLocaleString()}</p>

                        {/* sendError prominently */}
                        {sendError && (
                            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-left">
                                <p className="text-xs font-bold text-red-700 mb-1">{t('bc.failReason')}</p>
                                <p className="text-sm text-red-600 break-all">{sendError}</p>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mt-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-2xl font-bold text-gray-800">{broadcastResult.totalTargets}</p>
                                <p className="text-xs text-gray-500">{t('bc.target')}</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4">
                                <p className="text-2xl font-bold text-green-600">{broadcastResult.successCount}</p>
                                <p className="text-xs text-green-600">{t('bc.success')}</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-4">
                                <p className="text-2xl font-bold text-red-600">{broadcastResult.failCount}</p>
                                <p className="text-xs text-red-600">{t('bc.failed')}</p>
                            </div>
                        </div>
                    </div>


                    {/* Detailed Results */}
                    {broadcastResult.results.length > 0 && (
                        <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 mb-6">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">{t('bc.detailHeader')}</h4>
                            <div className="max-h-[250px] overflow-y-auto space-y-1">
                                {broadcastResult.results.map((r, i) => (
                                    <div key={i} className={`px-3 py-2 rounded-lg text-xs ${r.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                        <div className="flex items-center gap-2">
                                            <span>{r.success ? '✅' : '❌'}</span>
                                            <span className="font-medium text-gray-700">{r.contactName}</span>
                                        </div>
                                        {r.error && (
                                            <p className="text-red-500 text-[11px] mt-1 ml-6 break-all leading-relaxed">{r.error}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={resetBroadcast}
                            className="flex-1 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200 hover:shadow-lg transition-all"
                        >
                            📢 {t('bc.sendAnother')}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Broadcast History ──────────────────────────────── */}
            {step === 'compose' && broadcastHistory.length > 0 && (
                <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">📊</span>
                        {t('bc.historyLatest')}
                    </h3>
                    <div className="space-y-2">
                        {broadcastHistory.map((hist, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${hist.failCount === 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                                    {hist.failCount === 0 ? '✅' : '⚠️'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-700">
                                        {t('bc.target')}: {hist.totalTargets} {t('bc.persons')} — {t('bc.success')}: {hist.successCount}, {t('bc.failed')}: {hist.failCount}
                                    </p>
                                    <p className="text-xs text-gray-400">{new Date(hist.sentAt).toLocaleString()} by {hist.sentBy}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Permission Triggers Panel ──────────────────────── */}
            {step === 'audience' && (
                <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">🔑</span>
                        {t('bc.permTriggers')}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        {t('bc.permDesc')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* HUMAN_AGENT */}
                        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🧑‍💼</span>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{t('bc.humanAgentTitle')}</p>
                                    <p className="text-[10px] text-gray-500">{t('bc.humanAgentSub')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => triggerPermission('trigger_human_agent', 'Human Agent')}
                                disabled={triggerLoading === 'trigger_human_agent'}
                                className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                                    triggerLoading === 'trigger_human_agent'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                                }`}
                            >
                                {triggerLoading === 'trigger_human_agent' ? t('bc.triggerSending') : t('bc.triggerHumanAgent')}
                            </button>
                            {triggerResults['trigger_human_agent'] && (
                                <p className={`text-[11px] mt-2 px-2 py-1 rounded-lg ${
                                    triggerResults['trigger_human_agent'].success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                }`}>
                                    {triggerResults['trigger_human_agent'].message}
                                </p>
                            )}
                        </div>

                        {/* Marketing Messages */}
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">📢</span>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{t('bc.marketingTitle')}</p>
                                    <p className="text-[10px] text-gray-500">{t('bc.marketingSub')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => triggerPermission('trigger_marketing_messages', 'Marketing Messages')}
                                disabled={triggerLoading === 'trigger_marketing_messages'}
                                className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                                    triggerLoading === 'trigger_marketing_messages'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                                }`}
                            >
                                {triggerLoading === 'trigger_marketing_messages' ? t('bc.triggerSending') : t('bc.triggerMarketing')}
                            </button>
                            {triggerResults['trigger_marketing_messages'] && (
                                <p className={`text-[11px] mt-2 px-2 py-1 rounded-lg ${
                                    triggerResults['trigger_marketing_messages'].success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                }`}>
                                    {triggerResults['trigger_marketing_messages'].message}
                                </p>
                            )}
                        </div>

                        {/* Token Check */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🔍</span>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{t('bc.testTokenTitle')}</p>
                                    <p className="text-[10px] text-gray-500">{t('bc.testTokenSub')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => triggerPermission('ping', 'Token Check')}
                                disabled={triggerLoading === 'ping'}
                                className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                                    triggerLoading === 'ping'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
                                }`}
                            >
                                {triggerLoading === 'ping' ? t('bc.triggerChecking') : t('bc.triggerToken')}
                            </button>
                            {triggerResults['ping'] && (
                                <p className={`text-[11px] mt-2 px-2 py-1 rounded-lg ${
                                    triggerResults['ping'].success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                }`}>
                                    {triggerResults['ping'].message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            {t('bc.permTip')}
                            {t('bc.refreshAppReview')} <a href={`https://developers.facebook.com/apps/${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1417314816291087'}/use_cases/customize/`} target="_blank" rel="noopener" className="text-blue-500 underline">App Review</a>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
