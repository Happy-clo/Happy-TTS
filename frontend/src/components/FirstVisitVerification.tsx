import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TurnstileWidget } from './TurnstileWidget';
import { useTurnstileConfig } from '../hooks/useTurnstileConfig';
import { getFingerprint, verifyTempFingerprint } from '../utils/fingerprint';

interface FirstVisitVerificationProps {
  onVerificationComplete: () => void;
  fingerprint: string;
}

export const FirstVisitVerification: React.FC<FirstVisitVerificationProps> = ({
  onVerificationComplete,
  fingerprint,
}) => {
  const { config: turnstileConfig, loading: turnstileConfigLoading } = useTurnstileConfig({ usePublicConfig: true });
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // 检测设备类型和方向
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width <= 768);
      setIsLandscape(width > height);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  const handleTurnstileVerify = useCallback((token: string) => {
    console.log('Turnstile验证成功，token:', token);
    setTurnstileToken(token);
    setTurnstileVerified(true);
    setTurnstileError(false);
    setError('');
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    console.log('Turnstile验证过期');
    setTurnstileToken('');
    setTurnstileVerified(false);
    setTurnstileError(false);
  }, []);

  const handleTurnstileError = useCallback(() => {
    console.log('Turnstile验证错误');
    setTurnstileToken('');
    setTurnstileVerified(false);
    setTurnstileError(true);
    setError('人机验证失败，请重试');
  }, []);

  const handleVerify = useCallback(async () => {
    if (!turnstileVerified || !turnstileToken) {
      setError('请先完成人机验证');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const success = await verifyTempFingerprint(fingerprint, turnstileToken);
      if (success) {
        console.log('首次访问验证成功');
        onVerificationComplete();
      } else {
        setError('验证失败，请重试');
        setTurnstileToken('');
        setTurnstileVerified(false);
        setTurnstileKey(k => k + 1);
      }
    } catch (err) {
      console.error('验证失败:', err);
      setError('验证失败，请重试');
      setTurnstileToken('');
      setTurnstileVerified(false);
      setTurnstileKey(k => k + 1);
    } finally {
      setVerifying(false);
    }
  }, [turnstileVerified, turnstileToken, fingerprint, onVerificationComplete]);

  // 响应式Logo组件
  const Logo = () => {
    const logoSize = isMobile ? (isLandscape ? 80 : 100) : 140;
    
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative"
      >
        <svg
          width={logoSize}
          height={logoSize}
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`mx-auto ${isMobile ? 'mb-4' : 'mb-8'} drop-shadow-lg`}
        >
          {/* 外圈光晕效果 */}
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3"/>
              <stop offset="70%" stopColor="#4F46E5" stopOpacity="0.1"/>
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5"/>
              <stop offset="100%" stopColor="#7C3AED"/>
            </linearGradient>
          </defs>
          
          {/* 光晕背景 */}
          <circle cx="70" cy="70" r="65" fill="url(#glow)"/>
          
          {/* 主圆形背景 */}
          <circle cx="70" cy="70" r="55" fill="url(#mainGradient)" stroke="#6366F1" strokeWidth="3"/>
          
          {/* 内圈装饰 */}
          <circle cx="70" cy="70" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          
          {/* 笑脸眼睛 - 添加动画 */}
          <motion.circle 
            cx="55" cy="60" r="5" fill="white"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle 
            cx="85" cy="60" r="5" fill="white"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          
          {/* 笑脸嘴巴 */}
          <path
            d="M 50 80 Q 70 95 90 80"
            stroke="white"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 装饰性元素 - 添加浮动动画 */}
          <motion.circle 
            cx="35" cy="35" r="4" fill="#A78BFA" opacity="0.7"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle 
            cx="105" cy="45" r="3" fill="#A78BFA" opacity="0.7"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.circle 
            cx="30" cy="95" r="3" fill="#A78BFA" opacity="0.7"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.circle 
            cx="110" cy="90" r="4" fill="#A78BFA" opacity="0.7"
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          />
        </svg>
      </motion.div>
    );
  };

  // 响应式背景粒子效果
  const BackgroundParticles = () => {
    const particleCount = isMobile ? 10 : 20;
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: particleCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 z-50 overflow-hidden"
        style={{
          padding: isMobile ? '1rem' : '1.5rem',
          minHeight: '100dvh', // 支持动态视口高度
        }}
      >
        {/* 背景粒子 */}
        <BackgroundParticles />
        
        {/* 主容器 */}
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.95 }}
          transition={{ 
            duration: 0.6, 
            ease: "easeOut",
            delay: 0.1 
          }}
          className={`relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 ${
            isMobile 
              ? 'w-full max-w-sm mx-2 p-4' 
              : 'max-w-md w-full mx-4 p-8'
          }`}
          style={{
            maxHeight: isMobile ? '90vh' : '80vh',
            overflowY: 'auto',
          }}
        >
          {/* 顶部装饰线 */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full"></div>
          
          {/* Logo */}
          <Logo />
          
          {/* 标题 */}
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`text-center text-gray-800 mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold ${
              isMobile ? 'text-2xl' : 'text-3xl'
            }`}
          >
            欢迎访问
          </motion.h1>
          
          {/* 副标题 */}
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`text-center text-gray-600 mb-2 font-medium ${
              isMobile ? 'text-sm' : 'text-base'
            }`}
          >
            Happy TTS
          </motion.p>
          
          {/* 说明文字 */}
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className={`text-center text-gray-600 leading-relaxed ${
              isMobile ? 'text-sm mb-4' : 'text-base mb-8'
            }`}
          >
            为了确保您是人类用户
            <br />
            请完成下方验证以继续访问
          </motion.p>

          {/* Turnstile组件 */}
          {!turnstileConfigLoading && turnstileConfig.siteKey && typeof turnstileConfig.siteKey === 'string' && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className={`mb-6 ${isMobile ? 'mb-4' : 'mb-6'}`}
            >
              <div className="flex justify-center mb-4">
                <div className={`p-4 bg-gray-50 rounded-xl border border-gray-200 ${
                  isMobile ? 'w-full' : ''
                }`}>
                  <TurnstileWidget
                    key={turnstileKey}
                    siteKey={turnstileConfig.siteKey}
                    onVerify={handleTurnstileVerify}
                    onExpire={handleTurnstileExpire}
                    onError={handleTurnstileError}
                    theme="light"
                    size={isMobile ? "compact" : "normal"}
                  />
                </div>
              </div>
              
              {/* 验证状态 */}
              <motion.div 
                className="text-center mb-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {turnstileVerified ? (
                  <motion.div 
                    className={`flex items-center justify-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full border border-green-200 ${
                      isMobile ? 'text-sm' : 'text-base'
                    }`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <motion.svg 
                      className="w-5 h-5" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      initial={{ rotate: -180, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ duration: 0.5, type: "spring" }}
                    >
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </motion.svg>
                    <span className="font-medium">验证通过</span>
                  </motion.div>
                ) : (
                  <div className={`flex items-center justify-center gap-2 text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-200 ${
                    isMobile ? 'text-sm' : 'text-base'
                  }`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>请完成验证</span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* 错误信息 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`mb-4 p-4 bg-red-50 border border-red-200 rounded-xl ${
                  isMobile ? 'text-sm' : 'text-base'
                }`}
              >
                <div className="flex items-center gap-3 text-red-600">
                  <motion.svg 
                    className="w-5 h-5 flex-shrink-0" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </motion.svg>
                  <span className={`font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 验证按钮 */}
          <motion.button
            onClick={handleVerify}
            disabled={!turnstileVerified || verifying}
            className={`w-full text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-indigo-600 to-purple-600 ${
              isMobile 
                ? 'py-3 px-4 text-base' 
                : 'py-4 px-6 text-lg'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            {verifying ? (
              <div className="flex items-center justify-center gap-3">
                <motion.svg 
                  className="w-5 h-5" 
                  fill="none" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </motion.svg>
                <span>验证中...</span>
              </div>
            ) : (
              <span>继续访问</span>
            )}
          </motion.button>

          {/* 底部说明 */}
          <motion.div 
            className={`text-center ${isMobile ? 'mt-4' : 'mt-8'}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
            <p className={`text-gray-500 leading-relaxed ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              此验证仅用于防止自动化访问
              <br />
              您的隐私将得到充分保护
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 