import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { ProductController } from '../controllers/ProductController.js';
import { OrderController } from '../controllers/OrderController.js';

export function createRoutes(
    chatController: ChatController,
    productController: ProductController,
    orderController: OrderController
): Router {
    const router = Router();

    router.get('/health', (req, res) => {
        res.json({ status: 'ok', message: 'Chatbot API is running' });
    });

    // Chat routes
    router.post('/chat/message', (req, res, next) => chatController.sendMessage(req, res, next));

    // Product routes
    router.get('/products', (req, res, next) => productController.getAllProducts(req, res, next));
    router.get('/products/:id', (req, res, next) => productController.getProductById(req, res, next));

    // Order routes
    router.post('/orders', (req, res, next) => orderController.createOrder(req, res, next));

    return router;
}
