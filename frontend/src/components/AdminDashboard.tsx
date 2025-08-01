import React, { useState, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement';
const AnnouncementManager = React.lazy(() => import('./AnnouncementManager'));
const EnvManager = React.lazy(() => import('./EnvManager'));
import { motion, AnimatePresence } from 'framer-motion';
const LotteryAdmin = React.lazy(() => import('./LotteryAdmin'));
const ModListEditor = React.lazy(() => import('./ModListEditor'));
const OutEmail = React.lazy(() => import('./OutEmail'));
const ShortLinkManager = React.lazy(() => import('./ShortLinkManager'));
const ShortUrlMigrationManager = React.lazy(() => import('./ShortUrlMigrationManager'));
const CommandManager = React.lazy(() => import('./CommandManager'));
const LogShare = React.lazy(() => import('./LogShare'));
import { useAuth } from '../hooks/useAuth';
import { useNotification } from './Notification';
import { getApiBaseUrl } from '../api/api';

const TABS = [
  { key: 'users', label: '用户管理' },
  { key: 'announcement', label: '公告管理' },
  { key: 'env', label: '环境变量' },
  { key: 'lottery', label: '抽奖管理' },
  { key: 'modlist', label: 'Mod管理' },
  { key: 'outemail', label: '外部邮件' },
  { key: 'shortlink', label: '短链管理' },
  { key: 'shorturlmigration', label: '短链迁移' },
  { key: 'command', label: '命令管理' },
  { key: 'logshare', label: '日志分享' },
];

const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState('users');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  const { setNotification } = useNotification();
  const navigate = useNavigate();

  // 多重权限验证
  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        setIsLoading(true);

        // 1. 检查是否已登录
        if (loading) {
          return; // 等待认证检查完成
        }

        if (!user) {
          console.warn('[AdminDashboard] 未登录，重定向到登录页面');
          setNotification({ message: '请先登录', type: 'warning' });
          navigate('/login');
          return;
        }

        // 2. 检查用户角色
        if (user.role !== 'admin') {
          console.warn('[AdminDashboard] 非管理员用户尝试访问管理后台', { userId: user.id, role: user.role });
          setNotification({ message: '权限不足，仅限管理员访问', type: 'error' });
          navigate('/');
          return;
        }

        // 3. 验证Token有效性
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('[AdminDashboard] Token不存在');
          setNotification({ message: '登录已过期，请重新登录', type: 'error' });
          navigate('/login');
          return;
        }

        // 4. 后端权限验证
        try {
          const response = await fetch(`${getApiBaseUrl()}/api/admin/verify-access`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: user.id,
              username: user.username,
              role: user.role
            })
          });

          if (!response.ok) {
            throw new Error('后端权限验证失败');
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || '权限验证失败');
          }

          console.log('[AdminDashboard] 权限验证通过', { userId: user.id, role: user.role });
          setIsAuthorized(true);

        } catch (error) {
          console.error('[AdminDashboard] 后端权限验证失败:', error);
          setNotification({ message: '权限验证失败，请重新登录', type: 'error' });
          navigate('/login');
          return;
        }

      } catch (error) {
        console.error('[AdminDashboard] 权限验证过程中发生错误:', error);
        setNotification({ message: '权限验证失败', type: 'error' });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAdminAccess();
  }, [loading, user, navigate, setNotification]);

  // 定期检查权限（每5分钟）
  useEffect(() => {
    if (!isAuthorized) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('[AdminDashboard] 定期检查：Token不存在');
          setNotification({ message: '登录已过期，请重新登录', type: 'warning' });
          navigate('/login');
          return;
        }

        const response = await fetch(`${getApiBaseUrl()}/api/admin/verify-access`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user?.id,
            username: user?.username,
            role: user?.role
          })
        });

        if (!response.ok) {
          console.warn('[AdminDashboard] 定期检查：权限验证失败');
          setNotification({ message: '权限已失效，请重新登录', type: 'warning' });
          navigate('/login');
        }
      } catch (error) {
        console.error('[AdminDashboard] 定期权限检查失败:', error);
      }
    }, 5 * 60 * 1000); // 5分钟

    return () => clearInterval(interval);
  }, [isAuthorized, user, navigate, setNotification]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 mt-8 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在验证管理员权限...</p>
          </div>
        </div>
      </div>
    );
  }

  // 未授权状态
  if (!isAuthorized) {
    return (
      <div className="max-w-5xl mx-auto p-6 mt-8 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">访问被拒绝</h2>
            <p className="text-gray-600 mb-4">您没有权限访问管理后台</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 mt-4 sm:mt-8 bg-white rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">管理后台</h1>
        {/* 手机端信息横向排列 */}
        <div className="flex flex-row flex-wrap sm:flex-row items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 justify-center sm:justify-start">
          <span>管理员: {user?.username}</span>
          <span className="mx-1">•</span>
          <span>ID: {user?.id}</span>
          <span className="mx-1">•</span>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/login');
            }}
            className="text-red-600 hover:text-red-700 transition"
          >
            退出登录
          </button>
        </div>
      </div>
      <div className="flex space-x-4 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" style={{ WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <motion.button
            key={t.key}
            className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-all duration-150 shadow whitespace-nowrap min-w-[3.5rem] max-w-xs text-center ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-indigo-50'}`}
            style={{ width: 'auto', minWidth: 'max-content' }}
            onClick={() => setTab(t.key)}
            whileTap={{ scale: 0.96 }}
            whileHover={tab !== t.key ? { scale: 1.05 } : {}}
          >
            <span className="w-full text-center block">{t.label}</span>
          </motion.button>
        ))}
      </div>
      <div style={{ minHeight: 400 }}>
        <AnimatePresence mode="wait">
          {tab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <UserManagement />
            </motion.div>
          )}
          {tab === 'announcement' && (
            <motion.div
              key="announcement"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <AnnouncementManager />
              </Suspense>
            </motion.div>
          )}
          {tab === 'env' && (
            <motion.div
              key="env"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <EnvManager />
              </Suspense>
            </motion.div>
          )}
          {tab === 'lottery' && (
            <motion.div
              key="lottery"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <LotteryAdmin />
              </Suspense>
            </motion.div>
          )}
          {tab === 'modlist' && (
            <motion.div
              key="modlist"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <ModListEditor />
              </Suspense>
            </motion.div>
          )}
          {tab === 'outemail' && (
            <motion.div
              key="outemail"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <OutEmail />
              </Suspense>
            </motion.div>
          )}
          {tab === 'shortlink' && (
            <motion.div
              key="shortlink"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <ShortLinkManager />
              </Suspense>
            </motion.div>
          )}
          {tab === 'shorturlmigration' && (
            <motion.div
              key="shorturlmigration"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <ShortUrlMigrationManager />
              </Suspense>
            </motion.div>
          )}
          {tab === 'command' && (
            <motion.div
              key="command"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <CommandManager />
              </Suspense>
            </motion.div>
          )}
          {tab === 'logshare' && (
            <motion.div
              key="logshare"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<div className="text-gray-400">加载中…</div>}>
                <LogShare />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard; 