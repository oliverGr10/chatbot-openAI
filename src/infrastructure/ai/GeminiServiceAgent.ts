import { GoogleGenAI } from '@google/genai';
import type { IAIService } from '../../domain/interfaces/IAIService.js';
import type { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import type { IOrderRepository } from '../../domain/interfaces/IOrderRepository.js';
import type { ChatContext } from '../../domain/entities/Message.js';
import { RateLimitError, InternalServerError } from '../../utils/AppError.js';
import { SYSTEM_PROMPT, buildFinalPrompt } from './prompts.js';
import type { AgentAction } from './prompts.js';
export class GeminiServiceAgent implements IAIService {
    private ai: GoogleGenAI;
    private productRepo?: IProductRepository;
    private orderRepo?: IOrderRepository;

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    setRepositories(productRepo: IProductRepository, orderRepo: IOrderRepository): void {
        this.productRepo = productRepo;
        this.orderRepo = orderRepo;
    }

    async generateResponse(context: ChatContext, userMessage: string): Promise<string> {
        const systemPrompt = SYSTEM_PROMPT;
        const conversationHistory = this.buildConversationHistory(context);

        try {
            const decisionPrompt = `${systemPrompt}\n\n${conversationHistory}\n\nUsuario: ${userMessage}\n\nAntes de responder, decide qué acción tomar. Responde SOLO con un objeto JSON en este formato exacto:\n{"action": "get_products|create_order|search_faqs|respond", "params": {}, "reasoning": "explicación corta"}\n\nAcción:`;

            const decisionResponse = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: decisionPrompt
            });

            let decisionText = (decisionResponse.text || '').trim();

            decisionText = decisionText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            let decision: AgentAction;
            try {
                decision = JSON.parse(decisionText);
            } catch (e) {

                decision = { action: 'respond' };
            }

            console.log('🤖 Agent Decision:', decision);

            let actionResult = '';

            switch (decision.action) {
                case 'get_products':
                    actionResult = await this.executeGetProducts(decision.params?.searchTerm);
                    break;

                case 'create_order':
                    actionResult = await this.executeCreateOrder(decision.params);
                    break;

                case 'search_faqs':
                    actionResult = await this.executeSearchFAQs(userMessage);
                    break;

                case 'respond':
                    break;
            }

            const finalPrompt = buildFinalPrompt(
                systemPrompt,
                conversationHistory,
                userMessage,
                decision,
                actionResult
            );

            const finalResponse = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: finalPrompt
            });

            let responseText = finalResponse.text || 'Lo siento, no pude generar una respuesta. ¿Puedes reformular tu pregunta?';

            responseText = this.cleanResponse(responseText);

            return responseText;

        } catch (error: any) {
            console.error('Error generating AI response:', error);

            if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                throw new RateLimitError(
                    'El servicio de IA está temporalmente saturado. Por favor, intenta nuevamente en unos segundos.'
                );
            }

            throw new InternalServerError('No se pudo procesar tu mensaje. Por favor, intenta nuevamente.');
        }
    }

    private cleanResponse(text: string): string {

        let cleaned = text.replace(/```[\s\S]*?```/g, '');

        cleaned = cleaned
            .split('\n')
            .filter(line => {
                const lower = line.toLowerCase();
                return !lower.includes('tool_code') &&
                    !lower.includes('"action"') &&
                    !lower.includes('respond(') &&
                    !lower.trim().startsWith('{') &&
                    !lower.trim().startsWith('}');
            })
            .join('\n');

        if (cleaned.trim().length < 10) {
            const match = text.match(/"([^"]{20,})"/);
            if (match && match[1]) {
                cleaned = match[1];
            }
        }

        return cleaned.trim() || text;
    }

    private async executeGetProducts(searchTerm?: string): Promise<string> {
        if (!this.productRepo) {
            return 'ERROR: No se pudo consultar productos';
        }

        try {
            const products = await this.productRepo.findAll();

            let filteredProducts = products;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filteredProducts = products.filter(p =>
                    p.name.toLowerCase().includes(term) ||
                    p.description.toLowerCase().includes(term)
                );
            }

            return JSON.stringify({
                success: true,
                count: filteredProducts.length,
                products: filteredProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: `S/ ${p.price}`,
                    stock: p.stock
                }))
            }, null, 2);
        } catch (error) {
            return `ERROR: ${error}`;
        }
    }

    private async executeCreateOrder(orderData: any): Promise<string> {
        if (!this.orderRepo || !this.productRepo) {
            return 'ERROR: Repositorios no configurados';
        }

        try {
            if (!orderData || !orderData.customerName || !orderData.customerPhone || !orderData.customerAddress || !orderData.items) {
                return 'ERROR: Faltan datos del cliente o productos';
            }

            for (const item of orderData.items) {
                const product = await this.productRepo.findById(item.productId);
                if (!product) {
                    return `ERROR: Producto ID ${item.productId} no encontrado`;
                }
                if (product.stock < item.quantity) {
                    return `ERROR: Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`;
                }
            }

            const order = await this.orderRepo.create(orderData);

            return JSON.stringify({
                success: true,
                order: {
                    id: order.id,
                    customerName: order.customerName,
                    customerPhone: order.customerPhone,
                    customerAddress: order.customerAddress,
                    totalAmount: order.totalAmount,
                    items: order.items.map(item => ({
                        product: item.name,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            }, null, 2);
        } catch (error) {
            return `ERROR: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        }
    }

    private async executeSearchFAQs(query: string): Promise<string> {
        const faqs = [
            {
                question: '¿Qué es el fierro corrugado y para qué se utiliza?',
                answer: 'El fierro corrugado es una varilla de acero con relieves en su superficie que mejora la adherencia al concreto. Se usa como refuerzo estructural en columnas, vigas y losas.'
            },
            {
                question: '¿Qué tipo de cemento se recomienda para estructuras resistentes?',
                answer: 'Para estructuras que requieren alta resistencia, se recomienda el Cemento Portland Tipo I, por su durabilidad y desempeño en obras generales.'
            },
            {
                question: '¿Qué ventajas tiene usar pintura látex en interiores?',
                answer: 'La pintura látex es ideal para interiores por su bajo olor, fácil aplicación, rápido secado y posibilidad de limpieza sin dañar el acabado.'
            },
            {
                question: '¿Cuál es el horario de atención?',
                answer: 'Atendemos de lunes a sábado entre 8:00 a.m. y 6:00 p.m. No atendemos domingos o feriados.'
            },
            {
                question: '¿Qué métodos de pago aceptan?',
                answer: 'Aceptamos transferencias bancarias, Yape y Plin.'
            },
            {
                question: '¿Hacen entregas a domicilio?',
                answer: 'Sí, ofrecemos servicio de entrega a domicilio.'
            },
            {
                question: '¿Qué herramientas básicas necesito para trabajos domésticos?',
                answer: 'Las herramientas esenciales incluyen taladro, cinta métrica, brochas, llave ajustable, guantes de seguridad y destornilladores.'
            },
            {
                question: '¿Qué beneficios ofrecen los focos LED?',
                answer: 'Los focos LED consumen menos energía, duran más tiempo y generan menos calor, lo que los hace más eficientes y seguros.'
            }
        ];

        const queryLower = query.toLowerCase();
        const matchedFAQs = faqs.filter(faq =>
            faq.question.toLowerCase().includes(queryLower) ||
            faq.answer.toLowerCase().includes(queryLower) ||
            queryLower.split(' ').some(word =>
                word.length > 3 && (
                    faq.question.toLowerCase().includes(word) ||
                    faq.answer.toLowerCase().includes(word)
                )
            )
        );

        return JSON.stringify({
            success: true,
            faqs: matchedFAQs.slice(0, 3)
        }, null, 2);
    }

    private buildConversationHistory(context: ChatContext): string {
        if (context.history.length === 0) {
            return '';
        }

        return context.history
            .map((msg) => {
                const role = msg.role === 'user' ? 'Usuario' : 'Asistente';
                return `${role}: ${msg.message}`;
            })
            .join('\n');
    }
}
