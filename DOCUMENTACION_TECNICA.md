# Documentación Técnica - Chatbot Inteligente para Ferretería

## 📋 Índice
1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Flujo de Comunicación Completo](#flujo-de-comunicación-completo)
3. [Diseño de Base de Datos](#diseño-de-base-de-datos)
4. [API Endpoints](#api-endpoints)
5. [Decisiones Autónomas del Chatbot](#decisiones-autónomas-del-chatbot)
6. [Consideraciones de Escalabilidad y Seguridad](#consideraciones-de-escalabilidad-y-seguridad)

---

## 1. Arquitectura del Sistema

### 1.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Messenger/HTTP)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CAPA DE INFRAESTRUCTURA                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  HTTP Controllers (Express.js)                            │  │
│  │  - ChatController                                          │  │
│  │  - ProductController                                       │  │
│  │  - OrderController                                         │  │
│  └───────────────────┬──────────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE APLICACIÓN                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Use Cases (Casos de Uso)                                 │  │
│  │  - ProcessMessageUseCase                                   │  │
│  │  - CreateOrderUseCase                                      │  │
│  │  - GetProductsUseCase                                      │  │
│  └───────────────────┬──────────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CAPA DE DOMINIO                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Interfaces y Entidades                                    │  │
│  │  - IAIService                                              │  │
│  │  - IProductRepository                                      │  │
│  │  - IOrderRepository                                        │  │
│  │  - IConversationRepository                                 │  │
│  └─────────────┬────────────────────────────────────────────┘  │
└────────────────┼────────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┬──────────────┬─────────────┐
    ▼                         ▼              ▼             ▼
┌─────────┐          ┌────────────┐   ┌──────────┐  ┌──────────┐
│ Gemini  │          │   Prisma   │   │ ChromaDB │  │  SQLite  │
│   AI    │          │    ORM     │   │ (Vector) │  │  (MySQL  │
│         │          │            │   │          │  │  ready)  │
└─────────┘          └────────────┘   └──────────┘  └──────────┘
```

### 1.2 Principios de Clean Architecture

La aplicación sigue los principios de Clean Architecture:

1. **Independencia de frameworks**: El dominio no depende de Express o Prisma
2. **Testabilidad**: Cada capa puede ser testeada independientemente
3. **Independencia de la UI**: La lógica de negocio no conoce HTTP
4. **Independencia de la base de datos**: Podemos cambiar de SQLite a MySQL sin afectar el dominio
5. **Regla de dependencia**: Las capas internas no conocen las capas externas

---

## 2. Flujo de Comunicación Completo

### 2.1 Flujo General: Recepción de Mensaje

```
1. Cliente HTTP POST /api/chat/message
   │
   │  Body: { "userPhone": "987654321", "message": "Necesito cemento" }
   │
   ▼
2. ChatController.sendMessage()
   │
   │  - Valida campos requeridos (userPhone, message)
   │  - Maneja errores HTTP
   │
   ▼
3. ProcessMessageUseCase.execute(userPhone, message)
   │
   ├─▶ 3.1 ConversationRepository.saveMessage(userPhone, message, 'user')
   │     └─▶ Prisma guarda en tabla Conversation
   │
   ├─▶ 3.2 ConversationRepository.getContext(userPhone)
   │     └─▶ Obtiene últimos 10 mensajes del usuario
   │
   ├─▶ 3.3 GeminiServiceAgent.generateResponse(context, message)
   │     │
   │     ├─▶ FASE 1: DECISIÓN AUTÓNOMA
   │     │    └─▶ El agente analiza el mensaje y decide:
   │     │        - "get_products" si menciona productos
   │     │        - "create_order" si tiene todos los datos
   │     │        - "search_faqs" si pregunta por info general
   │     │        - "respond" si puede responder directamente
   │     │
   │     ├─▶ FASE 2: EJECUCIÓN DE ACCIÓN
   │     │    │
   │     │    ├─▶ Si action = "get_products":
   │     │    │    └─▶ ProductRepository.findAll()
   │     │    │        └─▶ Prisma consulta tabla Product
   │     │    │            └─▶ Retorna productos con stock actualizado
   │     │    │
   │     │    ├─▶ Si action = "create_order":
   │     │    │    ├─▶ ProductRepository.findById() (validar stock)
   │     │    │    └─▶ OrderRepository.create()
   │     │    │        └─▶ Prisma crea Order y OrderItems
   │     │    │            └─▶ Actualiza stock de Product
   │     │    │
   │     │    └─▶ Si action = "search_faqs":
   │     │         └─▶ ChromaDBService.searchFAQs(query)
   │     │             └─▶ Búsqueda vectorial semántica
   │     │                 └─▶ Retorna 3 FAQs más relevantes
   │     │
   │     └─▶ FASE 3: RESPUESTA FINAL
   │          └─▶ Genera respuesta natural usando datos obtenidos
   │              └─▶ Retorna texto conversacional al usuario
   │
   ├─▶ 3.4 ConversationRepository.saveMessage(userPhone, response, 'assistant')
   │     └─▶ Prisma guarda respuesta del bot
   │
   └─▶ 3.5 Retorna respuesta al Controller
       │
       ▼
4. ChatController retorna JSON
   │
   │  Response: { "success": true, "response": "Tenemos cemento..." }
   │
   ▼
5. Cliente recibe respuesta
```

### 2.2 Flujo Detallado: Crear un Pedido

```
ESCENARIO: Usuario: "Quiero 3 bolsas de cemento. Soy Juan Pérez,
                     cel 987654321, dirección Av. Lima 123"

1. Mensaje llega a ProcessMessageUseCase
   │
   ▼
2. GeminiServiceAgent - FASE 1: Decisión
   │
   │  Prompt al modelo:
   │  "Analiza este mensaje y decide qué acción tomar:
   │   Usuario: Quiero 3 bolsas de cemento. Soy Juan Pérez..."
   │
   │  Modelo analiza y decide:
   │  {
   │    "action": "get_products",
   │    "params": {"searchTerm": "cemento"},
   │    "reasoning": "Necesito verificar disponibilidad de cemento"
   │  }
   │
   ▼
3. FASE 2: Ejecutar get_products
   │
   ├─▶ ProductRepository.findAll()
   │
   ├─▶ Filtra por "cemento"
   │
   └─▶ Resultado:
       {
         "success": true,
         "products": [{
           "id": 1,
           "name": "Cemento Portland Tipo I",
           "price": "S/ 28.50",
           "stock": 10
         }]
       }
   │
   ▼
4. FASE 3: Generar respuesta intermedia
   │
   │  Modelo recibe datos de productos y genera:
   │  "¡Perfecto! Tenemos Cemento Portland Tipo I en stock
   │   (10 bolsas disponibles) a S/ 28.50 cada una.
   │
   │   Tu pedido sería:
   │   - 3 bolsas de Cemento Portland Tipo I = S/ 85.50
   │
   │   Perfecto Juan, ya tengo tus datos:
   │   - Nombre: Juan Pérez
   │   - Celular: 987654321
   │   - Dirección: Av. Lima 123
   │
   │   ¿Confirmas el pedido?"
   │
   ▼
5. Usuario confirma: "Sí, confirmo"
   │
   ▼
6. NUEVO CICLO - FASE 1: Modelo decide
   │
   │  {
   │    "action": "create_order",
   │    "params": {
   │      "customerName": "Juan Pérez",
   │      "customerPhone": "987654321",
   │      "customerAddress": "Av. Lima 123",
   │      "items": [{"productId": 1, "quantity": 3}]
   │    }
   │  }
   │
   ▼
7. FASE 2: Ejecutar create_order
   │
   ├─▶ Validar stock de Product ID 1
   │    └─▶ Stock: 10 >= 3 ✅
   │
   ├─▶ OrderRepository.create()
   │    │
   │    ├─▶ Prisma transaction:
   │    │    ├─▶ INSERT INTO Order (customerName, customerPhone, ...)
   │    │    ├─▶ INSERT INTO OrderItem (orderId, productId, quantity, price)
   │    │    └─▶ UPDATE Product SET stock = stock - 3 WHERE id = 1
   │    │
   │    └─▶ Resultado:
   │         {
   │           "success": true,
   │           "order": {
   │             "id": 42,
   │             "customerName": "Juan Pérez",
   │             "totalAmount": 85.50,
   │             "items": [...]
   │           }
   │         }
   │
   ▼
8. FASE 3: Respuesta final
   │
   │  "¡Excelente! ✅ Tu pedido #42 ha sido registrado exitosamente.
   │
   │   Resumen:
   │   - 3 bolsas de Cemento Portland Tipo I
   │   - Total: S/ 85.50
   │   - Se enviará a: Av. Lima 123
   │
   │   Te contactaremos al 987654321 para coordinar la entrega.
   │   ¡Gracias por tu compra!"
   │
   ▼
9. Stock actualizado automáticamente:
   Cemento: 10 → 7 bolsas disponibles
```

---

## 3. Diseño de Base de Datos

### 3.1 Base de Datos Relacional (SQLite/MySQL)

```sql
-- Tabla: Product
-- Almacena el catálogo de productos de la ferretería
CREATE TABLE Product (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,              -- Nombre del producto
    description TEXT NOT NULL,       -- Descripción detallada
    price REAL NOT NULL,             -- Precio en soles (S/)
    stock INTEGER NOT NULL,          -- Cantidad disponible
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Order
-- Almacena los pedidos de los clientes
CREATE TABLE Order (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerName TEXT NOT NULL,      -- Nombre completo del cliente
    customerPhone TEXT NOT NULL,     -- Número de celular
    customerAddress TEXT NOT NULL,   -- Dirección de entrega
    totalAmount REAL NOT NULL,       -- Monto total del pedido
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: OrderItem
-- Detalle de los productos en cada pedido (relación N:M)
CREATE TABLE OrderItem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL,        -- FK a Order
    productId INTEGER NOT NULL,      -- FK a Product
    quantity INTEGER NOT NULL,       -- Cantidad pedida
    price REAL NOT NULL,             -- Precio al momento de la compra
    FOREIGN KEY (orderId) REFERENCES Order(id),
    FOREIGN KEY (productId) REFERENCES Product(id)
);

-- Tabla: Conversation
-- Historial de mensajes del chatbot con cada usuario
CREATE TABLE Conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userPhone TEXT NOT NULL,         -- Identificador del usuario
    message TEXT NOT NULL,           -- Contenido del mensaje
    role TEXT NOT NULL,              -- 'user' o 'assistant'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX idx_conversation_user ON Conversation(userPhone);
CREATE INDEX idx_conversation_created ON Conversation(createdAt);
CREATE INDEX idx_order_customer ON Order(customerPhone);
```

### 3.2 Base de Datos Vectorial (ChromaDB)

**Propósito**: Almacenar embeddings de las FAQs para búsqueda semántica

**Colección**: `ferreteria_faqs`

**Estructura de documentos**:
```json
{
  "id": "faq_1",
  "embedding": [0.123, -0.456, ...],  // Vector de 768 dimensiones
  "document": "¿Qué es el fierro corrugado? El fierro corrugado es...",
  "metadata": {
    "question": "¿Qué es el fierro corrugado y para qué se utiliza?",
    "answer": "El fierro corrugado es una varilla de acero...",
    "category": "productos"
  }
}
```

**Ventajas de la DB vectorial**:
- **Búsqueda semántica**: Encuentra respuestas aunque el usuario use palabras diferentes
- **Ejemplo**: Usuario pregunta "¿cuándo abren?" → Encuentra FAQ "¿Cuál es el horario de atención?"
- **Escalable**: Fácil agregar más FAQs sin modificar código

---

## 4. API Endpoints

### 4.1 POST /api/chat/message

**Descripción**: Envía un mensaje al chatbot y recibe una respuesta

**Request**:
```json
{
  "userPhone": "987654321",
  "message": "¿Tienen cemento disponible?"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "response": "¡Claro que sí! 😊 Tenemos Cemento Portland Tipo I en stock. Actualmente contamos con 10 bolsas disponibles a S/ 28.50 cada una. ¿Cuántas necesitas?"
}
```

**Errores**:
- 400 Bad Request: Campos faltantes
- 500 Internal Server Error: Error del servidor

---

### 4.2 GET /api/products

**Descripción**: Lista todos los productos disponibles

**Response** (200 OK):
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Cemento Portland Tipo I (Bolsa 42.5 kg)",
      "description": "Cemento de alta resistencia...",
      "price": 28.50,
      "stock": 10
    }
  ]
}
```

---

### 4.3 POST /api/orders

**Descripción**: Crea un nuevo pedido manualmente (también puede hacerse vía chatbot)

**Request**:
```json
{
  "customerName": "Juan Pérez",
  "customerPhone": "987654321",
  "customerAddress": "Av. Lima 123",
  "items": [
    {
      "productId": 1,
      "quantity": 3
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "order": {
    "id": 42,
    "customerName": "Juan Pérez",
    "totalAmount": 85.50,
    "items": [...]
  }
}
```

---

## 5. Decisiones Autónomas del Chatbot

### 5.1 Sistema de Agente Inteligente

El chatbot implementa un **patrón de agente** que le permite tomar decisiones autónomas sobre cuándo necesita consultar información externa.

**Funcionamiento**:

1. **Análisis del mensaje**: El modelo analiza la intención del usuario
2. **Decisión de acción**: Determina si necesita consultar datos externos
3. **Ejecución**: Llama a las funciones necesarias (get_products, create_order, search_faqs)
4. **Síntesis**: Genera respuesta natural usando los datos obtenidos

### 5.2 Ejemplo de Prompting Avanzado

```
Sistema: "Eres un agente que puede decidir cuándo consultar la base de datos.

Tienes estas acciones disponibles:
- get_products: consultar productos y stock
- create_order: crear pedidos
- search_faqs: buscar info general
- respond: responder directamente

Analiza este mensaje y decide:
Usuario: ¿Cuánto cuesta el cemento?"

Modelo decide:
{
  "action": "get_products",
  "params": {"searchTerm": "cemento"},
  "reasoning": "Necesito consultar precio actual de cemento"
}

→ Sistema ejecuta get_products()
→ Modelo genera respuesta con datos reales
```

### 5.3 Ventajas sobre opciones estáticas

❌ **Enfoque incorrecto** (penalizado en la prueba):
```
Usuario: Hola
Bot: "Elige: 1) Ver productos  2) Hacer pedido"
```

✅ **Enfoque correcto** (implementado):
```
Usuario: Hola
Bot: "¡Hola! Bienvenido a Ferretería Assistant 😊
     ¿En qué puedo ayudarte hoy?"

Usuario: Necesito algo para pintar
Bot: [DECIDE AUTOMÁTICAMENTE llamar a get_products("pintura")]
     "Perfecto, para pintar tenemos:
      - Pintura Látex Blanca 1 galón a S/ 45.00 (5 disponibles)
      - Brocha de 2" a S/ 8.50 (5 disponibles)

      ¿Te interesa alguno de estos productos?"
```

---

## 6. Consideraciones de Escalabilidad y Seguridad

### 6.1 Escalabilidad

**Arquitectura actual**:
- ✅ Separación en capas permite escalar componentes independientemente
- ✅ Prisma ORM facilita migración a PostgreSQL/MySQL
- ✅ ChromaDB puede correr en servidor dedicado

**Recomendaciones para producción**:

1. **Caché**:
   ```typescript
   // Redis para cachear consultas frecuentes
   const cachedProducts = await redis.get('products:all');
   if (!cachedProducts) {
     const products = await productRepo.findAll();
     await redis.setex('products:all', 3600, JSON.stringify(products));
   }
   ```

2. **Rate Limiting**:
   ```typescript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutos
     max: 100 // límite de 100 requests
   });

   app.use('/api', limiter);
   ```

3. **Horizontal Scaling**:
   - Usar PM2 o Kubernetes para múltiples instancias
   - Load balancer (nginx) para distribuir tráfico
   - Base de datos centralizada

4. **Async Processing**:
   ```typescript
   // Cola de trabajos para pedidos grandes
   import Bull from 'bull';
   const orderQueue = new Bull('orders');

   orderQueue.process(async (job) => {
     await processLargeOrder(job.data);
   });
   ```

### 6.2 Seguridad

**Implementaciones actuales**:

1. **Validación de inputs**:
   ```typescript
   if (!userPhone || !message) {
     return res.status(400).json({ error: 'Campos requeridos' });
   }
   ```

2. **Variables de entorno**:
   - API keys en `.env`
   - No se expone información sensible

**Recomendaciones adicionales**:

1. **SQL Injection**: ✅ Prisma previene automáticamente

2. **XSS Prevention**:
   ```typescript
   import DOMPurify from 'isomorphic-dompurify';
   const cleanMessage = DOMPurify.sanitize(userMessage);
   ```

3. **CORS configurado**:
   ```typescript
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS.split(','),
     credentials: true
   }));
   ```

4. **Autenticación** (para producción):
   ```typescript
   import jwt from 'jsonwebtoken';

   const authenticateUser = (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'No autorizado' });

     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.user = decoded;
       next();
     } catch (error) {
       return res.status(401).json({ error: 'Token inválido' });
     }
   };
   ```

5. **Logs y Monitoreo**:
   ```typescript
   import winston from 'winston';

   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' })
     ]
   });
   ```

---

## 7. Cómo Ejecutar el Proyecto

### 7.1 Requisitos previos
- Node.js v18+
- npm o yarn
- Cuenta de Google AI (para Gemini API key)

### 7.2 Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd prueba-tecnica

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar tu GEMINI_API_KEY

# 4. Crear base de datos y cargar productos
npx prisma migrate dev --name init
npm run seed

# 5. Iniciar servidor
npm run dev
```

### 7.3 Obtener Gemini API Key

1. Ir a: https://aistudio.google.com/app/apikey
2. Crear nueva API key
3. Copiar y pegar en `.env`:
   ```
   GEMINI_API_KEY=tu_api_key_aqui
   ```

### 7.4 Probar el chatbot

```bash
# Opción 1: Con el script de prueba
npx tsx test-chatbot.ts

# Opción 2: Con curl
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"userPhone": "987654321", "message": "Hola, necesito cemento"}'
```

---

## 8. Conclusión

Este chatbot implementa todos los requisitos de la prueba técnica:

✅ **API con Node.js + Express** con arquitectura limpia
✅ **Base de datos relacional** (SQLite, compatible con MySQL)
✅ **Base de datos vectorial** (ChromaDB) para FAQs
✅ **IA conversacional** (Gemini)
✅ **Decisiones autónomas**: El bot decide cuándo consultar la DB
✅ **Function Calling** mediante Agent Pattern
✅ **Prompting avanzado** para comportamiento inteligente
✅ **Historial de conversación** persistente
✅ **Gestión de pedidos** con validación de stock
✅ **Documentación completa**

El sistema es **escalable**, **mantenible** y **listo para producción** con pequeños ajustes de seguridad.
