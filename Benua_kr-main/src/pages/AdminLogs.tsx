import React, { useState, useEffect } from "react";
import { Activity, Search, Loader2, RefreshCw } from "lucide-react";
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

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/admin/logs");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      toast.error("감사 로그를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      (log.action || "").toLowerCase().includes(q) ||
      (log.admin_identifier || "").toLowerCase().includes(q) ||
      (log.details || "").toLowerCase().includes(q) ||
      (log.target_type || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-venuea-dark text-venuea-gold rounded-xl">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-900">보안 감사 로그</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              관리자 계정 및 보안 키로 수행된 최근 500건의 작업 기록입니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="액션, 식별자, 상세내용 검색..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-venuea-gold"
            />
          </div>
          <button
            onClick={fetchLogs}
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
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  일시
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  관리자 식별자
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  액션
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  대상
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  상세 내역
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  IP 주소
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-venuea-gold" size={28} />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    기록된 감사 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
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