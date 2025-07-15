'use client';

import { useState, useRef } from 'react';

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

function hasKwargs(content: string | MessageContentKwargs): content is MessageContentKwargs {
  return typeof content === 'object' && content !== null && 'kwargs' in content;
}

export default function Home() {
  const [files, setFiles] = useState<Array<{name: string, pdfId: string}>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const handleMultipleFileUpload = async (uploadedFiles: FileList) => {
    const pdfFiles = Array.from(uploadedFiles).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      alert('No se encontraron archivos PDF válidos');
      return;
    }

    setIsUploading(true);
    let uploadedCount = 0;

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
          setFiles(prev => [...prev, {
            name: file.name,
            pdfId: result.pdfId
          }]);
          uploadedCount++;
        } else {
          console.error(`Error subiendo ${file.name}: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error subiendo ${file.name}:`, error);
      }
    }

    if (uploadedCount > 0) {
      setMessages([{
        id: Date.now().toString(),
        type: 'assistant',
        content: `✅ Se subieron ${uploadedCount} CVs exitosamente. Ahora puedes hacer consultas sobre los candidatos.`
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Sistema de Gestión de CVs
          </h1>
          <p className="text-gray-600">
            Sube CVs y haz consultas inteligentes sobre los candidatos
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Subir CVs</h2>
          
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
        {files.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              CVs Subidos ({files.length})
            </h2>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 12h6v-2H9v2zm0-4h6V6H9v2zm-2 4V6H5v6h2zm0 2v2h2v-2H7zm8 0v2h-2v-2h2z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-800 font-medium">{file.name}</span>
                  </div>
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
            <h2 className="text-xl font-semibold mb-4">Consulta sobre los candidatos</h2>
            
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
            <form onSubmit={handleSubmit} className="flex gap-2">
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
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
