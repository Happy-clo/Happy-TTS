import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence, useReducedMotion } from 'framer-motion';
import getApiBaseUrl from '../api';
import { useNotification } from './Notification';
import { useAuth } from '../hooks/useAuth';
import CryptoJS from 'crypto-js';
import { 
  FaCog, 
  FaLock, 
  FaList, 
  FaSync, 
  FaInfoCircle,
  FaTimes
} from 'react-icons/fa';

const API_URL = getApiBaseUrl() + '/api/admin/envs';
const OUTEMAIL_API = getApiBaseUrl() + '/api/admin/outemail/settings';
const MODLIST_API = getApiBaseUrl() + '/api/admin/modlist/setting';
const TTS_API = getApiBaseUrl() + '/api/admin/tts/setting';
const LIBRECHAT_PROVIDERS_API = getApiBaseUrl() + '/api/librechat/admin/providers';
const SHORTURL_AES_API = getApiBaseUrl() + '/api/shorturl/admin/aes-key';

// 统一的进入动画与过渡配置，结合 useReducedMotion 可降级
const ENTER_INITIAL = { opacity: 0, y: 20 } as const;
const ENTER_ANIMATE = { opacity: 1, y: 0 } as const;
const DURATION_06 = { duration: 0.6 } as const;
const DURATION_03 = { duration: 0.3 } as const;
const NO_DURATION = { duration: 0 } as const;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

interface EnvItem {
  key: string;
  value: string;
  desc?: string;
  updatedAt?: string;
  source?: string; // 数据来源
}

interface OutemailSettingItem {
  domain: string;
  code: string; // 已脱敏显示
  updatedAt?: string;
}

interface ModlistSettingItem {
  code: string; // 已脱敏显示
  updatedAt?: string;
}
interface TtsSettingItem {
  code: string; // 已脱敏显示
  updatedAt?: string;
}
interface ChatProviderItem {
  id: string;
  baseUrl: string;
  apiKey: string; // 已脱敏显示
  model: string;
  group: string;
  enabled: boolean;
  weight: number;
  updatedAt?: string;
}
interface ShortAesSetting {
  aesKey: string | null;
  updatedAt?: string;
}

// AES-256解密函数
function decryptAES256(encryptedData: string, iv: string, key: string): string {
  try {
    console.log('   开始AES-256解密...');
    console.log('   密钥长度:', key.length);
    console.log('   加密数据长度:', encryptedData.length);
    console.log('   IV长度:', iv.length);
    
    const keyBytes = CryptoJS.SHA256(key);
    const ivBytes = CryptoJS.enc.Hex.parse(iv);
    const encryptedBytes = CryptoJS.enc.Hex.parse(encryptedData);
    
    console.log('   密钥哈希完成，开始解密...');
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedBytes },
      keyBytes,
      {
        iv: ivBytes,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    console.log('   解密完成，结果长度:', result.length);
    
    return result;
  } catch (error) {
    console.error('❌ AES-256解密失败:', error);
    throw new Error('解密失败');
  }
}

// 根据环境变量名判断数据来源
function getEnvSource(key: string): string | undefined {
  const keyLower = key.toLowerCase();
  
  // 数据库相关
  if (keyLower.includes('db_') || keyLower.includes('database_') || keyLower.includes('mongo')) {
    return '数据库配置';
  }
  
  // 邮件相关
  if (keyLower.includes('email_') || keyLower.includes('mail_') || keyLower.includes('smtp')) {
    return '邮件服务配置';
  }
  
  // API相关
  if (keyLower.includes('api_') || keyLower.includes('openai') || keyLower.includes('token')) {
    return 'API配置';
  }
  
  // 安全相关
  if (keyLower.includes('secret_') || keyLower.includes('key_') || keyLower.includes('password')) {
    return '安全配置';
  }
  
  // 服务器相关
  if (keyLower.includes('port') || keyLower.includes('host') || keyLower.includes('url')) {
    return '服务器配置';
  }
  
  // 管理员相关
  if (keyLower.includes('admin_')) {
    return '管理员配置';
  }
  
  // 环境相关
  if (keyLower.includes('env') || keyLower.includes('node_env')) {
    return '环境配置';
  }
  
  return undefined; // 没有明确来源
}

// 抽取表格行，memo 化以减少不必要渲染
interface EnvRowProps {
  item: EnvItem;
  idx: number;
  prefersReducedMotion: boolean;
  onSourceClick: (source: string) => void;
}
const EnvRow = React.memo(function EnvRow({ item, idx, prefersReducedMotion, onSourceClick }: EnvRowProps) {
  const rowTransition = useMemo(() => (
    prefersReducedMotion ? NO_DURATION : { duration: 0.3, delay: idx * 0.05 }
  ), [prefersReducedMotion, idx]);

  return (
    <m.tr 
      className={`border-b border-gray-100 last:border-b-0 ${
        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={rowTransition}
      whileHover={{ backgroundColor: '#f8fafc' }}
    >
      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 align-top">
        <div className="break-words whitespace-normal leading-relaxed flex items-start gap-1">
          {item.source && (
            <button
              onClick={() => onSourceClick(item.source!)}
              className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 mt-0.5 flex-shrink-0 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <FaInfoCircle />
            </button>
          )}
          <span>{item.key.split(':').pop() || item.key}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-gray-700 align-top">
        <div className="break-words whitespace-pre-wrap leading-relaxed">
          {item.value}
        </div>
      </td>
    </m.tr>
  );
});

const EnvManager: React.FC = () => {
  const { user } = useAuth();
  const [envs, setEnvs] = useState<EnvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<EnvItem>>({});
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const { setNotification } = useNotification();
  const prefersReducedMotion = useReducedMotion();

  // OutEmail Settings
  const [outemailSettings, setOutemailSettings] = useState<OutemailSettingItem[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingDomain, setSettingDomain] = useState('');
  const [settingCode, setSettingCode] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsDeletingDomain, setSettingsDeletingDomain] = useState<string | null>(null);

  // Modlist MODIFY_CODE Setting
  const [modSetting, setModSetting] = useState<ModlistSettingItem | null>(null);
  const [modLoading, setModLoading] = useState(false);
  const [modCodeInput, setModCodeInput] = useState('');
  const [modSaving, setModSaving] = useState(false);
  const [modDeleting, setModDeleting] = useState(false);

  // TTS GENERATION_CODE Setting
  const [ttsSetting, setTtsSetting] = useState<TtsSettingItem | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsCodeInput, setTtsCodeInput] = useState('');
  const [ttsSaving, setTtsSaving] = useState(false);
  const [ttsDeleting, setTtsDeleting] = useState(false);

  // ShortURL AES_KEY Setting
  const [shortAesSetting, setShortAesSetting] = useState<ShortAesSetting | null>(null);
  const [shortAesLoading, setShortAesLoading] = useState(false);
  const [shortAesInput, setShortAesInput] = useState('');
  const [shortAesSaving, setShortAesSaving] = useState(false);
  const [shortAesDeleting, setShortAesDeleting] = useState(false);

  // LibreChat Providers
  const [providers, setProviders] = useState<ChatProviderItem[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerDeletingId, setProviderDeletingId] = useState<string | null>(null);
  const [providerFilterGroup, setProviderFilterGroup] = useState('');
  // 表单
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerBaseUrl, setProviderBaseUrl] = useState('');
  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerModel, setProviderModel] = useState('');
  const [providerGroup, setProviderGroup] = useState('');
  const [providerEnabled, setProviderEnabled] = useState(true);
  const [providerWeight, setProviderWeight] = useState<number>(1);

  const trans06 = useMemo(() => (prefersReducedMotion ? NO_DURATION : DURATION_06), [prefersReducedMotion]);
  const trans03 = useMemo(() => (prefersReducedMotion ? NO_DURATION : DURATION_03), [prefersReducedMotion]);
  const modalTrans = useMemo(() => (prefersReducedMotion ? NO_DURATION : { duration: 0.1 }), [prefersReducedMotion]);

  const fetchEnvs = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) {
        switch (data.error) {
          case '未携带Token，请先登录':
            setNotification({ message: '请先登录后再操作', type: 'error' });
            break;
          case 'Token格式错误，需以Bearer开头':
          case 'Token为空':
          case '无效的认证令牌':
          case '认证令牌已过期':
            setNotification({ message: '登录状态已失效，请重新登录', type: 'error' });
            break;
          case '用户不存在':
            setNotification({ message: '用户不存在，请重新登录', type: 'error' });
            break;
          case '需要管理员权限':
          case '无权限':
            setNotification({ message: '需要管理员权限', type: 'error' });
            break;
          default:
            setNotification({ message: data.error || '获取失败', type: 'error' });
        }
        setLoading(false);
        return;
      }
      
      if (data.success) {
        let envArr: EnvItem[] = [];
        
        // 检查是否为加密数据（通过检测data和iv字段来判断）
        if (data.data && data.iv && typeof data.data === 'string' && typeof data.iv === 'string') {
          try {
            console.log('🔐 开始解密环境变量数据...');
            console.log('   加密数据长度:', data.data.length);
            console.log('   IV:', data.iv);
            
            const token = localStorage.getItem('token');
            if (!token) {
              console.error('❌ Token不存在，无法解密数据');
              setNotification({ message: 'Token不存在，无法解密数据', type: 'error' });
              setLoading(false);
              return;
            }
            
            console.log('   使用Token进行解密，Token长度:', token.length);
            
            // 解密数据
            const decryptedJson = decryptAES256(data.data, data.iv, token);
            const decryptedData = JSON.parse(decryptedJson);
            
            if (Array.isArray(decryptedData)) {
              console.log('✅ 解密成功，获取到', decryptedData.length, '个环境变量');
              envArr = decryptedData;
            } else {
              console.error('❌ 解密数据格式错误，期望数组格式');
              setNotification({ message: '解密数据格式错误', type: 'error' });
              setLoading(false);
              return;
            }
            
            // 为环境变量添加数据来源信息
            envArr = envArr.map(item => {
              const source = getEnvSource(item.key);
              return { ...item, source };
            });
          } catch (decryptError) {
            console.error('❌ 解密失败:', decryptError);
            setNotification({ message: '数据解密失败，请检查登录状态', type: 'error' });
            setLoading(false);
            return;
          }
        } else {
          // 兼容旧的未加密格式
        if (Array.isArray(data.envs)) {
          envArr = data.envs;
        } else if (data.envs && typeof data.envs === 'object') {
          envArr = Object.entries(data.envs).map(([key, value]) => ({ key, value: String(value) }));
        }
        }
        
        setEnvs(envArr);
      } else {
        setNotification({ message: data.error || '获取失败', type: 'error' });
      }
    } catch (e) {
      setNotification({ message: '获取失败：' + (e instanceof Error ? e.message : (e && e.toString ? e.toString() : '未知错误')), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOutemailSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(OUTEMAIL_API, { headers: { ...getAuthHeaders() } });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ message: data.error || '获取对外邮件设置失败', type: 'error' });
        setSettingsLoading(false);
        return;
      }
      if (data && data.success && Array.isArray(data.settings)) {
        setOutemailSettings(data.settings as OutemailSettingItem[]);
      } else {
        setOutemailSettings([]);
      }
    } catch (e) {
      setNotification({ message: '获取对外邮件设置失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setSettingsLoading(false);
    }
  }, [setNotification]);

  const handleSaveSetting = useCallback(async () => {
    if (settingsSaving) return;
    const domain = settingDomain.trim();
    const code = settingCode.trim();
    if (!code) {
      setNotification({ message: '请填写校验码', type: 'error' });
      return;
    }
    setSettingsSaving(true);
    try {
      const res = await fetch(OUTEMAIL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ domain, code })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '保存失败', type: 'error' });
        return;
      }
      setNotification({ message: '保存成功', type: 'success' });
      setSettingCode('');
      await fetchOutemailSettings();
    } catch (e) {
      setNotification({ message: '保存失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setSettingsSaving(false);
    }
  }, [settingsSaving, settingDomain, settingCode, fetchOutemailSettings, setNotification]);

  const handleDeleteSetting = useCallback(async (domain: string) => {
    if (settingsDeletingDomain) return;
    setSettingsDeletingDomain(domain);
    try {
      const res = await fetch(OUTEMAIL_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ domain })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '删除失败', type: 'error' });
        return;
      }
      setNotification({ message: '删除成功', type: 'success' });
      await fetchOutemailSettings();
    } catch (e) {
      setNotification({ message: '删除失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setSettingsDeletingDomain(null);
    }
  }, [settingsDeletingDomain, setNotification, fetchOutemailSettings]);

  const fetchModlistSetting = useCallback(async () => {
    setModLoading(true);
    try {
      const res = await fetch(MODLIST_API, { headers: { ...getAuthHeaders() } });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ message: data.error || '获取修改码失败', type: 'error' });
        setModLoading(false);
        return;
      }
      if (data && data.success) {
        setModSetting(data.setting || null);
      } else {
        setModSetting(null);
      }
    } catch (e) {
      setNotification({ message: '获取修改码失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setModLoading(false);
    }
  }, [setNotification]);

  const handleSaveModCode = useCallback(async () => {
    if (modSaving) return;
    const code = modCodeInput.trim();
    if (!code) {
      setNotification({ message: '请填写修改码', type: 'error' });
      return;
    }
    setModSaving(true);
    try {
      const res = await fetch(MODLIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '保存失败', type: 'error' });
        return;
      }
      setNotification({ message: '保存成功', type: 'success' });
      setModCodeInput('');
      await fetchModlistSetting();
    } catch (e) {
      setNotification({ message: '保存失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setModSaving(false);
    }
  }, [modSaving, modCodeInput, fetchModlistSetting, setNotification]);

  const handleDeleteModCode = useCallback(async () => {
    if (modDeleting) return;
    setModDeleting(true);
    try {
      const res = await fetch(MODLIST_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '删除失败', type: 'error' });
        return;
      }
      setNotification({ message: '删除成功', type: 'success' });
      await fetchModlistSetting();
    } catch (e) {
      setNotification({ message: '删除失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setModDeleting(false);
    }
  }, [modDeleting, fetchModlistSetting, setNotification]);

  const fetchTtsSetting = useCallback(async () => {
    setTtsLoading(true);
    try {
      const res = await fetch(TTS_API, { headers: { ...getAuthHeaders() } });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ message: data.error || '获取生成码失败', type: 'error' });
        setTtsLoading(false);
        return;
      }
      if (data && data.success) {
        setTtsSetting(data.setting || null);
      } else {
        setTtsSetting(null);
      }
    } catch (e) {
      setNotification({ message: '获取生成码失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setTtsLoading(false);
    }
  }, [setNotification]);

  const handleSaveTtsCode = useCallback(async () => {
    if (ttsSaving) return;
    const code = ttsCodeInput.trim();
    if (!code) {
      setNotification({ message: '请填写生成码', type: 'error' });
      return;
    }
    setTtsSaving(true);
    try {
      const res = await fetch(TTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '保存失败', type: 'error' });
        return;
      }
      setNotification({ message: '保存成功', type: 'success' });
      setTtsCodeInput('');
      await fetchTtsSetting();
    } catch (e) {
      setNotification({ message: '保存失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setTtsSaving(false);
    }
  }, [ttsSaving, ttsCodeInput, fetchTtsSetting, setNotification]);

  const handleDeleteTtsCode = useCallback(async () => {
    if (ttsDeleting) return;
    setTtsDeleting(true);
    try {
      const res = await fetch(TTS_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '删除失败', type: 'error' });
        return;
      }
      setNotification({ message: '删除成功', type: 'success' });
      await fetchTtsSetting();
    } catch (e) {
      setNotification({ message: '删除失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setTtsDeleting(false);
    }
  }, [ttsDeleting, fetchTtsSetting, setNotification]);

  // ShortURL AES_KEY handlers
  const fetchShortAes = useCallback(async () => {
    setShortAesLoading(true);
    try {
      const res = await fetch(SHORTURL_AES_API, { headers: { ...getAuthHeaders() } });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '获取 AES_KEY 失败', type: 'error' });
        setShortAesLoading(false);
        return;
      }
      setShortAesSetting({ aesKey: data.aesKey ?? null, updatedAt: data.updatedAt });
    } catch (e) {
      setNotification({ message: '获取 AES_KEY 失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setShortAesLoading(false);
    }
  }, [setNotification]);

  const handleSaveShortAes = useCallback(async () => {
    if (shortAesSaving) return;
    const value = shortAesInput.trim();
    if (!value) {
      setNotification({ message: '请填写 AES_KEY', type: 'error' });
      return;
    }
    setShortAesSaving(true);
    try {
      const res = await fetch(SHORTURL_AES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ value })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '保存失败', type: 'error' });
        return;
      }
      setNotification({ message: '保存成功', type: 'success' });
      setShortAesInput('');
      await fetchShortAes();
    } catch (e) {
      setNotification({ message: '保存失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setShortAesSaving(false);
    }
  }, [shortAesSaving, shortAesInput, fetchShortAes, setNotification]);

  const handleDeleteShortAes = useCallback(async () => {
    if (shortAesDeleting) return;
    setShortAesDeleting(true);
    try {
      const res = await fetch(SHORTURL_AES_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '删除失败', type: 'error' });
        return;
      }
      setNotification({ message: '删除成功', type: 'success' });
      await fetchShortAes();
    } catch (e) {
      setNotification({ message: '删除失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setShortAesDeleting(false);
    }
  }, [shortAesDeleting, fetchShortAes, setNotification]);

  // Providers handlers
  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const url = providerFilterGroup ? `${LIBRECHAT_PROVIDERS_API}?group=${encodeURIComponent(providerFilterGroup)}` : LIBRECHAT_PROVIDERS_API;
      const res = await fetch(url, { headers: { ...getAuthHeaders() } });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '获取提供者失败', type: 'error' });
        setProvidersLoading(false);
        return;
      }
      setProviders(Array.isArray(data.providers) ? data.providers : []);
    } catch (e) {
      setNotification({ message: '获取提供者失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setProvidersLoading(false);
    }
  }, [providerFilterGroup, setNotification]);

  const resetProviderForm = useCallback(() => {
    setProviderId(null);
    setProviderBaseUrl('');
    setProviderApiKey('');
    setProviderModel('');
    setProviderGroup('');
    setProviderEnabled(true);
    setProviderWeight(1);
  }, []);

  const handleSaveProvider = useCallback(() => {
    if (providerSaving) return;
    const baseUrl = providerBaseUrl.trim();
    const apiKey = providerApiKey.trim();
    const model = providerModel.trim();
    const group = providerGroup.trim();
    const enabled = !!providerEnabled;
    const weight = Math.max(1, Math.min(10, Number(providerWeight || 1)));
    if (!baseUrl || !apiKey || !model) {
      setNotification({ message: '请填写 baseUrl / apiKey / model', type: 'error' });
      return;
    }
    setProviderSaving(true);
    (async () => {
      try {
        const body: any = { baseUrl, apiKey, model, group, enabled, weight };
        if (providerId) body.id = providerId;
        const res = await fetch(LIBRECHAT_PROVIDERS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setNotification({ message: data.error || '保存失败', type: 'error' });
          return;
        }
        setNotification({ message: '保存成功', type: 'success' });
        resetProviderForm();
        await fetchProviders();
      } catch (e) {
        setNotification({ message: '保存失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
      } finally {
        setProviderSaving(false);
      }
    })();
  }, [providerSaving, providerId, providerBaseUrl, providerApiKey, providerModel, providerGroup, providerEnabled, providerWeight, fetchProviders, resetProviderForm, setNotification]);

  const handleDeleteProvider = useCallback(async (id: string) => {
    if (providerDeletingId) return;
    setProviderDeletingId(id);
    try {
      const res = await fetch(`${LIBRECHAT_PROVIDERS_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ message: data.error || '删除失败', type: 'error' });
        return;
      }
      setNotification({ message: '删除成功', type: 'success' });
      await fetchProviders();
    } catch (e) {
      setNotification({ message: '删除失败：' + (e instanceof Error ? e.message : '未知错误'), type: 'error' });
    } finally {
      setProviderDeletingId(null);
    }
  }, [providerDeletingId, fetchProviders, setNotification]);

  const handleEditProvider = useCallback((p: ChatProviderItem) => {
    setProviderId(p.id);
    setProviderBaseUrl(p.baseUrl);
    setProviderApiKey(''); // 不回显明文
    setProviderModel(p.model);
    setProviderGroup(p.group || '');
    setProviderEnabled(!!p.enabled);
    setProviderWeight(Number(p.weight || 1));
  }, []);

  useEffect(() => { fetchEnvs(); }, []);
  useEffect(() => { fetchOutemailSettings(); }, [fetchOutemailSettings]);
  useEffect(() => { fetchModlistSetting(); }, [fetchModlistSetting]);
  useEffect(() => { fetchTtsSetting(); }, [fetchTtsSetting]);
  useEffect(() => { fetchShortAes(); }, [fetchShortAes]);
  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleSourceClick = useCallback((source: string) => {
    setSelectedSource(source);
    setShowSourceModal(true);
  }, []);

  // 管理员校验
  if (!user || user.role !== 'admin') {
    return (
      <LazyMotion features={domAnimation}>
        <m.div 
        className="space-y-6"
          initial={ENTER_INITIAL}
          animate={ENTER_ANIMATE}
          transition={trans06}
        >
          <m.div 
          className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-100"
            initial={ENTER_INITIAL}
            animate={ENTER_ANIMATE}
            transition={trans06}
        >
          <h2 className="text-2xl font-bold text-red-700 mb-3 flex items-center gap-2">
            <FaLock className="text-2xl text-red-600" />
            访问被拒绝
          </h2>
          <div className="text-gray-600 space-y-2">
            <p>你不是管理员，禁止访问！请用管理员账号登录后再来。</p>
            <div className="text-sm text-red-500 italic">
              环境变量管理仅限管理员使用
            </div>
          </div>
          </m.div>
        </m.div>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div 
      className="space-y-6"
        initial={ENTER_INITIAL}
        animate={ENTER_ANIMATE}
        transition={trans06}
    >
      {/* 标题和说明 */}
        <m.div 
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100"
          initial={ENTER_INITIAL}
          animate={ENTER_ANIMATE}
          transition={trans06}
      >
        <h2 className="text-2xl font-bold text-blue-700 mb-3 flex items-center gap-2">
          <FaCog className="text-2xl text-blue-600" />
          环境变量管理
        </h2>
        <div className="text-gray-600 space-y-2">
          <p>查看系统环境变量配置，支持加密存储和传输。</p>
          <div className="flex items-start gap-2 text-sm">
            <div>
              <p className="font-semibold text-blue-700">功能说明：</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>实时查看系统环境变量</li>
                <li>支持AES-256加密传输</li>
                <li>自动解密显示数据</li>
                <li>仅管理员可访问</li>
              </ul>
            </div>
          </div>
        </div>
        </m.div>

      {/* 环境变量表格 */}
        <m.div 
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          initial={ENTER_INITIAL}
          animate={ENTER_ANIMATE}
          transition={trans06}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FaList className="text-lg text-blue-500" />
            环境变量列表
          </h3>
            <m.button
            onClick={fetchEnvs}
            disabled={loading}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 text-sm font-medium flex items-center gap-2"
            whileTap={{ scale: 0.95 }}
          >
            <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
            </m.button>
        </div>

        {/* 数据来源图例 */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 text-base text-blue-700">
            <FaInfoCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium leading-relaxed">带蓝色感叹号图标的变量表示有明确的数据来源信息</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </div>
        ) : envs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaList className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            暂无环境变量数据
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[200px] w-1/3">变量名</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[300px] w-2/3">值</th>
                </tr>
              </thead>
              <tbody>
                {envs.map((item, idx) => (
                    <EnvRow
                    key={item.key} 
                      item={item}
                      idx={idx}
                      prefersReducedMotion={!!prefersReducedMotion}
                      onSourceClick={handleSourceClick}
                    />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 统计信息 */}
        {!loading && envs.length > 0 && (
            <m.div
              initial={ENTER_INITIAL}
              animate={ENTER_ANIMATE}
              transition={trans03}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>总计 {envs.length} 个环境变量</span>
              <span>最后更新: {new Date().toLocaleString()}</span>
            </div>
            </m.div>
          )}
        </m.div>

        {/* 对外邮件校验码设置 */}
        <m.div
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          initial={ENTER_INITIAL}
          animate={ENTER_ANIMATE}
          transition={trans06}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">对外邮件校验码设置</h3>
            <m.button
              onClick={fetchOutemailSettings}
              disabled={settingsLoading}
              className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              whileTap={{ scale: 0.95 }}
            >
              <FaSync className={`w-4 h-4 ${settingsLoading ? 'animate-spin' : ''}`} />
              刷新
            </m.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">域名（可留空表示默认）</label>
              <input
                value={settingDomain}
                onChange={(e) => setSettingDomain(e.target.value)}
                placeholder="例如: hapxs.com 或 留空"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">校验码</label>
              <input
                value={settingCode}
                onChange={(e) => setSettingCode(e.target.value)}
                placeholder="请输入校验码（仅用于校验，不会回显明文）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <m.button
              onClick={handleSaveSetting}
              disabled={settingsSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              {settingsSaving ? '保存中...' : '保存/更新'}
            </m.button>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">已配置域名</h4>
            {settingsLoading ? (
              <div className="text-gray-500 text-sm">加载中...</div>
            ) : outemailSettings.length === 0 ? (
              <div className="text-gray-500 text-sm">暂无配置</div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">域名</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">校验码（脱敏）</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">更新时间</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outemailSettings.map((s, i) => (
                      <m.tr
                        key={(s.domain || '') + i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={prefersReducedMotion ? NO_DURATION : { duration: 0.25, delay: i * 0.04 }}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-4 py-3 text-sm text-gray-800">{s.domain || <span className="text-gray-400">默认</span>}</td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-700">{s.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <m.button
                            onClick={() => handleDeleteSetting(s.domain || '')}
                            disabled={settingsDeletingDomain === (s.domain || '')}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-sm"
                            whileTap={{ scale: 0.95 }}
                          >
                            {settingsDeletingDomain === (s.domain || '') ? '删除中...' : '删除'}
                          </m.button>
                        </td>
                      </m.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </m.div>

        {/* MOD 列表修改码设置 */}
        <m.div
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          initial={ENTER_INITIAL}
          animate={ENTER_ANIMATE}
          transition={trans06}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">MOD 列表修改码设置</h3>
            <m.button
              onClick={fetchModlistSetting}
              disabled={modLoading}
              className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              whileTap={{ scale: 0.95 }}
            >
              <FaSync className={`w-4 h-4 ${modLoading ? 'animate-spin' : ''}`} />
              刷新
            </m.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">修改码</label>
              <input
                value={modCodeInput}
                onChange={(e) => setModCodeInput(e.target.value)}
                placeholder="请输入修改码（仅用于校验，不会回显明文）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">当前配置（脱敏）</label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 min-h-[40px] flex items-center">
                {modLoading ? '加载中...' : (modSetting?.code || '未设置')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <m.button
              onClick={handleDeleteModCode}
              disabled={modDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              {modDeleting ? '删除中...' : '删除'}
            </m.button>
            <m.button
              onClick={handleSaveModCode}
              disabled={modSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              {modSaving ? '保存中...' : '保存/更新'}
            </m.button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            最后更新时间：{modSetting?.updatedAt ? new Date(modSetting.updatedAt).toLocaleString() : '-'}
          </div>
        </m.div>

        {/* TTS 生成码设置 */}
        <m.div
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          initial={ENTER_INITIAL}
          animate={ENTER_ANIMATE}
          transition={trans06}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">TTS 生成码设置</h3>
            <m.button
              onClick={fetchTtsSetting}
              disabled={ttsLoading}
              className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              whileTap={{ scale: 0.95 }}
            >
              <FaSync className={`w-4 h-4 ${ttsLoading ? 'animate-spin' : ''}`} />
              刷新
            </m.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">生成码</label>
              <input
                value={ttsCodeInput}
                onChange={(e) => setTtsCodeInput(e.target.value)}
                placeholder="请输入生成码（仅用于校验，不会回显明文）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">当前配置（脱敏）</label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 min-h-[40px] flex items-center">
                {ttsLoading ? '加载中...' : (ttsSetting?.code || '未设置')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <m.button
              onClick={handleDeleteTtsCode}
              disabled={ttsDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              {ttsDeleting ? '删除中...' : '删除'}
            </m.button>
            <m.button
              onClick={handleSaveTtsCode}
              disabled={ttsSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              {ttsSaving ? '保存中...' : '保存/更新'}
            </m.button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            最后更新时间：{ttsSetting?.updatedAt ? new Date(ttsSetting.updatedAt).toLocaleString() : '-'}
          </div>
        </m.div>

        {/* 短链 AES_KEY 设置 */}
        <m.div
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          initial={ENTER_INITIAL}
          animate={ENTER_ANIMATE}
          transition={trans06}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">短链 AES_KEY 设置</h3>
            <m.button
              onClick={fetchShortAes}
              disabled={shortAesLoading}
              className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              whileTap={{ scale: 0.95 }}
            >
              <FaSync className={`w-4 h-4 ${shortAesLoading ? 'animate-spin' : ''}`} />
              刷新
            </m.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">AES_KEY</label>
              <input
                value={shortAesInput}
                onChange={(e) => setShortAesInput(e.target.value)}
                placeholder="请输入 AES_KEY（仅用于加解密，不会回显明文）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">当前配置（脱敏）</label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 min-h-[40px] flex items-center">
                {shortAesLoading ? '加载中...' : (shortAesSetting?.aesKey ?? '未设置')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <m.button
              onClick={handleDeleteShortAes}
              disabled={shortAesDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              {shortAesDeleting ? '删除中...' : '删除'}
            </m.button>
            <m.button
              onClick={handleSaveShortAes}
              disabled={shortAesSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              {shortAesSaving ? '保存中...' : '保存/更新'}
            </m.button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            最后更新时间：{shortAesSetting?.updatedAt ? new Date(shortAesSetting.updatedAt).toLocaleString() : '-'}
          </div>
        </m.div>

        {/* LibreChat 提供者配置（多组BASE_URL/API_KEY/MODEL） */}
        <m.div
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          initial={ENTER_INITIAL}
          animate={ENTER_ANIMATE}
          transition={trans06}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">LibreChat 提供者配置</h3>
            <div className="flex items-center gap-2">
              <input
                value={providerFilterGroup}
                onChange={(e) => setProviderFilterGroup(e.target.value)}
                placeholder="按 group 过滤"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
              <m.button
                onClick={fetchProviders}
                disabled={providersLoading}
                className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                whileTap={{ scale: 0.95 }}
              >
                <FaSync className={`w-4 h-4 ${providersLoading ? 'animate-spin' : ''}`} />
                刷新
              </m.button>
            </div>
          </div>

          {/* 表单 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                value={providerBaseUrl}
                onChange={(e) => setProviderBaseUrl(e.target.value)}
                placeholder="https://your-openai-compatible.example"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                value={providerApiKey}
                onChange={(e) => setProviderApiKey(e.target.value)}
                placeholder="re_xxx 或 sk-xxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                value={providerModel}
                onChange={(e) => setProviderModel(e.target.value)}
                placeholder="gpt-4o-mini / gpt-oss-120b 等"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group（可选）</label>
              <input
                value={providerGroup}
                onChange={(e) => setProviderGroup(e.target.value)}
                placeholder="自定义分组名，用于归类"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">启用</label>
              <input
                type="checkbox"
                checked={providerEnabled}
                onChange={(e) => setProviderEnabled(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">权重（1-10）</label>
              <input
                type="number"
                value={providerWeight}
                onChange={(e) => setProviderWeight(Math.max(1, Math.min(10, Number(e.target.value || 1))))}
                min={1}
                max={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mb-4">
            <m.button
              onClick={resetProviderForm}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              重置
            </m.button>
            <m.button
              onClick={handleSaveProvider}
              disabled={providerSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
              whileTap={{ scale: 0.96 }}
            >
              {providerSaving ? '保存中...' : (providerId ? '更新' : '新增')}
            </m.button>
          </div>

          {/* 列表 */}
          {providersLoading ? (
            <div className="text-gray-500 text-sm">加载中...</div>
          ) : providers.length === 0 ? (
            <div className="text-gray-500 text-sm">暂无提供者</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Base URL</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Model</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Group</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Enabled</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Weight</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">API Key（脱敏）</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Updated</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, i) => (
                    <m.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={prefersReducedMotion ? NO_DURATION : { duration: 0.25, delay: i * 0.04 }}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 text-sm text-gray-800 break-all">{p.baseUrl}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{p.model}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{p.group || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{p.enabled ? '是' : '否'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{p.weight}</td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-700">{p.apiKey}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <m.button
                            onClick={() => handleEditProvider(p)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition text-sm"
                            whileTap={{ scale: 0.95 }}
                          >
                            编辑
                          </m.button>
                          <m.button
                            onClick={() => handleDeleteProvider(p.id)}
                            disabled={providerDeletingId === p.id}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-sm"
                            whileTap={{ scale: 0.95 }}
                          >
                            {providerDeletingId === p.id ? '删除中...' : '删除'}
                          </m.button>
                        </div>
                      </td>
                    </m.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </m.div>

      {/* 数据来源弹窗 */}
      <AnimatePresence>
        {showSourceModal && (
            <m.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
              transition={modalTrans}
            onClick={() => setShowSourceModal(false)}
          >
              <m.div
              className="bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 w-full max-w-md mx-4 relative z-[10000] border border-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
                transition={modalTrans}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaInfoCircle className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">数据来源</h3>
                <p className="text-gray-600 mb-6">{selectedSource}</p>
                <button
                  onClick={() => setShowSourceModal(false)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  确定
                </button>
              </div>
              </m.div>
            </m.div>
        )}
      </AnimatePresence>
      </m.div>
    </LazyMotion>
  );
};

export default EnvManager; 