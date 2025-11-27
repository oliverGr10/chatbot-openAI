import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { createRoutes } from './infrastructure/http/routes/index.js';

// Repositories
import { ProductRepository } from './infrastructure/database/ProductRepository.js';
import { OrderRepository } from './infrastructure/database/OrderRepository.js';
import { ConversationRepository } from './infrastructure/database/ConversationRepository.js';

// Services
import { GeminiServiceAgent } from './infrastructure/ai/GeminiServiceAgent.js';

// Use Cases
import { ProcessMessageUseCase } from './application/use-cases/ProcessMessageUseCase.js';
import { CreateOrderUseCase } from './application/use-cases/CreateOrderUseCase.js';
import { GetProductsUseCase } from './application/use-cases/GetProductsUseCase.js';

// Controllers
import { ChatController } from './infrastructure/http/controllers/ChatController.js';
import { ProductController } from './infrastructure/http/controllers/ProductController.js';
import { OrderController } from './infrastructure/http/controllers/OrderController.js';

// Initialize repositories
const productRepo = new ProductRepository();
const orderRepo = new OrderRepository();
const conversationRepo = new ConversationRepository();

// Initialize services
const aiService = new GeminiServiceAgent(config.geminiApiKey);
// Inyectar repositorios al servicio de IA para que pueda ejecutar funciones
aiService.setRepositories?.(productRepo, orderRepo);

// Initialize use cases
const processMessageUseCase = new ProcessMessageUseCase(aiService, conversationRepo);
const createOrderUseCase = new CreateOrderUseCase(orderRepo, productRepo);
const getProductsUseCase = new GetProductsUseCase(productRepo);

// Initialize controllers
const chatController = new ChatController(processMessageUseCase);
const productController = new ProductController(getProductsUseCase);
const orderController = new OrderController(createOrderUseCase);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const routes = createRoutes(chatController, productController, orderController);
app.use('/api', routes);

// Error Handling Middleware (debe ir al final)
import { errorHandler } from './utils/errorHandler.js';
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat/message`);
});

export default app;
