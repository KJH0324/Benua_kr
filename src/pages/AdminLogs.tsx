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
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">시간 (MS)</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">식별자 (ID/EMAIL)</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">액션 ID & 대상</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">접속 기기 (IP / UA)</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">변경 상세 (JSON)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => {
              const dt = log.timestamp_ms ? new Date(log.timestamp_ms) : new Date(log.created_at);
              return (
                <tr key={log.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-400 whitespace-nowrap">
                    <span className="text-gray-900 font-medium">
                      {dt.toISOString().replace('T', ' ').replace('Z', '')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-venuea-dark text-xs truncate max-w-[150px]" title={log.admin_identifier || "System"}>
                    {log.admin_identifier || "System"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-xs uppercase tracking-wider text-gray-900">{log.action}</div>
                    <div className="text-gray-500 text-[10px] mt-1">
                      {log.target_type ? `${log.target_type} (ID: ${log.target_id || '-'})` : "시스템 전역"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px]">
                    <div className="font-mono text-gray-700">{log.ip_address || "알 수 없음 IP"}</div>
                    <div className="text-gray-400 mt-1 truncate max-w-[150px]" title={log.user_agent}>
                      {log.user_agent || "알 수 없음 기기"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="text-gray-800">{log.details || '-'}</div>
                    {log.changes && (
                      <pre className="mt-2 p-2 bg-gray-50 rounded border border-gray-100 text-[10px] text-gray-600 font-mono overflow-auto max-h-32">
                        {log.changes}
                      </pre>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
