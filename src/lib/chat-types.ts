// ═══════════════════════════════════════════════════════════════
// Chat Dashboard — Shared Types & Constants (inlined from @unified-chat/shared)
// ═══════════════════════════════════════════════════════════════

// ─── Enums ───────────────────────────────────────────────────

export type ChannelType = 'MESSENGER' | 'INSTAGRAM' | 'LINE' | 'WHATSAPP' | 'ZALO';
export type ConversationStatus = 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'ARCHIVED';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'NOTE';
export type AgentRole = 'ADMIN' | 'AGENT';
export type SendStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

// ─── Interfaces ──────────────────────────────────────────────

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  channelId: string;
  platformContactId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  email: string;
  name: string;
  role: AgentRole;
  avatarUrl: string | null;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  channelId: string;
  contactId: string;
  assignedAgentId: string | null;
  status: ConversationStatus;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  contact?: Contact;
  channel?: Channel;
  assignedAgent?: Agent;
  messages?: Message[];
  tags?: Tag[];
  notes?: Note[];
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  imageUrl: string | null;
  platformMessageId: string | null;
  sendStatus: SendStatus;
  senderName: string | null;
  senderAgentId: string | null;
  rawPayload: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Note {
  id: string;
  conversationId: string;
  agentId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  agent?: Agent;
}

export interface CannedReply {
  id: string;
  title: string;
  content: string;
  shortcut: string;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  conversationId: string | null;
  contactId: string;
  agentId: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  note: string | null;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InboxItem {
  id: string;
  contactName: string;
  contactAvatar: string | null;
  channelType: ChannelType;
  status: ConversationStatus;
  lastMessage: string | null;
  lastMessageAt: Date;
  unreadCount: number;
  assignedAgent: string | null;
  tags: { id: string; name: string; color: string }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SendMessageRequest {
  conversationId: string;
  type: MessageType;
  content: string;
  imageUrl?: string;
}

// ─── Constants ───────────────────────────────────────────────

export const CHANNEL_CONFIG = {
  MESSENGER: { label: 'Messenger', icon: '💬', color: '#0084FF', bgColor: '#E7F3FF' },
  INSTAGRAM: { label: 'Instagram', icon: '📸', color: '#E4405F', bgColor: '#FDEEF1' },
  LINE:      { label: 'LINE',      icon: '💚', color: '#00B900', bgColor: '#E6FFE6' },
  WHATSAPP:  { label: 'WhatsApp',  icon: '📱', color: '#25D366', bgColor: '#E8FFF0' },
  ZALO:      { label: 'Zalo',      icon: '🟦', color: '#0068FF', bgColor: '#E6F0FF' },
} as const;

export const STATUS_CONFIG = {
  OPEN:     { label: 'เปิด',          labelEn: 'Open',     color: '#F59E0B', bgColor: '#FEF3C7' },
  ASSIGNED: { label: 'มอบหมายแล้ว',   labelEn: 'Assigned', color: '#3B82F6', bgColor: '#DBEAFE' },
  RESOLVED: { label: 'แก้ไขแล้ว',     labelEn: 'Resolved', color: '#10B981', bgColor: '#D1FAE5' },
  ARCHIVED: { label: 'เก็บถาวร',      labelEn: 'Archived', color: '#6B7280', bgColor: '#F3F4F6' },
} as const;

export const ORDER_STATUS_CONFIG = {
  DRAFT:     { label: 'แบบร่าง',    color: '#9CA3AF', icon: '📝' },
  CONFIRMED: { label: 'ยืนยันแล้ว', color: '#3B82F6', icon: '✅' },
  PAID:      { label: 'ชำระแล้ว',   color: '#10B981', icon: '💰' },
  SHIPPED:   { label: 'จัดส่งแล้ว', color: '#8B5CF6', icon: '🚚' },
  DELIVERED: { label: 'ได้รับแล้ว', color: '#059669', icon: '📦' },
  CANCELLED: { label: 'ยกเลิก',    color: '#EF4444', icon: '❌' },
} as const;

export const MAX_MESSAGE_LENGTH = 5000;
export const CONVERSATIONS_PER_PAGE = 20;

// ─── Validation Schemas (simple, no zod) ─────────────────────

export const LoginSchema = {
  parse(data: unknown) {
    const d = data as { email?: string; password?: string };
    if (!d.email || !d.email.includes('@')) throw new Error('Invalid email');
    if (!d.password || d.password.length < 6) throw new Error('Password must be at least 6 chars');
    return { email: d.email, password: d.password };
  }
};

export const SendMessageSchema = {
  parse(data: unknown) {
    const d = data as { conversationId?: string; type?: string; content?: string; imageUrl?: string };
    if (!d.conversationId) throw new Error('conversationId required');
    if (!d.content) throw new Error('content required');
    return {
      conversationId: d.conversationId,
      type: (d.type || 'TEXT') as MessageType,
      content: d.content,
      imageUrl: d.imageUrl,
    };
  }
};
