"use client";

import { useState, useEffect } from "react";
import { AdminTab } from "@/app/admin/page";
import { Trans } from "@/components/Trans";

interface Agent {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
}

interface AdminStaffProps {
    onBack: () => void;
}

export default function AdminStaff({ onBack }: AdminStaffProps) {
    const [staffList, setStaffList] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("AGENT");
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/shop/staff");
            const data = await res.json();
            if (data.success) {
                setStaffList(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch staff", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setFormLoading(true);
        try {
            const res = await fetch("/api/shop/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role }),
            });
            const data = await res.json();
            if (data.success) {
                setStaffList([...staffList, data.data]);
                setIsAdding(false);
                setName("");
                setEmail("");
                setPassword("");
                setRole("AGENT");
            } else {
                setError(data.error || "Failed to add staff");
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this staff member?")) return;
        try {
            const res = await fetch(`/api/shop/staff/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                setStaffList(staffList.filter(s => s.id !== id));
            } else {
                alert(data.error || "Failed to delete");
            }
        } catch (err) {
            alert("Error deleting staff");
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
            <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับหน้าจัดการข้อมูล" en="Back to Master Data" />
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg text-white text-xl">
                        👥
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800"><Trans th="จัดการพนักงาน" en="Staff Management" /></h2>
                        <p className="text-xs text-gray-500"><Trans th="เพิ่มหรือลดพนักงานที่ดูแลร้านค้านี้" en="Manage staff members for this shop" /></p>
                    </div>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-pink-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <span>+</span> <Trans th="เพิ่มพนักงาน" en="Add Staff" />
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4"><Trans th="เพิ่มพนักงานใหม่" en="Add New Staff" /></h3>
                    {error && <div className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</div>}
                    <form onSubmit={handleAddStaff} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border-gray-200 rounded-xl focus:ring-pink-500 focus:border-pink-500" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล (ใช้สำหรับ Login)</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border-gray-200 rounded-xl focus:ring-pink-500 focus:border-pink-500" placeholder="staff@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border-gray-200 rounded-xl focus:ring-pink-500 focus:border-pink-500" placeholder="********" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">สิทธิ์การเข้าถึง</label>
                                <select value={role} onChange={e => setRole(e.target.value)} className="w-full border-gray-200 rounded-xl focus:ring-pink-500 focus:border-pink-500">
                                    <option value="AGENT">พนักงานทั่วไป (AGENT)</option>
                                    <option value="ADMIN">ผู้ดูแล (ADMIN)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                                ยกเลิก
                            </button>
                            <button type="submit" disabled={formLoading} className="px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50">
                                {formLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                            <th className="px-4 py-3 font-semibold"><Trans th="พนักงาน" en="Staff" /></th>
                            <th className="px-4 py-3 font-semibold"><Trans th="อีเมล" en="Email" /></th>
                            <th className="px-4 py-3 font-semibold"><Trans th="สิทธิ์" en="Role" /></th>
                            <th className="px-4 py-3 font-semibold text-right"><Trans th="จัดการ" en="Manage" /></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500">Loading...</td></tr>
                        ) : staffList.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500">ไม่มีข้อมูลพนักงาน</td></tr>
                        ) : (
                            staffList.map((staff) => (
                                <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                {staff.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-800 text-sm">{staff.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{staff.email}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                            staff.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {staff.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(staff.id)} className="text-red-500 hover:text-red-700 text-sm font-medium hover:underline p-1">
                                            ลบ
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
