"use client";

import { useState, useEffect } from "react";
import { Trans } from "@/components/Trans";
import { useRouter } from "next/navigation";

export default function AdminUpgrade() {
    const [plans, setPlans] = useState<any[]>([]);
    const [subData, setSubData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        Promise.all([
            fetch("/api/plans").then(res => res.json()),
            fetch("/api/tenant/subscription").then(res => res.json())
        ]).then(([plansRes, subRes]) => {
            if (plansRes.success) setPlans(plansRes.data);
            if (subRes.success) setSubData(subRes.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleUpgrade = async (planId: string) => {
        setUpgrading(true);
        try {
            const res = await fetch("/api/tenant/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId })
            });
            const data = await res.json();
            if (data.success) {
                alert("Upgrade successful!");
                window.location.reload();
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Upgrade failed");
        }
        setUpgrading(false);
    };

    if (loading) return <div className="p-6 text-gray-500">Loading subscription data...</div>;
    if (!subData) return <div className="p-6 text-red-500">Failed to load subscription data.</div>;

    const currentPlan = subData.subscription?.plan;
    const usage = subData.usage;

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                    <span className="text-white text-xl">⚡</span>
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-800"><Trans th="จัดการแพ็กเกจ" en="Manage Subscription" /></h2>
                    <p className="text-sm text-gray-500"><Trans th="ขยายธุรกิจของคุณสู่ขีดสุดด้วยฟีเจอร์พรีเมียม" en="Scale your business with premium features" /></p>
                </div>
            </div>

            {/* Current Status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                        {currentPlan?.name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wide"><Trans th="แพ็กเกจปัจจุบัน" en="Current Plan" /></p>
                        <p className="text-xl font-black text-gray-800">{currentPlan?.name || "No Plan"}</p>
                        <p className="text-xs text-green-600 font-medium">Status: {subData.subscription?.status}</p>
                    </div>
                </div>
                
                <div className="flex gap-8 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-8 w-full md:w-auto">
                    <div>
                        <p className="text-xs text-gray-500 font-bold"><Trans th="จำนวนร้านค้า" en="Shops Used" /></p>
                        <p className="text-lg font-bold text-gray-800">{usage.shops} / {currentPlan?.maxShops}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold"><Trans th="จำนวนสินค้า" en="Products Used" /></p>
                        <p className="text-lg font-bold text-gray-800">{usage.products} / {currentPlan?.maxProducts}</p>
                    </div>
                </div>
            </div>

            {/* Pricing Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan: any) => {
                    const isCurrent = currentPlan?.id === plan.id;
                    return (
                        <div key={plan.id} className={`relative bg-white rounded-2xl p-6 shadow-sm ring-1 transition-all flex flex-col ${isCurrent ? 'ring-2 ring-indigo-500 shadow-md scale-105 z-10' : 'ring-gray-100 hover:shadow-md'}`}>
                            {plan.name === 'Pro' && (
                                <div className="absolute top-0 left-0 right-0 bg-indigo-500 text-white text-xs font-bold text-center py-1 rounded-t-2xl">
                                    MOST POPULAR
                                </div>
                            )}
                            <h3 className={`text-lg font-black mt-2 ${isCurrent ? 'text-indigo-600' : 'text-gray-800'}`}>{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mt-2 mb-6">
                                <span className="text-4xl font-black text-gray-900">฿{Number(plan.price).toLocaleString()}</span>
                                <span className="text-sm text-gray-400 font-medium">/mo</span>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex gap-2 text-sm text-gray-600"><span className="text-green-500">✓</span> Max {plan.maxShops} Shops</li>
                                <li className="flex gap-2 text-sm text-gray-600"><span className="text-green-500">✓</span> Max {plan.maxProducts} Products</li>
                                {plan.features.map((f: string, i: number) => (
                                    <li key={i} className="flex gap-2 text-sm text-gray-600 capitalize"><span className="text-green-500">✓</span> {f.replace('_', ' ')}</li>
                                ))}
                            </ul>

                            <button 
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={isCurrent || upgrading}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                                    isCurrent ? 'bg-gray-100 text-gray-500 cursor-not-allowed' :
                                    plan.name === 'Pro' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' :
                                    'bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {isCurrent ? 'Current Plan' : upgrading ? 'Processing...' : 'Upgrade Now'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Invoices */}
            {subData.invoices?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4"><Trans th="ประวัติการชำระเงิน" en="Billing History" /></h3>
                    <div className="divide-y divide-gray-100">
                        {subData.invoices.map((inv: any) => (
                            <div key={inv.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{inv.description}</p>
                                    <p className="text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800">฿{Number(inv.amount).toLocaleString()}</p>
                                    <span className="inline-block px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-md">{inv.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
