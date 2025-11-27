import type { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError.js';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof AppError) {
        console.warn(`[${err.code || 'APP_ERROR'}] ${err.message}`);

        return res.status(err.statusCode).json({
            status: 'error',
            code: err.code,
            message: err.message,
        });
    }

    console.error('💥 ERROR NO CONTROLADO:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
    });

    return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ha ocurrido un error interno. Por favor, intenta nuevamente.',
    });
};
