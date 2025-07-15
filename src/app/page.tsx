'use client';

import { useState, useRef, useEffect } from 'react';

interface MessageContentKwargs {
  kwargs: {
    content: string;
  };
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string | MessageContentKwargs;
}

interface QdrantPoint {
  id: string | number;
  payload?: {
    content?: string;
    metadata?: {
      fileName?: string;
      pdfId?: string;
      source?: string;
    };
  };
}

function hasKwargs(content: string | MessageContentKwargs): content is MessageContentKwargs {
  return typeof content === 'object' && content !== null && 'kwargs' in content;
}

export default function Home() {
  const [files, setFiles] = useState<QdrantPoint[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCVs, setIsLoadingCVs] = useState(true); // Nuevo estado para loading de CVs
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar CVs del vector store al montar el componente
  useEffect(() => {
    loadCVsFromVectorStore();
  }, []);

  const loadCVsFromVectorStore = async () => {
    try {
      setIsLoadingCVs(true); // Activar loading
      const response = await fetch('/api/cvs');
      const result = await response.json();
      if (response.ok && result.cvs) {
        setFiles(result.cvs); // Guardar los puntos tal cual
      }
    } catch (error) {
      console.error('Error cargando CVs:', error);
    } finally {
      setIsLoadingCVs(false); // Desactivar loading
    }
  };



  const handleMultipleFileUpload = async (uploadedFiles: FileList) => {
    const pdfFiles = Array.from(uploadedFiles).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      alert('No se encontraron archivos PDF válidos');
      return;
    }

    setIsUploading(true);
    let uploadedCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    const successfulFiles = [];
    const duplicateFiles = [];

    for (const file of pdfFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          // Verificar si ya existe un CV con el mismo pdfId
          const existingCV = files.find(f => f.payload?.metadata?.pdfId === result.pdfId);
          if (!existingCV) {
            setFiles(prev => [...prev, {
              id: result.pdfId, // Usar el pdfId como ID
              payload: {
                metadata: {
                  fileName: file.name,
                  pdfId: result.pdfId
                }
              }
            }]);
            uploadedCount++;
            successfulFiles.push(file.name);
          } else {
            console.log(`CV ya existe: ${file.name}`);
          }
        } else {
          // Verificar si es un error de duplicado
          if (response.status === 409) {
            console.log(`CV ya existe: ${file.name}`);
            duplicateCount++;
            duplicateFiles.push(file.name);
            // No contar como error, solo informar
          } else {
            const errorData = await response.json();
            const errorMessage = errorData.error || `Error subiendo ${file.name}`;
            console.error(`Error subiendo ${file.name}: ${errorMessage}`);
            failedCount++;
          }
        }
      } catch (error) {
        console.error(`Error subiendo ${file.name}:`, error);
        failedCount++;
      }
    }

    // Mostrar mensaje de resultado
    let message = '';
    if (uploadedCount > 0) {
      message += `✅ Se subieron ${uploadedCount} CVs exitosamente: ${successfulFiles.join(', ')}`;
      // Recargar la lista de CVs desde el vector store
      await loadCVsFromVectorStore();
    }
    if (duplicateCount > 0) {
      message += `\n❌ ${duplicateCount} CVs ya se encuentran en la BD: ${duplicateFiles.join(', ')}`;
    }
    if (failedCount > 0) {
      message += `\n❌ ${failedCount} archivos fallaron al subir.`;
    }
    if (uploadedCount === 0 && failedCount === 0 && duplicateCount === 0) {
      message = 'ℹ️ No se encontraron archivos PDF válidos.';
    }

    if (message) {
      setMessages([{
        id: Date.now().toString(),
        type: 'assistant',
        content: message
      }]);
    }

    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleMultipleFileUpload(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || files.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          // Sin pdfId específico - buscará en todos los CVs
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.answer
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `❌ Error: ${result.error}`
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '❌ Error al procesar la pregunta'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 max-w-6xl mx-auto p-6 w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            Sistema de Gestión de CVs
          </h1>
          <p className="text-black">
            Sube CVs y haz consultas inteligentes sobre los candidatos
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Subir CVs</h2>
          
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-gray-500">
              {isUploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2">Subiendo CV...</span>
                </div>
              ) : (
                <>
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-medium">Arrastra CVs aquí o haz clic para seleccionar</p>
                  <p className="text-sm text-gray-400 mt-2">Puedes seleccionar múltiples archivos PDF</p>
                </>
              )}
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => {
              const selectedFiles = e.target.files;
              if (selectedFiles && selectedFiles.length > 0) {
                handleMultipleFileUpload(selectedFiles);
              }
            }}
            className="hidden"
          />
        </div>

        {/* Lista de CVs */}
        {isLoadingCVs ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
              <span className="text-gray-600">Cargando CVs...</span>
            </div>
          </div>
        ) : files.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-black">
              CVs en la Base de Datos ({files.length})
            </h2>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-800 font-medium">
                    {typeof file.payload?.metadata?.fileName === 'string' 
                      ? file.payload.metadata.fileName.split('-').slice(1).join('-').replace('.pdf', '') // Remover timestamp y extensión
                      : 'Sin nombre'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6v-2H9v2zm0-4h6V6H9v2zm-2 4V6H5v6h2zm0 2v2h2v-2H7zm8 0v2h-2v-2h2z" />
              </svg>
              <h3 className="text-lg font-medium text-blue-800 mb-2">No hay CVs subidos</h3>
              <p className="text-blue-600">Sube algunos CVs para comenzar a hacer consultas sobre los candidatos.</p>
            </div>
          </div>
        )}

        {/* Chat Section */}
        {files.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Consulta sobre los candidatos</h2>
            
            {/* Messages */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">
                      {hasKwargs(message.content)
                        ? message.content.kwargs.content
                        : message.content}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      <span className="text-sm">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ej: ¿Quién es el mejor para un puesto de React? ¿Quién sabe Next.js?"
                className="flex-1 px-4 text-black py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!question.trim() || isLoading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer sm:w-auto w-full"
              >
                Enviar
              </button>
            </form>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="py-6 bg-gray-100 border-t">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-600 text-sm">
            Creado por Cristóbal Fuentealba
          </p>
        </div>
      </footer>
    </div>
  );
}
