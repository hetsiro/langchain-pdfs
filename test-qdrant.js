// Script para probar la conexión con Qdrant
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

async function testQdrantConnection() {
  try {
    console.log('🔍 Probando conexión con Qdrant...');
    
    // Verificar si Qdrant está disponible
    const collections = await qdrant.getCollections();
    console.log('✅ Conexión exitosa con Qdrant');
    console.log('📚 Colecciones existentes:', collections.collections.map(c => c.name));
    
    // Verificar si existe la colección pdfs
    try {
      const pdfsCollection = await qdrant.getCollection('pdfs');
      console.log('✅ Colección "pdfs" existe');
      console.log('📊 Información de la colección:', {
        name: pdfsCollection.name,
        vectors_count: pdfsCollection.vectors_count,
        points_count: pdfsCollection.points_count
      });
    } catch {
      console.log('❌ Colección "pdfs" no existe');
      console.log('🔄 Creando colección...');
      
      await qdrant.createCollection('pdfs', {
        vectors: {
          size: 1536, // text-embedding-3-small
          distance: 'Cosine'
        }
      });
      
      console.log('✅ Colección "pdfs" creada exitosamente');
    }
    
  } catch (error) {
    console.error('❌ Error conectando con Qdrant:', error.message);
    console.log('💡 Asegúrate de que:');
    console.log('   1. Qdrant esté ejecutándose');
    console.log('   2. La URL sea correcta');
    console.log('   3. El API key sea válido (si usas Qdrant Cloud)');
  }
}

testQdrantConnection(); 