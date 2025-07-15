import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
config({ path: join(__dirname, '.env.local') });

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

console.log('🔍 Probando conexión con Qdrant...');
console.log('URL:', QDRANT_URL);
console.log('API Key:', QDRANT_API_KEY ? 'Configurado' : 'No configurado');

async function testConnection() {
  try {
    const response = await fetch(`${QDRANT_URL}/collections`, {
      headers: {
        'api-key': QDRANT_API_KEY
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Conexión exitosa');
      console.log('Colecciones disponibles:', data.result?.collections?.length || 0);
      
      // Buscar la colección pdfs
      const pdfsCollection = data.result?.collections?.find(c => c.name === 'pdfs');
      if (pdfsCollection) {
        console.log('✅ Colección "pdfs" encontrada');
        console.log('Puntos en la colección:', pdfsCollection.points_count);
      } else {
        console.log('❌ Colección "pdfs" no encontrada');
      }
    } else {
      console.log('❌ Error en la respuesta:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
}

testConnection(); 