import { useState, useEffect, type ReactElement } from 'react';
import { showSuccess, showError, showWarning } from '@/lib/notifications';
import { getBackendUrl } from '../../lib/env';

interface OAuthProviderCardProps {
  provider: 'google' | 'github';
  title: string;
  description: string;
  icon: string;
}

export default function OAuthProviderCard({ provider, title, description, icon }: OAuthProviderCardProps): ReactElement {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    callbackUrl: '',
    enabled: true,
  });

  const getApiUrl = () => getBackendUrl();

  useEffect(() => {
    loadConfig();

    // Agregar listener para mensajes del popup de test
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'oauth-test-success' && event.data.provider === provider) {
        showSuccess(`✅ ${event.data.message}`);
        setTesting(false);
      } else if (event.data.type === 'oauth-test-error' && event.data.provider === provider) {
        showError(`❌ Error en el test: ${event.data.error}`);
        setTesting(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [provider]);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}api/settings/oauth/${provider}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setFormData({
          clientId: data.clientId || '',
          clientSecret: '', // No mostramos el secret por seguridad
          callbackUrl: data.callbackUrl || getDefaultCallbackUrl(),
          enabled: data.enabled !== undefined ? data.enabled : true,
        });
      } else if (response.status === 404) {
        // No configurado aún, usar defaults
        setFormData({
          ...formData,
          callbackUrl: getDefaultCallbackUrl(),
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      showError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCallbackUrl = () => {
    const apiUrl = getApiUrl().replace(/\/$/, '');
    return `${apiUrl}/api/auth/${provider}/callback`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = getApiUrl();
      
      // Solo enviar clientSecret si no está vacío
      const dataToSend: any = {
        clientId: formData.clientId,
        callbackUrl: formData.callbackUrl,
        enabled: formData.enabled,
      };
      
      if (formData.clientSecret && formData.clientSecret.trim() !== '') {
        dataToSend.clientSecret = formData.clientSecret;
      }
      
      const response = await fetch(`${apiUrl}api/settings/oauth/${provider}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        showSuccess(`✅ Configuración de ${title} guardada exitosamente`);
        await loadConfig();
      } else {
        const error = await response.json();
        showError(error.message || 'Error al guardar configuración');
      }
    } catch (error) {
      showError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    setTesting(true);
    
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const apiUrl = getApiUrl();
    const testUrl = `${apiUrl}api/settings/oauth/${provider}/test`;
    
    const popup = window.open(
      testUrl,
      'OAuth Test',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      showError('No se pudo abrir el popup. Verifica que no esté bloqueado por el navegador.');
      setTesting(false);
      return;
    }
    
    // Verificar cierre del popup
    const checkPopup = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkPopup);
        if (testing) {
          setTesting(false);
          showWarning('Test cancelado');
        }
      }
    }, 1000);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div id={provider} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start mb-6">
        <div className="text-4xl mr-4">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
          {config?.source && (
            <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {config.source === 'database' ? '📊 Base de datos' : '⚙️ Variables de entorno'}
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Paso 1: Configuración Básica</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Completa estos campos con las credenciales de tu app de {title}
          </p>
          
          {/* Enabled Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`${provider}-enabled`}
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`${provider}-enabled`} className="ml-2 block text-sm text-gray-900 dark:text-white">
              Habilitado
            </label>
          </div>

          {/* Client ID */}
          <div>
            <label htmlFor={`${provider}-clientId`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client ID
            </label>
            <input
              type="text"
              id={`${provider}-clientId`}
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={`Tu ${title} Client ID`}
            />
          </div>

          {/* Client Secret */}
          <div>
            <label htmlFor={`${provider}-clientSecret`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Secret
              {config?.hasClientSecret && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  ✓ Guardado
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                id={`${provider}-clientSecret`}
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={config?.hasClientSecret ? 'Deja vacío para mantener el actual' : `Tu ${title} Client Secret`}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showSecret ? '🙈' : '👁️'}
              </button>
            </div>
            {config?.hasClientSecret && formData.clientSecret === '' && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                El Client Secret está guardado en la base de datos (encriptado). Solo escribe aquí si quieres cambiarlo.
              </p>
            )}
          </div>

          {/* Callback URL */}
          <div>
            <label htmlFor={`${provider}-callbackUrl`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Callback URL
            </label>
            <input
              type="text"
              id={`${provider}-callbackUrl`}
              value={formData.callbackUrl}
              onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Usa esta URL en la configuración de tu app {provider === 'google' ? 'en Google Cloud Console' : 'en GitHub'}
            </p>
          </div>
        </div>

        {/* Section 2: Save Configuration */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">Paso 2: Guardar Configuración</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Guarda las credenciales para poder probar la conexión
          </p>
          
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>

        {/* Section 3: Test Connection */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">Paso 3: Probar Conexión</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verifica que las credenciales funcionen correctamente
          </p>
          
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !config}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Probando...' : '🧪 Probar Conexión OAuth'}
          </button>
          
          {!config && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ Primero debes guardar la configuración (Paso 2)
            </p>
          )}
        </div>
      </form>

      {/* Help Link */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <a
          href={`/docs/oauth-setup#${provider}`}
          target="_blank"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          📖 Cómo obtener credenciales de {title}
        </a>
      </div>
    </div>
  );
}
