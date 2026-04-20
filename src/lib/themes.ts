// Sale page theme definitions
// Each theme provides CSS variables that override the default colors

export interface SalePageTheme {
    id: string;
    name: string;
    nameEn: string;
    preview: { bg: string; accent: string; text: string };
    // CSS variables to inject
    vars: {
        '--sp-bg': string;
        '--sp-bg-secondary': string;
        '--sp-header-bg': string;
        '--sp-header-text': string;
        '--sp-card-bg': string;
        '--sp-card-border': string;
        '--sp-accent': string;
        '--sp-accent-light': string;
        '--sp-text': string;
        '--sp-text-secondary': string;
        '--sp-footer-bg': string;
        '--sp-tab-active-bg': string;
        '--sp-tab-active-text': string;
        '--sp-tab-active-border': string;
        '--sp-price-color': string;
        '--sp-gradient-from': string;
        '--sp-gradient-to': string;
    };
}

export const SALE_PAGE_THEMES: SalePageTheme[] = [
    {
        id: "midnight",
        name: "มิดไนท์",
        nameEn: "Midnight",
        preview: { bg: "#0A0A1A", accent: "#7C3AED", text: "#F0EEFF" },
        vars: {
            '--sp-bg': '#0d0d20',
            '--sp-bg-secondary': '#141430',
            '--sp-header-bg': 'rgba(10,10,26,0.95)',
            '--sp-header-text': '#F0EEFF',
            '--sp-card-bg': '#141430',
            '--sp-card-border': 'rgba(124,58,237,0.2)',
            '--sp-accent': '#7C3AED',
            '--sp-accent-light': '#B991FD',
            '--sp-text': '#F0EEFF',
            '--sp-text-secondary': '#9B8FCC',
            '--sp-footer-bg': '#0A0A1A',
            '--sp-tab-active-bg': 'rgba(124,58,237,0.15)',
            '--sp-tab-active-text': '#B991FD',
            '--sp-tab-active-border': '#7C3AED',
            '--sp-price-color': '#B991FD',
            '--sp-gradient-from': '#7C3AED',
            '--sp-gradient-to': '#4A1A9E',
        }
    },
    {
        id: "ocean",
        name: "มหาสมุทร",
        nameEn: "Ocean",
        preview: { bg: "#0B1426", accent: "#0EA5E9", text: "#E0F2FE" },
        vars: {
            '--sp-bg': '#0B1426',
            '--sp-bg-secondary': '#0F1D32',
            '--sp-header-bg': 'rgba(11,20,38,0.95)',
            '--sp-header-text': '#E0F2FE',
            '--sp-card-bg': '#0F1D32',
            '--sp-card-border': 'rgba(14,165,233,0.2)',
            '--sp-accent': '#0EA5E9',
            '--sp-accent-light': '#7DD3FC',
            '--sp-text': '#E0F2FE',
            '--sp-text-secondary': '#7DD3FC',
            '--sp-footer-bg': '#0B1426',
            '--sp-tab-active-bg': 'rgba(14,165,233,0.15)',
            '--sp-tab-active-text': '#7DD3FC',
            '--sp-tab-active-border': '#0EA5E9',
            '--sp-price-color': '#38BDF8',
            '--sp-gradient-from': '#0EA5E9',
            '--sp-gradient-to': '#0369A1',
        }
    },
    {
        id: "emerald",
        name: "มรกต",
        nameEn: "Emerald",
        preview: { bg: "#0B1A14", accent: "#10B981", text: "#D1FAE5" },
        vars: {
            '--sp-bg': '#0B1A14',
            '--sp-bg-secondary': '#0F2A1E',
            '--sp-header-bg': 'rgba(11,26,20,0.95)',
            '--sp-header-text': '#D1FAE5',
            '--sp-card-bg': '#0F2A1E',
            '--sp-card-border': 'rgba(16,185,129,0.2)',
            '--sp-accent': '#10B981',
            '--sp-accent-light': '#6EE7B7',
            '--sp-text': '#D1FAE5',
            '--sp-text-secondary': '#6EE7B7',
            '--sp-footer-bg': '#0B1A14',
            '--sp-tab-active-bg': 'rgba(16,185,129,0.15)',
            '--sp-tab-active-text': '#6EE7B7',
            '--sp-tab-active-border': '#10B981',
            '--sp-price-color': '#34D399',
            '--sp-gradient-from': '#10B981',
            '--sp-gradient-to': '#047857',
        }
    },
    {
        id: "rose",
        name: "โรเซ่",
        nameEn: "Rosé",
        preview: { bg: "#1A0B14", accent: "#F43F5E", text: "#FFE4E6" },
        vars: {
            '--sp-bg': '#1A0B14',
            '--sp-bg-secondary': '#2A0F1E',
            '--sp-header-bg': 'rgba(26,11,20,0.95)',
            '--sp-header-text': '#FFE4E6',
            '--sp-card-bg': '#2A0F1E',
            '--sp-card-border': 'rgba(244,63,94,0.2)',
            '--sp-accent': '#F43F5E',
            '--sp-accent-light': '#FDA4AF',
            '--sp-text': '#FFE4E6',
            '--sp-text-secondary': '#FDA4AF',
            '--sp-footer-bg': '#1A0B14',
            '--sp-tab-active-bg': 'rgba(244,63,94,0.15)',
            '--sp-tab-active-text': '#FDA4AF',
            '--sp-tab-active-border': '#F43F5E',
            '--sp-price-color': '#FB7185',
            '--sp-gradient-from': '#F43F5E',
            '--sp-gradient-to': '#BE123C',
        }
    },
    {
        id: "sunset",
        name: "พระอาทิตย์ตก",
        nameEn: "Sunset",
        preview: { bg: "#1A120B", accent: "#F97316", text: "#FFEDD5" },
        vars: {
            '--sp-bg': '#1A120B',
            '--sp-bg-secondary': '#2A1A0F',
            '--sp-header-bg': 'rgba(26,18,11,0.95)',
            '--sp-header-text': '#FFEDD5',
            '--sp-card-bg': '#2A1A0F',
            '--sp-card-border': 'rgba(249,115,22,0.2)',
            '--sp-accent': '#F97316',
            '--sp-accent-light': '#FDBA74',
            '--sp-text': '#FFEDD5',
            '--sp-text-secondary': '#FDBA74',
            '--sp-footer-bg': '#1A120B',
            '--sp-tab-active-bg': 'rgba(249,115,22,0.15)',
            '--sp-tab-active-text': '#FDBA74',
            '--sp-tab-active-border': '#F97316',
            '--sp-price-color': '#FB923C',
            '--sp-gradient-from': '#F97316',
            '--sp-gradient-to': '#C2410C',
        }
    },
    {
        id: "gold",
        name: "ทองคำ",
        nameEn: "Gold",
        preview: { bg: "#1A170B", accent: "#EAB308", text: "#FEF9C3" },
        vars: {
            '--sp-bg': '#1A170B',
            '--sp-bg-secondary': '#2A240F',
            '--sp-header-bg': 'rgba(26,23,11,0.95)',
            '--sp-header-text': '#FEF9C3',
            '--sp-card-bg': '#2A240F',
            '--sp-card-border': 'rgba(234,179,8,0.2)',
            '--sp-accent': '#EAB308',
            '--sp-accent-light': '#FDE047',
            '--sp-text': '#FEF9C3',
            '--sp-text-secondary': '#FDE047',
            '--sp-footer-bg': '#1A170B',
            '--sp-tab-active-bg': 'rgba(234,179,8,0.15)',
            '--sp-tab-active-text': '#FDE047',
            '--sp-tab-active-border': '#EAB308',
            '--sp-price-color': '#FACC15',
            '--sp-gradient-from': '#EAB308',
            '--sp-gradient-to': '#A16207',
        }
    },
    {
        id: "clean-white",
        name: "ขาวสะอาด",
        nameEn: "Clean White",
        preview: { bg: "#FAFAFA", accent: "#3B82F6", text: "#1F2937" },
        vars: {
            '--sp-bg': '#FAFAFA',
            '--sp-bg-secondary': '#FFFFFF',
            '--sp-header-bg': 'rgba(255,255,255,0.95)',
            '--sp-header-text': '#1F2937',
            '--sp-card-bg': '#FFFFFF',
            '--sp-card-border': 'rgba(229,231,235,1)',
            '--sp-accent': '#3B82F6',
            '--sp-accent-light': '#93C5FD',
            '--sp-text': '#1F2937',
            '--sp-text-secondary': '#6B7280',
            '--sp-footer-bg': '#F3F4F6',
            '--sp-tab-active-bg': 'rgba(59,130,246,0.1)',
            '--sp-tab-active-text': '#3B82F6',
            '--sp-tab-active-border': '#3B82F6',
            '--sp-price-color': '#2563EB',
            '--sp-gradient-from': '#3B82F6',
            '--sp-gradient-to': '#1D4ED8',
        }
    },
    {
        id: "warm-beige",
        name: "เบจอบอุ่น",
        nameEn: "Warm Beige",
        preview: { bg: "#FAF5EF", accent: "#92400E", text: "#451A03" },
        vars: {
            '--sp-bg': '#FAF5EF',
            '--sp-bg-secondary': '#FFFBF5',
            '--sp-header-bg': 'rgba(250,245,239,0.95)',
            '--sp-header-text': '#451A03',
            '--sp-card-bg': '#FFFBF5',
            '--sp-card-border': 'rgba(217,196,167,0.5)',
            '--sp-accent': '#92400E',
            '--sp-accent-light': '#D97706',
            '--sp-text': '#451A03',
            '--sp-text-secondary': '#78716C',
            '--sp-footer-bg': '#F5EDE3',
            '--sp-tab-active-bg': 'rgba(146,64,14,0.1)',
            '--sp-tab-active-text': '#92400E',
            '--sp-tab-active-border': '#92400E',
            '--sp-price-color': '#B45309',
            '--sp-gradient-from': '#92400E',
            '--sp-gradient-to': '#78350F',
        }
    },
    {
        id: "sakura",
        name: "ซากุระ",
        nameEn: "Sakura",
        preview: { bg: "#FFF5F7", accent: "#EC4899", text: "#831843" },
        vars: {
            '--sp-bg': '#FFF5F7',
            '--sp-bg-secondary': '#FFFFFF',
            '--sp-header-bg': 'rgba(255,245,247,0.95)',
            '--sp-header-text': '#831843',
            '--sp-card-bg': '#FFFFFF',
            '--sp-card-border': 'rgba(244,114,182,0.3)',
            '--sp-accent': '#EC4899',
            '--sp-accent-light': '#F9A8D4',
            '--sp-text': '#831843',
            '--sp-text-secondary': '#A21C5B',
            '--sp-footer-bg': '#FDF2F8',
            '--sp-tab-active-bg': 'rgba(236,72,153,0.1)',
            '--sp-tab-active-text': '#EC4899',
            '--sp-tab-active-border': '#EC4899',
            '--sp-price-color': '#DB2777',
            '--sp-gradient-from': '#EC4899',
            '--sp-gradient-to': '#BE185D',
        }
    },
    {
        id: "charcoal",
        name: "ชาร์โคล",
        nameEn: "Charcoal",
        preview: { bg: "#1C1C1E", accent: "#A78BFA", text: "#E5E5EA" },
        vars: {
            '--sp-bg': '#1C1C1E',
            '--sp-bg-secondary': '#2C2C2E',
            '--sp-header-bg': 'rgba(28,28,30,0.95)',
            '--sp-header-text': '#E5E5EA',
            '--sp-card-bg': '#2C2C2E',
            '--sp-card-border': 'rgba(167,139,250,0.2)',
            '--sp-accent': '#A78BFA',
            '--sp-accent-light': '#C4B5FD',
            '--sp-text': '#E5E5EA',
            '--sp-text-secondary': '#8E8E93',
            '--sp-footer-bg': '#1C1C1E',
            '--sp-tab-active-bg': 'rgba(167,139,250,0.15)',
            '--sp-tab-active-text': '#C4B5FD',
            '--sp-tab-active-border': '#A78BFA',
            '--sp-price-color': '#A78BFA',
            '--sp-gradient-from': '#A78BFA',
            '--sp-gradient-to': '#7C3AED',
        }
    },
    {
        id: "forest",
        name: "ป่าเขียว",
        nameEn: "Forest",
        preview: { bg: "#0F1F17", accent: "#22C55E", text: "#BBF7D0" },
        vars: {
            '--sp-bg': '#0F1F17',
            '--sp-bg-secondary': '#162D20',
            '--sp-header-bg': 'rgba(15,31,23,0.95)',
            '--sp-header-text': '#BBF7D0',
            '--sp-card-bg': '#162D20',
            '--sp-card-border': 'rgba(34,197,94,0.2)',
            '--sp-accent': '#22C55E',
            '--sp-accent-light': '#86EFAC',
            '--sp-text': '#BBF7D0',
            '--sp-text-secondary': '#86EFAC',
            '--sp-footer-bg': '#0F1F17',
            '--sp-tab-active-bg': 'rgba(34,197,94,0.15)',
            '--sp-tab-active-text': '#86EFAC',
            '--sp-tab-active-border': '#22C55E',
            '--sp-price-color': '#4ADE80',
            '--sp-gradient-from': '#22C55E',
            '--sp-gradient-to': '#15803D',
        }
    },
    {
        id: "cyber",
        name: "ไซเบอร์",
        nameEn: "Cyber",
        preview: { bg: "#0A0A0A", accent: "#06FFA5", text: "#E2E8F0" },
        vars: {
            '--sp-bg': '#0A0A0A',
            '--sp-bg-secondary': '#141414',
            '--sp-header-bg': 'rgba(10,10,10,0.95)',
            '--sp-header-text': '#E2E8F0',
            '--sp-card-bg': '#141414',
            '--sp-card-border': 'rgba(6,255,165,0.15)',
            '--sp-accent': '#06FFA5',
            '--sp-accent-light': '#6EFFCB',
            '--sp-text': '#E2E8F0',
            '--sp-text-secondary': '#94A3B8',
            '--sp-footer-bg': '#0A0A0A',
            '--sp-tab-active-bg': 'rgba(6,255,165,0.1)',
            '--sp-tab-active-text': '#06FFA5',
            '--sp-tab-active-border': '#06FFA5',
            '--sp-price-color': '#06FFA5',
            '--sp-gradient-from': '#06FFA5',
            '--sp-gradient-to': '#059669',
        }
    },
];

export function getThemeById(id: string): SalePageTheme {
    return SALE_PAGE_THEMES.find(t => t.id === id) || SALE_PAGE_THEMES[0];
}
