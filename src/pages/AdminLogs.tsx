import React, { useState, useEffect } from "react";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { apiFetch } from "../lib/api";
import { toast } from "sonner";

interface AdminLogItem {
  id: number;
  admin_id: number | null;
  admin_identifier: string;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: string | null;
  changes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [capped, setCapped] = useState(false);

  const fetchLogs = async (query: string) => {
    setIsLoading(true);
    try {
      const q = query.trim();
      const res = await apiFetch(q ? `/api/admin/logs?q=${encodeURIComponent(q)}` : "/api/admin/logs");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.logs;
      setLogs(Array.isArray(rows) ? rows : []);
      setCapped(Boolean(data?.capped));
    } catch {
      toast.error("기록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-serif font-bold text-gray-900">관리자 기록</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {searchTerm.trim()
                ? capped
                  ? "전체 기록 중 일치하는 최근 500건"
                  : "전체 기록"
                : "최근 500건"}
            </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 한 일, 내용"
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-venuea-gold"
            />
          </div>
          <button
            onClick={() => fetchLogs(searchTerm)}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-venuea-dark hover:bg-gray-50 transition-colors"
            title="새로고침"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500">일시</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500">누구</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500">한 일</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500">대상</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500">내용</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-venuea-gold" size={28} />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    {searchTerm.trim() ? "일치하는 기록이 없습니다." : "기록이 없습니다."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-800">
                      {log.admin_identifier}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-venuea-dark text-white">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {log.target_type ? `${log.target_type}${log.target_id ? ` #${log.target_id}` : ""}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      <div>{log.details || "-"}</div>
                      {log.changes && (
                        <code className="block mt-1 text-[11px] text-gray-400 bg-gray-50 p-1.5 rounded border border-gray-100">
                          {log.changes}
                        </code>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      {log.ip_address || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}