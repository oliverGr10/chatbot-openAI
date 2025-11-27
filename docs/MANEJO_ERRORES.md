# 🚨 Manejo de Errores - Sistema Profesional

## 📋 Tipos de Errores Implementados

| Código HTTP | Clase | Código Error | Cuándo Usar |
|-------------|-------|--------------|-------------|
| 400 | `BadRequestError` | `BAD_REQUEST` | Datos de request inválidos |
| 404 | `NotFoundError` | `NOT_FOUND` | Recurso no encontrado |
| 409 | `ConflictError` | `CONFLICT` | Conflicto de datos (stock insuficiente) |
| 422 | `ValidationError` | `VALIDATION_ERROR` | Datos válidos pero no procesables |
| **429** | **`RateLimitError`** | **`RATE_LIMIT_EXCEEDED`** | **Límite de requests excedido** |
| 500 | `InternalServerError` | `INTERNAL_SERVER_ERROR` | Error interno inesperado |

---

## ⚡ Error 429 - Rate Limit (NUEVO)

### **¿Qué es?**
La API de Gemini tiene límites de uso (requests por minuto). Cuando se excede, retorna error 429.

### **Cómo lo manejamos:**

**Antes (❌):**
```typescript
catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate response from AI service');
}
```

**Problema:** Retornaba error 500 genérico, confuso para el usuario.

---

**Ahora (✅):**
```typescript
catch (error: any) {
    console.error('Error generating AI response:', error);

    // Detectar error 429 (Rate Limit)
    if (error.status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new RateLimitError(
            'El servicio de IA está temporalmente saturado. ' +
            'Por favor, intenta nuevamente en unos segundos.'
        );
    }

    // Otros errores de la API de IA
    throw new InternalServerError(
        'No se pudo procesar tu mensaje. Por favor, intenta nuevamente.'
    );
}
```

---

### **Respuesta al Cliente (429):**

**Request:**
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "userPhone": "987654321",
    "message": "Hola"
  }'
```

**Response:**
```json
{
  "status": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "El servicio de IA está temporalmente saturado. Por favor, intenta nuevamente en unos segundos."
}
```

---

## 🏗️ Arquitectura del Manejo de Errores

```
1. Error ocurre en GeminiServiceAgent
   ↓
   API de Gemini retorna: {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}}
   ↓
2. Catch detecta el error 429
   ↓
   throw new RateLimitError('mensaje amigable')
   ↓
3. Controller captura
   ↓
   catch (error) { next(error) }
   ↓
4. errorHandler middleware procesa
   ↓
   if (err instanceof AppError) { ... }
   ↓
5. Retorna JSON al cliente
   ↓
   {
     "status": "error",
     "code": "RATE_LIMIT_EXCEEDED",
     "message": "El servicio de IA está temporalmente saturado..."
   }
```

---

## 📊 Todos los Errores Implementados

### **1. BadRequestError (400)**
```typescript
if (!userPhone || !message) {
    throw new BadRequestError('userPhone y message son requeridos');
}
```

**Respuesta:**
```json
{
  "status": "error",
  "code": "BAD_REQUEST",
  "message": "userPhone y message son requeridos"
}
```

---

### **2. NotFoundError (404)**
```typescript
if (!product) {
    throw new NotFoundError(`Producto con ID ${id} no encontrado`);
}
```

**Respuesta:**
```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "Producto con ID 999 no encontrado"
}
```

---

### **3. ConflictError (409)**
```typescript
if (product.stock < item.quantity) {
    throw new ConflictError(
        `Stock insuficiente para ${product.name}. ` +
        `Disponible: ${product.stock}, Solicitado: ${item.quantity}`
    );
}
```

**Respuesta:**
```json
{
  "status": "error",
  "code": "CONFLICT",
  "message": "Stock insuficiente para Cemento Portland. Disponible: 5, Solicitado: 10"
}
```

---

### **4. ValidationError (422)**
```typescript
if (item.quantity <= 0) {
    throw new ValidationError('La cantidad debe ser mayor a 0');
}
```

**Respuesta:**
```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "La cantidad debe ser mayor a 0"
}
```

---

### **5. RateLimitError (429) - NUEVO**
```typescript
if (error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED')) {
    throw new RateLimitError(
        'El servicio de IA está temporalmente saturado...'
    );
}
```

**Respuesta:**
```json
{
  "status": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "El servicio de IA está temporalmente saturado. Por favor, intenta nuevamente en unos segundos."
}
```

---

### **6. InternalServerError (500)**
```typescript
// Para errores inesperados
throw new InternalServerError('No se pudo procesar tu mensaje.');
```

**Respuesta:**
```json
{
  "status": "error",
  "code": "INTERNAL_SERVER_ERROR",
  "message": "No se pudo procesar tu mensaje. Por favor, intenta nuevamente."
}
```

---

## 🧪 Testing del Error 429

```typescript
test('debe lanzar RateLimitError cuando Gemini retorna 429', async () => {
  // Simular error 429 de Gemini
  mockAIService.generateResponse.mockRejectedValue({
    status: 429,
    message: 'RESOURCE_EXHAUSTED'
  });

  await expect(processMessageUseCase.execute(userPhone, message))
    .rejects.toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: expect.stringContaining('saturado')
    });
});
```

---

## 🔒 Seguridad

### **NO exponemos detalles internos:**

❌ **Mal:**
```json
{
  "error": "ApiError: RESOURCE_EXHAUSTED at GeminiService line 80...",
  "stack": "Error: ...\n    at GeminiServiceAgent..."
}
```

✅ **Bien:**
```json
{
  "status": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "El servicio de IA está temporalmente saturado. Por favor, intenta nuevamente en unos segundos."
}
```

### **Logging seguro (solo servidor):**
```typescript
console.error('Error generating AI response:', error);
// Logs completos solo en servidor, nunca al cliente
```

---

## 🎯 Ventajas del Sistema

1. ✅ **Mensajes claros al usuario** - Cada error tiene mensaje específico
2. ✅ **Códigos HTTP apropiados** - 400, 404, 409, 422, 429, 500
3. ✅ **No expone información sensible** - Stack traces solo en logs
4. ✅ **Centralizado** - errorHandler middleware único
5. ✅ **Testeable** - Errores predecibles y verificables
6. ✅ **Extensible** - Fácil agregar nuevos tipos de error

---

## 📝 Checklist de Implementación

- [x] Clase base `AppError`
- [x] `BadRequestError` (400)
- [x] `NotFoundError` (404)
- [x] `ConflictError` (409)
- [x] `ValidationError` (422)
- [x] **`RateLimitError` (429)** ← NUEVO
- [x] `InternalServerError` (500)
- [x] Middleware `errorHandler` centralizado
- [x] Controllers usan `next(error)`
- [x] Use Cases lanzan errores tipados
- [x] GeminiServiceAgent captura error 429
- [x] Tests verifican tipos de error
- [x] Documentación completa

---

## 🎓 Para la Entrevista

**Pregunta:** "¿Cómo manejas el rate limiting de APIs externas?"

**Respuesta:**

> "Implementé un manejo específico para errores 429 (Rate Limit). Cuando la API de Gemini retorna RESOURCE_EXHAUSTED o status 429, lo capturamos en el servicio de IA y lo convertimos en un RateLimitError operacional.
>
> Este error tiene:
> - Código HTTP 429 (apropiado para rate limit)
> - Código de error RATE_LIMIT_EXCEEDED
> - Mensaje amigable al usuario explicando la situación
>
> De esta forma, el usuario entiende que debe esperar, en lugar de ver un error genérico 500. El sistema diferencia entre errores operacionales (como rate limit, esperados) y errores de programación (bugs, inesperados).
>
> Esto mejora la experiencia de usuario y facilita el debugging, porque los logs muestran claramente el tipo de error que ocurrió."

---

## ✅ Conclusión

El sistema de manejo de errores ahora cubre:

- ✅ Errores de validación (400, 422)
- ✅ Recursos no encontrados (404)
- ✅ Conflictos de datos (409)
- ✅ **Rate limiting (429)** ← NUEVO
- ✅ Errores internos (500)

**Todo centralizado, seguro, testeable y profesional.** 🚀
