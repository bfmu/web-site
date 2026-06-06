import { useState, useRef, type ReactElement } from 'react';
import { showError, showWarning } from '@/lib/notifications';
import { uploadImage } from '../../lib/admin-api';
import { ImageLibraryModal } from './ImageLibraryModal';

interface ImageUploadProps {
  currentImage?: string;
  onUploadComplete: (url: string) => void;
  label?: string;
}

export function ImageUpload({ currentImage, onUploadComplete, label = 'Imagen de portada' }: ImageUploadProps): ReactElement {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [dragActive, setDragActive] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showWarning('Por favor selecciona un archivo de imagen');
      return;
    }

    // Mostrar preview inmediatamente
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    setUploading(true);
    try {
      const result = await uploadImage(file);
      onUploadComplete(result.url);
    } catch (error: any) {
      showError(`Error al subir imagen: ${error.message}`);
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
        } ${uploading ? 'opacity-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {preview ? (
          <div className="relative w-full">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 w-full rounded-lg object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                <div className="text-white">Subiendo...</div>
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowLibraryModal(true)}
                disabled={uploading}
                className="flex-1 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
              >
                Seleccionar de librería
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                Cambiar imagen
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                onUploadComplete('');
              }}
              disabled={uploading}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Eliminar imagen
            </button>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
              <button
                type="button"
                onClick={() => setShowLibraryModal(true)}
                className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                Seleccionar de librería
              </button>
              <span className="mx-2 text-gray-400">o</span>
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500 dark:text-indigo-400"
              >
                <span>Sube un archivo</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleChange}
                  disabled={uploading}
                />
              </label>
              <p className="pl-1">o arrastra y suelta</p>
            </div>
            <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">
              PNG, JPG, GIF hasta 10MB
            </p>
          </div>
        )}
      </div>

      {/* Image Library Modal */}
      <ImageLibraryModal
        isOpen={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onSelect={(url) => {
          setPreview(url);
          onUploadComplete(url);
          setShowLibraryModal(false);
        }}
        allowUpload={true}
      />
    </div>
  );
}

