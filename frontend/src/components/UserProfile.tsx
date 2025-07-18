import React, { useEffect, useState, ChangeEvent } from 'react';
import { useNotification } from './Notification';
import { motion } from 'framer-motion';
import VerifyCodeInput from './VerifyCodeInput';
import { LoadingSpinner } from './LoadingSpinner';

interface UserProfileData {
  id: string;
  username: string;
  email: string;
  avatarBase64?: string;
  role?: string;
}

const fetchProfile = async (): Promise<UserProfileData | null> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await fetch('/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
};

const updateProfile = async (data: Partial<UserProfileData> & { password?: string; newPassword?: string; verificationCode?: string }) => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/user/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result;
};

const verifyUser = async (verificationCode: string) => {
  const token = localStorage.getItem('token');
  const user = await fetchProfile();
  if (!user) return { success: false };
  const res = await fetch('/api/user/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId: user.id, verificationCode }),
  });
  const result = await res.json();
  return result;
};

const UserProfile: React.FC = () => {
  const { setNotification } = useNotification();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | undefined>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeoutId: any = null;
    setLoadError(null);
    setLoadTimeout(false);
    setLoading(true);
    timeoutId = setTimeout(() => {
      setLoadTimeout(true);
      setLoading(false);
    }, 5000); // 5秒超时
    fetchProfile().then((data) => {
      clearTimeout(timeoutId);
      setLoading(false);
      if (data) {
        setProfile(data);
        setEmail(data.email);
        setAvatarBase64(data.avatarBase64);
      } else {
        setLoadError('加载失败，请刷新页面或重新登录');
      }
    }).catch((e) => {
      clearTimeout(timeoutId);
      setLoading(false);
      setLoadError('加载失败：' + (e instanceof Error ? e.message : (e && e.toString ? e.toString() : '未知错误')));
    });
    return () => clearTimeout(timeoutId);
  }, []);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!verificationCode) {
      setNotification({ message: '请输入验证码', type: 'warning' });
      return;
    }
    setLoading(true);
    const res = await verifyUser(verificationCode);
    setLoading(false);
    if (res.success) {
      setVerified(true);
      setNotification({ message: '验证成功，请继续修改', type: 'success' });
    } else {
      setNotification({ message: res.error || '验证失败', type: 'error' });
    }
  };

  const handleUpdate = async () => {
    if (!verified) {
      setNotification({ message: '请先通过二次验证', type: 'warning' });
      return;
    }
    setLoading(true);
    const res = await updateProfile({
      email,
      password: password || undefined,
      newPassword: newPassword || undefined,
      avatarBase64,
    });
    setLoading(false);
    if (res.error) {
      setNotification({ message: res.error, type: 'error' });
    } else {
      setNotification({ message: '信息修改成功', type: 'success' });
      setProfile(res);
      setPassword('');
      setNewPassword('');
      setVerified(false);
      setVerificationCode('');
    }
  };

  if (!localStorage.getItem('token')) {
    return <div className="p-8 text-center text-red-500">未登录或会话已过期，请重新登录。</div>;
  }
  if (loadError) {
    return <div className="p-8 text-center text-red-500">{loadError}</div>;
  }
  if (loading || !profile) {
    if (loadTimeout) {
      return <div className="p-8 text-center text-red-500">加载超时，请检查网络或刷新页面</div>;
    }
    const scale = typeof window !== 'undefined' ? Math.max(0.7, Math.min(1.2, window.innerWidth / 1200)) : 1;
    return <LoadingSpinner size={scale} />;
  }

  return (
    <motion.div
      className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-8 mt-8"
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
    >
      <motion.h2
        className="text-2xl font-bold mb-6"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        个人主页
      </motion.h2>
      <motion.div
        className="flex flex-col items-center mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div
          className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-2 shadow-lg"
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.97, rotate: -2 }}
        >
          {avatarBase64 ? (
            <img src={avatarBase64} alt="头像" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl text-gray-400 flex items-center justify-center h-full">👤</span>
          )}
        </motion.div>
        <input type="file" accept="image/*" onChange={handleAvatarChange} className="mb-2" />
        <div className="text-lg font-semibold">{profile.username}</div>
        <div className="text-gray-500 text-sm">{profile.role === 'admin' ? '管理员' : '普通用户'}</div>
      </motion.div>
      <motion.div className="mb-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <label className="block text-gray-700 mb-1">邮箱</label>
        <motion.input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
          whileFocus={{ scale: 1.03, borderColor: '#6366f1' }}
        />
      </motion.div>
      <motion.div className="mb-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
        <label className="block text-gray-700 mb-1">当前密码（修改邮箱/密码时必填）</label>
        <motion.input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
          whileFocus={{ scale: 1.03, borderColor: '#6366f1' }}
        />
      </motion.div>
      <motion.div className="mb-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.21 }}>
        <label className="block text-gray-700 mb-1">新密码</label>
        <motion.input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
          whileFocus={{ scale: 1.03, borderColor: '#6366f1' }}
        />
      </motion.div>
      <motion.div className="mb-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.24 }}>
        <label className="block text-gray-700 mb-1">二次验证（邮箱验证码/TOTP/Passkey）</label>
        <VerifyCodeInput
          length={8}
          onComplete={setVerificationCode}
          loading={loading}
          error={undefined}
        />
        <motion.button
          onClick={handleVerify}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
          disabled={loading || verificationCode.length !== 8}
          whileTap={{ scale: 0.97 }}
        >
          验证
        </motion.button>
      </motion.div>
      <motion.button
        onClick={handleUpdate}
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-lg mt-2"
        disabled={loading}
        whileTap={{ scale: 0.97 }}
      >
        保存修改
      </motion.button>
    </motion.div>
  );
};

export default UserProfile; 