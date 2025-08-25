import FingerprintJS from '@fingerprintjs/fingerprintjs';
import CryptoJS from 'crypto-js';
import { getApiBaseUrl } from '../api/api';

const FP_STORAGE_KEY = 'hapx_fingerprint_v2';
const FP_VERSION = '2';
const FP_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30天

type CachedFingerprint = { id: string; v: string; ts: number };

function safeHash(input: string): string {
  try {
    return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
  } catch {
    // 极端情况下，返回简单base64作为兜底（较弱）
    return btoa(unescape(encodeURIComponent(input))).slice(0, 64);
  }
}

function readCache(): string | null {
  try {
    const raw = localStorage.getItem(FP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFingerprint;
    if (parsed.v !== FP_VERSION) return null;
    if (Date.now() - parsed.ts > FP_TTL_MS) return null;
    return parsed.id;
  } catch {
    return null;
  }
}

function writeCache(id: string): void {
  try {
    const payload: CachedFingerprint = { id, v: FP_VERSION, ts: Date.now() };
    localStorage.setItem(FP_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 忽略存储错误
  }
}

function getOrCreateStableRandomId(): string {
  const key = 'hapx_fp_rand';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
  } catch {}

  let rand = '';
  try {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    rand = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    rand = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  try { localStorage.setItem(key, rand); } catch {}
  return rand;
}

function getNavigatorSignals() {
  try {
    const n = navigator as any;
    return {
      ua: n.userAgent || '',
      uaData: n.userAgentData ? JSON.stringify(n.userAgentData) : '',
      lang: navigator.language,
      langs: (navigator.languages || []).join(','),
      platform: navigator.platform,
      vendor: navigator.vendor,
      dnt: navigator.doNotTrack || (n.msDoNotTrack || ''),
      hardware: (navigator as any).hardwareConcurrency || 0,
      memory: (navigator as any).deviceMemory || 0,
      plugins: (() => {
        try { return Array.from(navigator.plugins || []).map(p => p.name + ':' + p.filename).join('|'); } catch { return ''; }
      })(),
      maxTouchPoints: (navigator as any).maxTouchPoints || 0,
    };
  } catch {
    return {};
  }
}

function getScreenSignals() {
  try {
    return {
      w: screen.width,
      h: screen.height,
      aw: screen.availWidth,
      ah: screen.availHeight,
      cd: screen.colorDepth,
      pr: (window.devicePixelRatio || 1),
      o: window.screen.orientation ? (window.screen.orientation.type || '') : '',
    };
  } catch {
    return {};
  }
}

function getTimezoneSignals() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const off = new Date().getTimezoneOffset();
    return { tz, off };
  } catch {
    return {};
  }
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('HAPX-FP-CANVAS-测试字符串😊', 2, 2);
    ctx.strokeStyle = 'rgba(120, 186, 176, 0.5)';
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(190, 40);
    ctx.stroke();
    const data = canvas.toDataURL();
    return safeHash(data);
  } catch {
    return '';
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return '';
    const dbgInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = dbgInfo ? gl.getParameter((dbgInfo as any).UNMASKED_VENDOR_WEBGL) : '';
    const renderer = dbgInfo ? gl.getParameter((dbgInfo as any).UNMASKED_RENDERER_WEBGL) : '';
    const params = [
      gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
      gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
      gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_VARYING_VECTORS),
      gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      gl.getSupportedExtensions(),
    ];
    return safeHash(JSON.stringify({ vendor, renderer, params }));
  } catch {
    return '';
  }
}

function buildCompositeFingerprint(): string {
  const data = {
    nav: getNavigatorSignals(),
    scr: getScreenSignals(),
    tz: getTimezoneSignals(),
    can: getCanvasFingerprint(),
    wgl: getWebGLFingerprint(),
    rnd: getOrCreateStableRandomId(),
  };
  return safeHash(JSON.stringify(data));
}

async function getWithFingerprintJS(timeoutMs = 1500): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    // FingerprintJS 自身不使用AbortController，这里用Promise.race模拟超时
    const p = (async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      return result.visitorId as string;
    })();
    const id = await Promise.race<string | null>([
      p,
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    clearTimeout(to);
    return id;
  } catch {
    return null;
  }
}

// 检查用户是否已登录
function isUserLoggedIn(): boolean {
  const token = localStorage.getItem('token');
  return !!token;
}

// 获取客户端IP地址
export const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/ip`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('获取IP地址失败');
    }

    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.error('获取IP地址失败:', error);
    return 'unknown';
  }
};

// 生成浏览器指纹
export const getFingerprint = async (): Promise<string | null> => {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('生成指纹失败:', error);
    return null;
  }
};

// 上报指纹（仅登录用户）
export const reportFingerprintOnce = async (): Promise<void> => {
  // 未登录用户不进行请求
  if (!isUserLoggedIn()) {
    console.log('用户未登录，跳过指纹上报');
    return;
  }

  const fingerprint = await getFingerprint();
  if (!fingerprint) {
    console.error('无法生成指纹');
    return;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/fingerprint/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ fingerprint })
    });

    if (response.ok) {
      console.log('指纹上报成功');
    } else {
      console.warn('指纹上报失败:', response.status);
    }
  } catch (error) {
    console.error('指纹上报请求失败:', error);
  }
};

// 临时指纹上报（用于首次访问检测）
export const reportTempFingerprint = async (): Promise<{ isFirstVisit: boolean; verified: boolean }> => {
  const fingerprint = await getFingerprint();
  if (!fingerprint) {
    throw new Error('无法生成指纹');
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/turnstile/temp-fingerprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fingerprint })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403 && errorData.error === 'IP已被封禁') {
        // 创建一个包含完整封禁信息的错误对象
        const banError = new Error(`IP已被封禁: ${errorData.reason}`);
        (banError as any).banData = {
          reason: errorData.reason,
          expiresAt: errorData.expiresAt
        };
        throw banError;
      }
      throw new Error('指纹上报失败');
    }

    const data = await response.json();
    return {
      isFirstVisit: data.isFirstVisit,
      verified: data.verified
    };
  } catch (error) {
    console.error('临时指纹上报失败:', error);
    throw error;
  }
};

// 验证临时指纹
export const verifyTempFingerprint = async (fingerprint: string, cfToken: string): Promise<{ success: boolean; accessToken?: string }> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/turnstile/verify-temp-fingerprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fingerprint, cfToken })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403 && errorData.error === 'IP已被封禁') {
        // 创建一个包含完整封禁信息的错误对象
        const banError = new Error(`IP已被封禁: ${errorData.reason}`);
        (banError as any).banData = {
          reason: errorData.reason,
          expiresAt: errorData.expiresAt
        };
        throw banError;
      }
      throw new Error('验证失败');
    }

    const data = await response.json();
    return {
      success: data.success,
      accessToken: data.accessToken
    };
  } catch (error) {
    console.error('验证临时指纹失败:', error);
    throw error;
  }
};

// 检查临时指纹状态
export const checkTempFingerprintStatus = async (fingerprint: string): Promise<{ exists: boolean; verified: boolean }> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/turnstile/temp-fingerprint/${fingerprint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403 && errorData.error === 'IP已被封禁') {
        // 创建一个包含完整封禁信息的错误对象
        const banError = new Error(`IP已被封禁: ${errorData.reason}`);
        (banError as any).banData = {
          reason: errorData.reason,
          expiresAt: errorData.expiresAt
        };
        throw banError;
      }
      throw new Error('检查状态失败');
    }

    const data = await response.json();
    return {
      exists: data.exists,
      verified: data.verified
    };
  } catch (error) {
    console.error('检查临时指纹状态失败:', error);
    throw error;
  }
};

// 验证访问密钥
export const verifyAccessToken = async (token: string, fingerprint: string): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/turnstile/verify-access-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, fingerprint })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403 && errorData.error === 'IP已被封禁') {
        console.error(`IP已被封禁: ${errorData.reason}`);
        return false;
      }
      return false;
    }

    const data = await response.json();
    return data.success && data.valid;
  } catch (error) {
    console.error('验证访问密钥失败:', error);
    return false;
  }
};

// 检查指纹是否有有效访问密钥
export const checkAccessToken = async (fingerprint: string): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/turnstile/check-access-token/${fingerprint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403 && errorData.error === 'IP已被封禁') {
        console.error(`IP已被封禁: ${errorData.reason}`);
        return false;
      }
      return false;
    }

    const data = await response.json();
    return data.success && data.hasValidToken;
  } catch (error) {
    console.error('检查访问密钥失败:', error);
    return false;
  }
};

// 存储访问密钥到本地存储
export const storeAccessToken = (fingerprint: string, token: string): void => {
  try {
    const accessTokens = JSON.parse(localStorage.getItem('accessTokens') || '{}');
    accessTokens[fingerprint] = {
      token,
      timestamp: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5分钟后过期
    };
    localStorage.setItem('accessTokens', JSON.stringify(accessTokens));
  } catch (error) {
    console.error('存储访问密钥失败:', error);
  }
};

// 从本地存储获取访问密钥
export const getAccessToken = (fingerprint: string): string | null => {
  try {
    const accessTokens = JSON.parse(localStorage.getItem('accessTokens') || '{}');
    const tokenData = accessTokens[fingerprint];
    
    if (!tokenData) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > tokenData.expiresAt) {
      // 删除过期的密钥
      delete accessTokens[fingerprint];
      localStorage.setItem('accessTokens', JSON.stringify(accessTokens));
      return null;
    }

    return tokenData.token;
  } catch (error) {
    console.error('获取访问密钥失败:', error);
    return null;
  }
};

// 清理过期的访问密钥
export const cleanupExpiredAccessTokens = (): void => {
  try {
    const accessTokens = JSON.parse(localStorage.getItem('accessTokens') || '{}');
    const now = Date.now();
    let hasChanges = false;

    Object.keys(accessTokens).forEach(fingerprint => {
      if (now > accessTokens[fingerprint].expiresAt) {
        delete accessTokens[fingerprint];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      localStorage.setItem('accessTokens', JSON.stringify(accessTokens));
    }
  } catch (error) {
    console.error('清理过期访问密钥失败:', error);
  }
};