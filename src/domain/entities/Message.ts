export interface Message {
    id: number;
    userPhone: string;
    message: string;
    role: 'user' | 'assistant';
    createdAt: Date;
}

export interface ChatContext {
    userPhone: string;
    history: Message[];
}
