import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { ProcessMessageUseCase } from '../../application/use-cases/ProcessMessageUseCase.js';
import type { IAIService } from '../../domain/interfaces/IAIService.js';
import type { IConversationRepository } from '../../domain/interfaces/IConversationRepository.js';
import type { Message } from '../../domain/entities/Message.js';

describe('ProcessMessageUseCase - Orquestación de Conversación', () => {
  let processMessageUseCase: ProcessMessageUseCase;
  let mockAIService: jest.Mocked<IAIService>;
  let mockConversationRepo: jest.Mocked<IConversationRepository>;

  beforeEach(() => {
    mockAIService = {
      generateResponse: jest.fn(),
    } as any;

    mockConversationRepo = {
      saveMessage: jest.fn(),
      getContext: jest.fn(),
    } as any;

    processMessageUseCase = new ProcessMessageUseCase(
      mockAIService,
      mockConversationRepo
    );
  });

  test('debe guardar el mensaje del usuario ANTES de procesar', async () => {
    // Arrange
    const userPhone = '987654321';
    const userMessage = 'Hola, ¿tienen cemento?';
    const history: Message[] = [];
    const context = { userPhone, history };
    const aiResponse = 'Sí, tenemos cemento disponible';

    mockConversationRepo.getContext.mockResolvedValue(context);
    mockAIService.generateResponse.mockResolvedValue(aiResponse);

    // Act
    await processMessageUseCase.execute(userPhone, userMessage);

    // Assert
    expect(mockConversationRepo.saveMessage).toHaveBeenNthCalledWith(
      1,
      userPhone,
      userMessage,
      'user'
    );
  });

  test('debe obtener el contexto de conversación para el usuario', async () => {
    // Arrange
    const userPhone = '987654321';
    const userMessage = 'Dame 3 bolsas';
    const history: Message[] = [
      {
        id: 1,
        userPhone,
        message: '¿Tienen cemento?',
        role: 'user',
        createdAt: new Date(),
      },
      {
        id: 2,
        userPhone,
        message: 'Sí, tenemos cemento',
        role: 'assistant',
        createdAt: new Date(),
      },
    ];
    const context = { userPhone, history };
    const aiResponse = 'Perfecto, 3 bolsas de cemento';

    mockConversationRepo.getContext.mockResolvedValue(context);
    mockAIService.generateResponse.mockResolvedValue(aiResponse);

    // Act
    await processMessageUseCase.execute(userPhone, userMessage);

    // Assert
    expect(mockConversationRepo.getContext).toHaveBeenCalledWith(userPhone);
    expect(mockAIService.generateResponse).toHaveBeenCalledWith(
      context,
      userMessage
    );
  });

  test('debe generar respuesta con IA usando el contexto', async () => {
    // Arrange
    const userPhone = '987654321';
    const userMessage = '¿Cuánto cuesta?';
    const history: Message[] = [
      {
        id: 1,
        userPhone,
        message: 'Necesito cemento',
        role: 'user',
        createdAt: new Date(),
      },
    ];
    const context = { userPhone, history };
    const aiResponse = 'El cemento cuesta S/ 28.50 por bolsa';

    mockConversationRepo.getContext.mockResolvedValue(context);
    mockAIService.generateResponse.mockResolvedValue(aiResponse);

    // Act
    const result = await processMessageUseCase.execute(userPhone, userMessage);

    // Assert
    expect(mockAIService.generateResponse).toHaveBeenCalledWith(
      context,
      userMessage
    );
    expect(result).toBe(aiResponse);
  });

  test('debe guardar la respuesta del asistente DESPUÉS de generar', async () => {
    // Arrange
    const userPhone = '987654321';
    const userMessage = 'Hola';
    const history: Message[] = [];
    const context = { userPhone, history };
    const aiResponse = '¡Hola! ¿En qué puedo ayudarte?';

    mockConversationRepo.getContext.mockResolvedValue(context);
    mockAIService.generateResponse.mockResolvedValue(aiResponse);

    // Act
    await processMessageUseCase.execute(userPhone, userMessage);

    // Assert
    expect(mockConversationRepo.saveMessage).toHaveBeenNthCalledWith(
      2,
      userPhone,
      aiResponse,
      'assistant'
    );
  });

  test('debe retornar la respuesta generada por la IA', async () => {
    // Arrange
    const userPhone = '987654321';
    const userMessage = '¿Qué productos tienen?';
    const aiResponse = 'Tenemos cemento, fierro, pintura...';
    const context = { userPhone, history: [] };

    mockConversationRepo.getContext.mockResolvedValue(context);
    mockAIService.generateResponse.mockResolvedValue(aiResponse);

    // Act
    const result = await processMessageUseCase.execute(userPhone, userMessage);

    // Assert
    expect(result).toBe(aiResponse);
  });

  test('debe ejecutar pasos en el orden correcto: guardar > contexto > IA > guardar', async () => {
    // Arrange
    const userPhone = '987654321';
    const userMessage = 'Test mensaje';
    const history: Message[] = [];
    const context = { userPhone, history };
    const aiResponse = 'Test respuesta';

    const callOrder: string[] = [];

    mockConversationRepo.saveMessage.mockImplementation(
      async (phone, msg, role) => {
        callOrder.push(`save-${role}`);
      }
    );

    mockConversationRepo.getContext.mockImplementation(async (phone) => {
      callOrder.push('getContext');
      return context;
    });

    mockAIService.generateResponse.mockImplementation(async (ctx, msg) => {
      callOrder.push('generateResponse');
      return aiResponse;
    });

    // Act
    await processMessageUseCase.execute(userPhone, userMessage);

    // Assert
    expect(callOrder).toEqual([
      'save-user',
      'getContext',
      'generateResponse',
      'save-assistant',
    ]);
  });

  test('debe propagar errores si la IA falla', async () => {
    // Arrange
    const userPhone = '987654321';
    const userMessage = 'Test';
    const errorMessage = 'Error de API de IA';
    const context = { userPhone, history: [] };

    mockConversationRepo.getContext.mockResolvedValue(context);
    mockAIService.generateResponse.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(
      processMessageUseCase.execute(userPhone, userMessage)
    ).rejects.toThrow(errorMessage);

    // El mensaje del usuario debe haberse guardado
    expect(mockConversationRepo.saveMessage).toHaveBeenCalledWith(
      userPhone,
      userMessage,
      'user'
    );

    // La respuesta del asistente NO debe haberse guardado
    expect(mockConversationRepo.saveMessage).toHaveBeenCalledTimes(1);
  });
});
