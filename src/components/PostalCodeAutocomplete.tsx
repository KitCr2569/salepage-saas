"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface AddressEntry {
    district: string;      // ตำบล
    amphoe: string;        // อำเภอ
    province: string;      // จังหวัด
    zipcode: number;
}

interface PostalCodeAutocompleteProps {
    value: string;
    onChange: (field: string, value: string) => void;
    lang?: "th" | "en";
}

// Cache the data globally so it's only fetched once
let cachedData: AddressEntry[] | null = null;

const DATA_URL = "https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json";

async function loadAddressData(): Promise<AddressEntry[]> {
    if (cachedData) return cachedData;

    try {
        const res = await fetch(DATA_URL);
        if (res.ok) {
            const data = await res.json();
            cachedData = data;
            return data;
        }
    } catch { }

    return [];
}

export default function PostalCodeAutocomplete({ value, onChange, lang = "th" }: PostalCodeAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<AddressEntry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [allData, setAllData] = useState<AddressEntry[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Load data on mount
    useEffect(() => {
        loadAddressData().then(data => setAllData(data));
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleSearch = useCallback((query: string) => {
        onChange("postalCode", query);

        if (!query || query.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        if (allData.length === 0) {
            setIsLoading(true);
            loadAddressData().then(data => {
                setAllData(data);
                const filtered = data
                    .filter(d => String(d.zipcode).startsWith(query))
                    .slice(0, 20);
                setSuggestions(filtered);
                setIsOpen(filtered.length > 0);
                setIsLoading(false);
            });
            return;
        }

        const filtered = allData
            .filter(d => String(d.zipcode).startsWith(query))
            .slice(0, 20);
        setSuggestions(filtered);
        setIsOpen(filtered.length > 0);
    }, [allData, onChange]);

    const handleSelect = (entry: AddressEntry) => {
        onChange("postalCode", String(entry.zipcode));
        onChange("subdistrict", entry.district);
        onChange("district", entry.amphoe);
        onChange("province", entry.province);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400 z-10">{lang === "en" ? "Postal Code" : "รหัสไปรษณีย์"}</label>
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={value}
                    onChange={(e) => handleSearch(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => {
                        if (value && value.length >= 2 && suggestions.length > 0) {
                            setIsOpen(true);
                        }
                    }}
                    placeholder={lang === "en" ? "e.g. 10100" : "เช่น 10100"}
                    className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] transition-colors"
                />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-gray-400">{lang === "en" ? "Loading..." : "กำลังโหลด..."}</div>
                    ) : suggestions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">{lang === "en" ? "No data found" : "ไม่พบข้อมูล"}</div>
                    ) : (
                        suggestions.map((entry, idx) => (
                            <button
                                key={`${entry.zipcode}-${entry.district}-${idx}`}
                                type="button"
                                onClick={() => handleSelect(entry)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{entry.district}</p>
                                        <p className="text-xs text-gray-400">{entry.zipcode}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">{entry.amphoe}</p>
                                        <p className="text-xs text-gray-500">{entry.province}</p>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
