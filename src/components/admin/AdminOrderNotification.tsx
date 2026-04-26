"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Trans } from "@/components/Trans";

interface OrderItem {
    name: string;
    variantName: string;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    customer: string;
    phone: string;
    items: OrderItem[];
    total: number;
    date: string;
    status: string;
}

interface AdminOrderNotificationProps {
    onViewOrders?: (orderId: string) => void;
}

export default function AdminOrderNotification({ onViewOrders }: AdminOrderNotificationProps) {
    const [newOrder, setNewOrder] = useState<Order | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const latestOrderIdRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Play notification sound using Web Audio API (no file needed)
    const playSound = useCallback(() => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext();
            }
            const ctx = audioCtxRef.current;

            const playTone = (freq: number, startTime: number, duration: number, volume = 0.4) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = "sine";
                gain.gain.setValueAtTime(volume, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const t = ctx.currentTime;
            playTone(523, t, 0.15);        // C5
            playTone(659, t + 0.15, 0.15); // E5
            playTone(784, t + 0.3, 0.25);  // G5
            playTone(1046, t + 0.5, 0.35); // C6
        } catch {
            // Ignore audio errors
        }
    }, []);

    const checkForNewOrders = useCallback(async () => {
        try {
            const res = await fetch("/api/orders", { cache: "no-store" });
            const data = await res.json();
            if (!data.success || !data.orders?.length) return;

            const latest: Order = data.orders[0];

            // First load — just set the marker, don't show popup
            if (latestOrderIdRef.current === null) {
                latestOrderIdRef.current = latest.id;
                return;
            }

            // Same order → no change
            if (latest.id === latestOrderIdRef.current) return;

            // Find all orders newer than the last seen one
            const lastIndex = data.orders.findIndex((o: Order) => o.id === latestOrderIdRef.current);
            const brandNew: Order[] = lastIndex === -1 ? [latest] : data.orders.slice(0, lastIndex);

            if (brandNew.length === 0) return;

            latestOrderIdRef.current = latest.id;
            setPendingOrders(prev => [...brandNew, ...prev]);
            setNewOrder(brandNew[0]);
            setIsVisible(true);
            playSound();

            // Desktop notification for new order
            if ('Notification' in window && Notification.permission === 'granted') {
                const orderTotal = (brandNew[0].total || 0).toLocaleString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'));
                const notif = new Notification(`🛒 ออเดอร์ใหม่! #${brandNew[0].id}`, {
                    body: `${brandNew[0].customer || 'ลูกค้า'} — ฿${orderTotal}`,
                    icon: '/favicon.ico',
                    tag: `order-${brandNew[0].id}`,
                    requireInteraction: true, // keep visible until clicked
                });
                notif.onclick = () => {
                    window.focus();
                    onViewOrders?.(brandNew[0].id);
                    notif.close();
                };
            }

            // Flash browser title for new order
            const origTitle = document.title;
            let flashing = true;
            const flashInterval = setInterval(() => {
                document.title = flashing ? `🛒 ออเดอร์ใหม่!` : origTitle;
                flashing = !flashing;
            }, 800);
            const stopFlash = () => {
                clearInterval(flashInterval);
                document.title = origTitle;
                window.removeEventListener('focus', stopFlash);
            };
            window.addEventListener('focus', stopFlash);
            setTimeout(stopFlash, 60000);

            // Auto-dismiss after 30s
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 30000);
        } catch {
            // Silently ignore network errors
        }
    }, [playSound]);

    useEffect(() => {
        let eventSource: EventSource | null = null;
        let interval: ReturnType<typeof setInterval> | null = null;
        let sseConnected = false;

        // Try SSE first for real-time push
        const chatToken = localStorage.getItem('chat-auth-token');
        if (chatToken) {
            try {
                eventSource = new EventSource(`/api/orders/stream?token=${chatToken}`);

                eventSource.addEventListener('new_order', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.order) {
                            const order: Order = data.order;
                            if (latestOrderIdRef.current === null) {
                                latestOrderIdRef.current = order.id;
                                return;
                            }
                            if (order.id === latestOrderIdRef.current) return;

                            latestOrderIdRef.current = order.id;
                            setPendingOrders(prev => [order, ...prev]);
                            setNewOrder(order);
                            setIsVisible(true);
                            playSound();

                            // Desktop notification
                            if ('Notification' in window && Notification.permission === 'granted') {
                                const orderTotal = (order.total || 0).toLocaleString('th-TH');
                                const notif = new Notification(`🛒 ออเดอร์ใหม่! #${order.id}`, {
                                    body: `${order.customer || 'ลูกค้า'} — ฿${orderTotal}`,
                                    icon: '/favicon.ico',
                                    tag: `order-${order.id}`,
                                    requireInteraction: true,
                                });
                                notif.onclick = () => { window.focus(); onViewOrders?.(order.id); notif.close(); };
                            }

                            // Flash title
                            const origTitle = document.title;
                            let flashing = true;
                            const flashInterval = setInterval(() => {
                                document.title = flashing ? `🛒 ออเดอร์ใหม่!` : origTitle;
                                flashing = !flashing;
                            }, 800);
                            const stopFlash = () => { clearInterval(flashInterval); document.title = origTitle; window.removeEventListener('focus', stopFlash); };
                            window.addEventListener('focus', stopFlash);
                            setTimeout(stopFlash, 60000);

                            if (timerRef.current) clearTimeout(timerRef.current);
                            timerRef.current = setTimeout(() => setIsVisible(false), 30000);
                        }
                    } catch {}
                });

                eventSource.addEventListener('connected', () => { sseConnected = true; });
                eventSource.onerror = () => {
                    // SSE failed — fall back to polling
                    if (!sseConnected) {
                        eventSource?.close();
                        eventSource = null;
                        startPolling();
                    }
                };
            } catch {
                startPolling();
            }
        } else {
            startPolling();
        }

        function startPolling() {
            // Initial check
            checkForNewOrders();
            // Poll every 15 seconds
            interval = setInterval(checkForNewOrders, 15000);
        }

        return () => {
            eventSource?.close();
            if (interval) clearInterval(interval);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [checkForNewOrders, playSound]);

    const handleClose = () => {
        setIsVisible(false);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const handleViewOrders = () => {
        handleClose();
        if (newOrder) onViewOrders?.(newOrder.id);
    };

    if (!isVisible || !newOrder) return null;

    const orderTime = new Date(newOrder.date).toLocaleTimeString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: 'Asia/Bangkok',
    });
    const itemCount = newOrder.items?.reduce((s, i) => s + (i.quantity || 1), 0) ?? 0;
    const extraOrders = pendingOrders.length - 1;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
                onClick={handleClose}
            />

            {/* Popup */}
            <div className="fixed inset-0 flex items-center justify-center z-[9999] px-4 pointer-events-none">
                <div
                    className="pointer-events-auto w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-bounce-in"
                    style={{ animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-5 text-white relative overflow-hidden">
                        {/* Background circles */}
                        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />

                        <div className="relative flex items-center gap-4">
                            {/* Bell icon with pulse */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
                                <div className="relative w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                                    🛒
                                </div>
                            </div>
                            <div>
                                <p className="text-white/80 text-sm font-medium">{<Trans th="ออเดอร์ใหม่เข้ามาแล้ว!" en="New orders have arrived!" />}</p>
                                <h2 className="text-2xl font-bold">#{newOrder.id}</h2>
                                <p className="text-white/70 text-xs mt-0.5">{orderTime} {<Trans th="น." en="n." />}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="ml-auto w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors text-white"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5">
                        {/* Customer info */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                {(newOrder.customer || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{newOrder.customer || "ลูกค้า"}</p>
                                {newOrder.phone && newOrder.phone !== "-" && (
                                    <p className="text-sm text-gray-500">📞 {newOrder.phone}</p>
                                )}
                            </div>
                        </div>

                        {/* Items summary */}
                        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                            <p className="text-xs text-gray-500 font-medium mb-2">{<Trans th="รายการสินค้า (" en="Product list (" />}{itemCount} {<Trans th="ชิ้น)" en="item)" />}</p>
                            <div className="space-y-1.5">
                                {(newOrder.items || []).slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700 truncate max-w-[200px]">
                                            {item.name}
                                            {item.variantName && <span className="text-gray-400"> ({item.variantName})</span>}
                                        </span>
                                        <span className="text-gray-500 ml-2 flex-shrink-0">×{item.quantity}</span>
                                    </div>
                                ))}
                                {(newOrder.items || []).length > 3 && (
                                    <p className="text-xs text-gray-400">+{newOrder.items.length - 3} {<Trans th="รายการอีก..." en="Another item..." />}</p>
                                )}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-gray-600 font-medium">{<Trans th="ยอดรวม" en="Total" />}</span>
                            <span className="text-2xl font-bold text-emerald-600">
                                ฿{(newOrder.total || 0).toLocaleString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'))}
                            </span>
                        </div>

                        {/* Extra orders badge */}
                        {extraOrders > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 mb-4 text-center">
                                <p className="text-orange-600 text-sm font-medium">
                                    <Trans th="🔔 มีออเดอร์ใหม่อีก" en="🔔 There is another new order." /> {extraOrders} <Trans th="รายการ!" en="list!" />
                                                                    </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                            >
                                <Trans th="ปิด" en="turn off" />
                                                            </button>
                            <button
                                onClick={handleViewOrders}
                                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-green-200"
                            >
                                <Trans th="ดูออเดอร์ →" en="View orders →" />
                                                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(60px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </>
    );
}
