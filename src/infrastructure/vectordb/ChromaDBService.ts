import { ChromaClient, type Collection } from 'chromadb';
import { GoogleGenAI } from '@google/genai';

interface FAQ {
    question: string;
    answer: string;
    category?: string;
}

export class ChromaDBService {
    private client: ChromaClient;
    private collection?: Collection;
    private ai: GoogleGenAI;
    private collectionName = 'ferreteria_faqs';

    constructor(geminiApiKey: string, chromaHost: string = 'http://localhost:8000') {
        this.client = new ChromaClient({ path: chromaHost });
        this.ai = new GoogleGenAI({ apiKey: geminiApiKey });
    }

    async initialize(): Promise<void> {
        try {
            this.collection = await this.client.getOrCreateCollection({
                name: this.collectionName,
                metadata: { description: 'Preguntas frecuentes de la ferretería con embeddings' }
            });
            console.log(`✅ ChromaDB collection "${this.collectionName}" initialized`);
        } catch (error) {
            console.error('Error initializing ChromaDB:', error);
            throw error;
        }
    }

    private async generateEmbedding(text: string): Promise<number[]> {

        const embedding = Array.from({ length: 768 }, (_, i) => {
            const hash = this.simpleHash(text + i.toString());
            return (hash % 200 - 100) / 100; // Normalizar a [-1, 1]
        });

        return embedding;
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    async seedFAQs(faqs: FAQ[]): Promise<void> {
        if (!this.collection) {
            throw new Error('Collection not initialized');
        }

        try {
            console.log(`📚 Loading ${faqs.length} FAQs into ChromaDB...`);

            const ids: string[] = [];
            const embeddings: number[][] = [];
            const documents: string[] = [];
            const metadatas: any[] = [];

            for (let i = 0; i < faqs.length; i++) {
                const faq = faqs[i];
                if (!faq) continue;

                const combinedText = `${faq.question} ${faq.answer}`;

                ids.push(`faq_${i}`);
                embeddings.push(await this.generateEmbedding(combinedText));
                documents.push(combinedText);
                metadatas.push({
                    question: faq.question,
                    answer: faq.answer,
                    category: faq.category || 'general'
                });
            }

            await this.collection.add({
                ids,
                embeddings,
                documents,
                metadatas
            });

            console.log(`✅ ${faqs.length} FAQs loaded successfully`);
        } catch (error) {
            console.error('Error seeding FAQs:', error);
            throw error;
        }
    }

    async searchFAQs(query: string, limit: number = 3): Promise<FAQ[]> {
        if (!this.collection) {
            throw new Error('Collection not initialized');
        }

        try {
            const queryEmbedding = await this.generateEmbedding(query);

            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: limit
            });

            if (!results.metadatas || !results.metadatas[0]) {
                return [];
            }

            return results.metadatas[0].map((metadata: any) => ({
                question: metadata.question,
                answer: metadata.answer,
                category: metadata.category
            }));
        } catch (error) {
            console.error('Error searching FAQs:', error);
            return [];
        }
    }

    async clearCollection(): Promise<void> {
        if (this.collection) {
            try {
                await this.client.deleteCollection({ name: this.collectionName });
                console.log(`🗑️ Collection "${this.collectionName}" deleted`);
            } catch (error) {
                console.error('Error clearing collection:', error);
            }
        }
    }
}
