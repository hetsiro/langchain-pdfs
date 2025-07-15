# Sistema de Gestión de CVs con IA

Este es un sistema inteligente para gestionar y consultar CVs usando OpenAI y Qdrant.

## 🚀 Características

- **Subir múltiples CVs** en formato PDF
- **Búsqueda semántica** usando embeddings de OpenAI
- **Chat inteligente** con GPT-4o-mini para consultas sobre candidatos
- **Almacenamiento vectorial** con Qdrant
- **Interfaz moderna** con React y Tailwind CSS

## 📋 Requisitos

- Node.js 18+
- OpenAI API Key
- Qdrant (local o cloud)

## ⚙️ Configuración

1. **Instalar dependencias:**
```bash
npm install
```

2. **Crear archivo `.env.local`:**
```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_here
```

3. **Configurar Qdrant:**
   - Instalar Qdrant localmente o usar Qdrant Cloud
   - Crear una colección llamada `pdfs`

4. **Ejecutar el proyecto:**
```bash
npm run dev
```

## 🎯 Uso

1. **Subir CVs:** Arrastra o selecciona múltiples archivos PDF
2. **Hacer consultas:** Pregunta sobre los candidatos
3. **Ejemplos de consultas:**
   - "¿Quién es el mejor para un puesto de React?"
   - "¿Quién sabe Next.js?"
   - "¿Quién tiene más experiencia?"

## 🔧 Tecnologías

- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **IA:** OpenAI GPT-4o-mini, text-embedding-3-small
- **Vector DB:** Qdrant
- **LangChain:** Para integración de IA

## 📝 Licencia

MIT
