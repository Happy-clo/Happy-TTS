import React, { useState, useEffect } from 'react';

interface IPInfo {
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
}

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const [uptime, setUptime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [ipLoading, setIpLoading] = useState(true);

  useEffect(() => {
    const startDate = new Date('2025-06-15T09:30:00');
    
    const updateUptime = () => {
      const now = new Date();
      const diff = now.getTime() - startDate.getTime();
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setUptime({ days, hours, minutes, seconds });
      }
    };

    updateUptime();
    const interval = setInterval(updateUptime, 1000); // 每秒更新一次

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchIPInfo = async () => {
      try {
        setIpLoading(true);
        const response = await fetch('/ip');
        if (response.ok) {
          const data: IPInfo = await response.json();
          setIpInfo(data);
        } else {
          throw new Error('获取IP信息失败');
        }
      } catch (error) {
        console.error('获取IP信息失败:', error);
        setIpInfo(null);
      } finally {
        setIpLoading(false);
      }
    };

    fetchIPInfo();
  }, []);

  return (
    <footer className="text-center text-gray-500 mt-8 mb-2 text-sm select-none flex flex-col items-center gap-1">
      <div>
        Copyright ©{' '}
        <a 
          href="https://github.com/Happy-clo" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-blue-500 transition-colors duration-200"
        >
          Individual Developer Happy-clo
        </a>{' '}
        {year}
      </div>
      <div className="mt-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs max-w-xs">
        ⚠️ 本站为个人独立开发项目，与 OpenAI 官方无任何隶属或合作关系。请勿将本站内容视为 OpenAI 官方服务。
      </div>
      <div className="mt-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-green-700 text-xs max-w-xs">
        🚀 自 2025年6月15日 9:30 以来，本站已稳定运行{' '}
        <span className="font-bold text-green-800">
          {uptime.days} 天 {uptime.hours} 小时 {uptime.minutes} 分钟 {uptime.seconds} 秒
        </span>
      </div>
      <div className="mt-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs max-w-xs">
        🌐 您的网络信息：
        {ipLoading ? (
          <span className="font-mono font-bold text-blue-800">获取中...</span>
        ) : ipInfo ? (
          <div className="mt-1 space-y-0.5">
            <div className="font-mono font-bold text-blue-800">
              IP: {ipInfo.ip}
            </div>
            <div className="text-blue-600">
              📍 {ipInfo.country} {ipInfo.region} {ipInfo.city}
            </div>
            <div className="text-blue-600">
              🌐 {ipInfo.isp}
            </div>
          </div>
        ) : (
          <span className="font-mono font-bold text-red-600">获取失败</span>
        )}
      </div>
    </footer>
  );
};

export default Footer; 