import type { Message, ChatContext } from '../entities/Message.js';

export interface IConversationRepository {
    saveMessage(userPhone: string, message: string, role: 'user' | 'assistant'): Promise<void>;
    getHistory(userPhone: string, limit?: number): Promise<Message[]>;
    getContext(userPhone: string): Promise<ChatContext>;
}
