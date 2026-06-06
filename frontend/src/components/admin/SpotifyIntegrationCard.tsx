import { useState, useEffect } from 'react';
import { showSuccess, showError, showWarning, showInfo } from '@/lib/notifications';
import { apiGet, apiPut, ApiException } from '../../lib/api';
import { getBackendUrl } from '../../lib/env';

export default function SpotifyIntegrationCard() {
  const [config, setConfig] = useState<any>(null);
  // Solo mostrar loading si estamos en el cliente
  // En el servidor, no mostrar skeleton para evitar que se "congele"
  const [loading, setLoading] = useState(typeof window !== 'undefined');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    redirectUri: typeof window !== 'undefined' 
      ? `${getBackendUrl().replace(/\/$/, '')}/api/spotify/callback`
      : '',
    enabled: true,
  });

  useEffect(() => {
    console.log('🎬 SpotifyIntegrationCard useEffect ejecutándose...');
    console.log('📍 Estamos en:', typeof window === 'undefined' ? 'SERVIDOR' : 'CLIENTE');
    console.log('📊 Estado loading:', loading);
    
    // Asegurarse de que estamos en el cliente
    if (typeof window === 'undefined') {
      console.warn('⚠️ SpotifyIntegrationCard: Running on server, skipping');
      return;
    }

    console.log('✅ SpotifyIntegrationCard: Running on client, iniciando carga...');
    
    let isMounted = true;
    let loadingFinished = false;

        // Timeout de seguridad para evitar que se quede cargando indefinidamente
        const timeoutId = setTimeout(() => {
          if (isMounted && !loadingFinished) {
            console.warn('⏱️ Timeout al cargar configuración de Spotify - forzando carga del formulario');
            loadingFinished = true;
            setLoading(false);
            setFormData({
              clientId: '',
              clientSecret: '',
              refreshToken: '',
              redirectUri: getDefaultRedirectUri(),
              enabled: true,
            });
            showError('⚠️ Tiempo de espera agotado. El formulario se muestra con valores por defecto.');
          }
        }, 5000); // 5 segundos

    const load = async () => {
      try {
        await loadConfig();
        loadingFinished = true;
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error en loadConfig desde useEffect:', error);
        loadingFinished = true;
        clearTimeout(timeoutId);
      }
    };

    load();
    
    // Escuchar mensajes del popup de autorización
    window.addEventListener('message', handleAuthMessage);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  const handleAuthMessage = async (event: MessageEvent) => {
    console.log('📨 Message received:', event.origin, event.data);
    
    // Validar origen del mensaje
    const apiUrl = getApiUrl().replace(/\/$/, '');
    if (!event.origin.includes('localhost') && !event.origin.includes('127.0.0.1') && event.origin !== apiUrl) {
      console.warn('⚠️ Message from unknown origin:', event.origin);
      return;
    }
    
    if (event.data.type === 'spotify-auth-success') {
      console.log('✅ Spotify auth success!', event.data);
      const refreshToken = event.data.refreshToken;
      
      if (!refreshToken) {
        console.error('❌ No refresh token in message!');
        showError('Error: No se recibió el refresh token');
        setAuthorizing(false);
        return;
      }
      
      console.log('💾 Saving refresh token...');
      
      // Actualizar formData con el refresh token
      setFormData(prev => ({
        ...prev,
        refreshToken: refreshToken,
      }));
      
      // Guardar automáticamente el refresh token en la BD
      try {
        await apiPut('settings/integrations/spotify', {
          refreshToken: refreshToken,
        });
        console.log('✅ Refresh token saved successfully');
        showSuccess('✅ Autorización exitosa! Refresh token guardado automáticamente.');
        await loadConfig(); // Recargar config
      } catch (error: any) {
        console.error('❌ Error guardando refresh token:', error);
        showWarning('⚠️ Autorización exitosa pero no se pudo guardar el refresh token. Guárdalo manualmente.');
      }
      
      setAuthorizing(false);
    } else if (event.data.type === 'spotify-auth-error') {
      console.error('❌ Spotify auth error:', event.data.error);
      showError(`Error en la autorización: ${event.data.error}`);
      setAuthorizing(false);
    } else {
      console.log('ℹ️ Unknown message type:', event.data.type);
    }
  };

  const getApiUrl = () => {
    return getBackendUrl();
  };

  const loadConfig = async () => {
    console.log('🔄 Loading Spotify config...');
    try {
      const data = await apiGet('settings/integrations/spotify');
      console.log('✅ Config loaded:', data);
      setConfig(data);
      setFormData({
        clientId: data.clientId || '',
        clientSecret: '',
        refreshToken: '', // No mostrar por seguridad, pero sabemos si existe
        redirectUri: data.redirectUri || getDefaultRedirectUri(),
        enabled: data.enabled !== undefined ? data.enabled : true,
      });
      
      // Guardar si tenemos refresh token en config (para mostrar el indicador)
      if (data.lastTokenRefresh) {
        console.log('✅ Refresh token exists in database');
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading config:', error);
      // Si no hay configuración guardada o hay error de autorización, usar valores por defecto
      if (error instanceof ApiException) {
        console.warn(`⚠️ API Error ${error.status}:`, error.message);
        if (error.status === 404) {
          console.log('ℹ️ No hay configuración guardada, usando valores por defecto');
        } else if (error.status === 401 || error.status === 403) {
          console.warn('⚠️ No autorizado. Verifica que tengas rol de admin y que tu token sea válido.');
          showError('⚠️ No tienes permisos. Por favor, cierra sesión y vuelve a iniciar sesión para obtener un token nuevo.');
        }
      } else {
        showError(`Error de conexión: ${error.message || 'No se pudo conectar con el servidor'}`);
      }
      
      // Siempre inicializar con valores por defecto para que el formulario se muestre
      setFormData({
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        redirectUri: getDefaultRedirectUri(),
        enabled: true,
      });
      setLoading(false);
    }
  };

  const getDefaultRedirectUri = () => {
    const apiUrl = getApiUrl();
    // Remover la barra final si existe
    const baseUrl = apiUrl.replace(/\/$/, '');
    return `${baseUrl}/api/spotify/callback`;
  };

  const handleAuthorize = () => {
    console.log('🚀 Starting Spotify authorization...');
    setAuthorizing(true);
    
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const apiUrl = getApiUrl();
    const authUrl = `${apiUrl}api/spotify/login`;
    console.log('🔗 Opening popup with URL:', authUrl);
    
    const popup = window.open(
      authUrl,
      'Spotify Authorization',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      console.error('❌ Failed to open popup - blocked by browser?');
      showError('No se pudo abrir el popup. Verifica que no esté bloqueado por el navegador.');
      setAuthorizing(false);
      return;
    }
    
    console.log('✅ Popup opened successfully');

    // Verificar si el popup se cerró sin completar
    const checkPopup = setInterval(() => {
      if (popup && popup.closed) {
        console.log('🔴 Popup closed');
        clearInterval(checkPopup);
        if (authorizing) {
          setAuthorizing(false);
          showWarning('Autorización cancelada');
        }
      }
    }, 1000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const data = await apiGet('spotify/me');
      setTestResult(data);
      showSuccess('✅ Conexión exitosa con Spotify!');
    } catch (error: any) {
      let errorMessage = 'No se pudo conectar con Spotify';
      if (error instanceof ApiException) {
        errorMessage = error.message || errorMessage;
        
        // Mensajes más amigables para errores comunes
        if (errorMessage.includes('refresh token')) {
          errorMessage = '⚠️ No hay refresh token configurado. Por favor autoriza Spotify primero usando el botón "Autorizar con Spotify" y luego guarda la configuración.';
        } else if (errorMessage.includes('not configured')) {
          errorMessage = '⚠️ Spotify no está configurado. Por favor completa la configuración básica (Client ID y Client Secret) y autoriza tu cuenta.';
        } else if (error.status === 401 || error.status === 403) {
          errorMessage = '⚠️ No autorizado. Asegúrate de haber autorizado Spotify y de que tu sesión de admin sea válida.';
        }
      } else {
        errorMessage = error.message || 'Error de conexión con el servidor';
      }
      showError(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Solo enviar clientSecret y refreshToken si no están vacíos
      const dataToSend: any = {
        clientId: formData.clientId,
        redirectUri: formData.redirectUri,
        enabled: formData.enabled,
      };
      
      if (formData.clientSecret && formData.clientSecret.trim() !== '') {
        dataToSend.clientSecret = formData.clientSecret;
      }
      
      if (formData.refreshToken && formData.refreshToken.trim() !== '') {
        dataToSend.refreshToken = formData.refreshToken;
      }
      
      await apiPut('settings/integrations/spotify', dataToSend);
      showSuccess('✅ Configuración de Spotify guardada exitosamente');
      await loadConfig();
    } catch (error: any) {
      let errorMessage = 'Error al guardar configuración';
      
      if (error instanceof ApiException) {
        if (error.status === 401 || error.status === 403) {
          errorMessage = '⚠️ No tienes permisos de administrador o tu sesión expiró. Por favor, inicia sesión nuevamente.';
        } else {
          errorMessage = error.message || errorMessage;
        }
      } else {
        errorMessage = error.message || 'No se pudo conectar con el servidor';
      }
      
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
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
    <div id="spotify" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start mb-6">
        <div className="text-4xl mr-4">🎵</div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Spotify Integration
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Muestra tus estadísticas personales de Spotify (top tracks, artists, recently played)
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
            Completa estos campos con las credenciales de tu app de Spotify
          </p>
          
          {/* Enabled Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="spotify-enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="spotify-enabled" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Habilitado
            </label>
          </div>

          {/* Client ID */}
          <div>
            <label htmlFor="spotify-clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client ID
            </label>
            <input
              type="text"
              id="spotify-clientId"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Tu Spotify Client ID"
            />
          </div>

          {/* Client Secret */}
          <div>
            <label htmlFor="spotify-clientSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Secret
              {config?.source === 'database' && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  ✓ Guardado
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showSecrets ? 'text' : 'password'}
                id="spotify-clientSecret"
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={config?.source === 'database' ? 'Deja vacío para mantener el actual' : 'Tu Spotify Client Secret'}
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showSecrets ? '🙈' : '👁️'}
              </button>
            </div>
            {config?.source === 'database' && formData.clientSecret === '' && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                El Client Secret está guardado en la base de datos (encriptado). Solo escribe aquí si quieres cambiarlo.
              </p>
            )}
          </div>

          {/* Redirect URI */}
          <div>
            <label htmlFor="spotify-redirectUri" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Redirect URI
            </label>
            <input
              type="text"
              id="spotify-redirectUri"
              value={formData.redirectUri}
              onChange={(e) => setFormData({ ...formData, redirectUri: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Usa esta URL en tu Spotify App Dashboard
            </p>
          </div>
        </div>

        {/* Section 2: Save Configuration */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">Paso 2: Guardar Configuración</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Guarda las credenciales antes de autorizar. El backend necesita conocerlas para generar la URL de autorización.
          </p>
          
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>

        {/* Section 3: Authorization */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">Paso 3: Autorizar con Spotify</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Después de guardar, autoriza tu cuenta de Spotify para obtener el refresh token
          </p>
          
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={authorizing || !config}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {authorizing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Esperando autorización...
              </>
            ) : (
              <>
                🎵 Autorizar con Spotify
              </>
            )}
          </button>
          
          {!config && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ Primero debes guardar la configuración (Paso 2)
            </p>
          )}

          {/* Refresh Token */}
          <div>
            <label htmlFor="spotify-refreshToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refresh Token
              {config?.source === 'database' && config?.lastTokenRefresh && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  ✓ Guardado {config.tokenStatus === 'valid' && '(Válido)'}
                  {config.tokenStatus === 'expired' && '(Expirado)'}
                  {config.tokenStatus === 'invalid' && '(Inválido)'}
                </span>
              )}
              {!config?.lastTokenRefresh && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  (No configurado)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showSecrets ? 'text' : 'password'}
                id="spotify-refreshToken"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={config?.lastTokenRefresh 
                  ? "Deja vacío para mantener el actual o pega uno nuevo" 
                  : "Se completará automáticamente al autorizar"
                }
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showSecrets ? '🙈' : '👁️'}
              </button>
            </div>
            
            {/* Mensaje informativo según el estado */}
            {config?.source === 'database' && config?.lastTokenRefresh ? (
              <div className="mt-1 text-xs">
                {config.tokenStatus === 'valid' && (
                  <p className="text-green-600 dark:text-green-400">
                    ✅ Token válido. Última actualización: {new Date(config.lastTokenRefresh).toLocaleString('es-ES')}
                  </p>
                )}
                {config.tokenStatus === 'expired' && (
                  <p className="text-orange-600 dark:text-orange-400">
                    ⚠️ Token expirado. Autoriza de nuevo para renovarlo.
                  </p>
                )}
                {config.tokenStatus === 'invalid' && (
                  <p className="text-red-600 dark:text-red-400">
                    ❌ Token inválido. Necesitas autorizar de nuevo.
                  </p>
                )}
                {!config.tokenStatus && (
                  <p className="text-gray-500 dark:text-gray-400">
                    ✓ Token guardado. Se actualizará automáticamente al autorizar de nuevo o puedes pegarlo manualmente.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                💡 Autoriza con Spotify para obtener el refresh token automáticamente, o pégalo manualmente si ya lo tienes.
              </p>
            )}
            
            {config?.source === 'database' && formData.refreshToken === '' && config?.lastTokenRefresh && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                📝 El refresh token está guardado en la base de datos (encriptado). Solo escribe aquí si quieres cambiarlo manualmente.
              </p>
            )}
          </div>
          
        </div>

        {/* Section 4: Test */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">Paso 4: Probar Conexión</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verifica que todo funciona correctamente
          </p>
          
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Probando...' : '🧪 Probar Conexión'}
          </button>

          {testResult && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                {testResult.images?.[0]?.url && (
                  <img 
                    src={testResult.images[0].url} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full mr-3"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {testResult.display_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testResult.email}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Seguidores: {testResult.followers?.total || 0} | Producto: {testResult.product || 'free'}
              </p>
            </div>
          )}
        </div>
      </form>

      {/* Help Link */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <a
          href="/docs/spotify-integration"
          target="_blank"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          📖 Cómo obtener credenciales de Spotify
        </a>
      </div>
    </div>
  );
}
