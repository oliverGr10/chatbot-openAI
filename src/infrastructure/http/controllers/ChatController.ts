// src/infrastructure/http/controllers/ChatController.ts
import type { Request, Response, NextFunction } from 'express';
import { ProcessMessageUseCase } from '../../../application/use-cases/ProcessMessageUseCase.js';
import { BadRequestError } from '../../../utils/AppError.js';

export class ChatController {
    constructor(private processMessageUseCase: ProcessMessageUseCase) { }

    async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userPhone, message } = req.body;

            if (!userPhone || !message) {
                throw new BadRequestError('userPhone y message son requeridos');
            }

            const response = await this.processMessageUseCase.execute(userPhone, message);

            res.status(200).json({
                success: true,
                response,
            });
        } catch (error) {
            next(error);
        }
    }
}
