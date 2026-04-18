import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/admin/logs");
      if (response.ok) {
        setLogs(await response.json());
      } else {
        toast.error("로그를 불러오지 못했습니다.");
      }
    } catch {
      toast.error("서버 오류");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-venuea-gold" size={24} /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">관리자 활동 로그</h1>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">시간</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">액션</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">대상 타입</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-mono text-xs">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{log.action}</td>
                <td className="px-6 py-4 text-gray-500">{log.target_type || '-'}</td>
                <td className="px-6 py-4 text-gray-600 text-xs">{log.details || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
