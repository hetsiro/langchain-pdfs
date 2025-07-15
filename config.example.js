// Ejemplo de configuración para el proyecto
// Copia este archivo como .env.local y llena tus credenciales

module.exports = {
  // OpenAI Configuration
  OPENAI_API_KEY: 'your_openai_api_key_here',
  
  // Qdrant Configuration
  QDRANT_URL: 'http://localhost:6333',
  QDRANT_API_KEY: 'your_qdrant_api_key_here',
  
  // Model Configuration
  EMBEDDING_MODEL: 'text-embedding-3-small',
  CHAT_MODEL: 'gpt-4o-mini',
  
  // Vector Store Configuration
  COLLECTION_NAME: 'pdfs',
  
  // Search Configuration
  MAX_RESULTS: 5,
  TEMPERATURE: 0.7
}; 