import React, { useEffect, useState } from 'react';
import { 
  Sparkles, Key, AppWindow, Cpu, Clock, Activity, 
  Terminal, CheckCircle2, XCircle, Trash2, Plus, 
  Copy, Check, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { 
  listApiClients, createApiClient, updateApiClientStatus, 
  listApiKeys, createApiKey, revokeApiKey, 
  getApiIntegrationStats, listRecentApiRequests, 
  ApiClient, ApiKey, ApiRequestLog 
} from '../../../lib/apiIntegrationsService';
import { useAuth } from '../../../contexts/AuthContext';

export default function IntegrationsSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    activeKeys: 0,
    todayRequests: 0,
    todaySuccess: 0,
    todayFailed: 0
  });
  
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [recentRequests, setRecentRequests] = useState<ApiRequestLog[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientKeys, setClientKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  
  // Create client form state
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDesc, setNewClientDesc] = useState('');
  const [newClientStatus, setNewClientStatus] = useState<'active' | 'disabled'>('active');
  const [submittingClient, setSubmittingClient] = useState(false);
  
  // Create key state
  const [dailyLimit, setDailyLimit] = useState(100);
  const [submittingKey, setSubmittingKey] = useState(false);
  
  // Key Modal (Show Raw Key Once)
  const [rawKeyToShow, setRawKeyToShow] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load everything
  const loadStatsAndClients = async () => {
    setLoading(true);
    try {
      // 1. Load Stats
      const statData = await getApiIntegrationStats();
      setStats(statData);
      
      // 2. Load Clients
      const clientData = await listApiClients();
      setClients(clientData);

      // 3. Load Recent request log
      const logs = await listRecentApiRequests();
      setRecentRequests(logs);
    } catch (err) {
      console.error('[INTEGRATIONS UI] Failed to initial load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatsAndClients();
  }, [user]);

  // Load keys when client selection changes
  useEffect(() => {
    if (selectedClientId) {
      loadClientKeys(selectedClientId);
    } else {
      setClientKeys([]);
    }
  }, [selectedClientId]);

  const loadClientKeys = async (cid: string) => {
    setLoadingKeys(true);
    try {
      const keys = await listApiKeys(cid);
      setClientKeys(keys);
    } catch (err) {
      console.error('[INTEGRATIONS UI] Error loading client keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setSubmittingClient(true);
    try {
      await createApiClient(
        newClientName.trim(),
        newClientDesc.trim(),
        newClientStatus,
        user?.id
      );
      setNewClientName('');
      setNewClientDesc('');
      setNewClientStatus('active');
      setShowCreateClient(false);
      await loadStatsAndClients();
    } catch (err: any) {
      alert('فشل إضافة العميل: ' + (err.message || err));
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleToggleClientStatus = async (client: ApiClient) => {
    const nextStatus = client.status === 'active' ? 'disabled' : 'active';
    try {
      await updateApiClientStatus(client.id, nextStatus);
      await loadStatsAndClients();
    } catch (err: any) {
      alert('فشل تعديل حالة العميل: ' + (err.message || err));
    }
  };

  const handleCreateApiKey = async () => {
    if (!selectedClientId) return;
    setSubmittingKey(true);
    try {
      const result = await createApiKey(selectedClientId, dailyLimit, user?.id);
      setRawKeyToShow(result.rawKey);
      setDailyLimit(100);
      await loadClientKeys(selectedClientId);
      
      // Refresh general stats to count new key
      const statData = await getApiIntegrationStats();
      setStats(statData);
    } catch (err: any) {
      alert('فشل إصدار مفتاح API جديد: ' + (err.message || err));
    } finally {
      setSubmittingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء وتجميد مفتاح الـ API هذا نهائياً؟ لا يمكن التراجع عن هذه العملية.')) {
      return;
    }
    try {
      await revokeApiKey(keyId);
      if (selectedClientId) {
        await loadClientKeys(selectedClientId);
      }
      const statData = await getApiIntegrationStats();
      setStats(statData);
    } catch (err: any) {
      alert('فشل إلغاء المفتاح: ' + (err.message || err));
    }
  };

  const handleCopy = () => {
    if (!rawKeyToShow) return;
    navigator.clipboard.writeText(rawKeyToShow);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-500" />
            التكاملات وبوابات الربط البرمجي / API
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            قم بتحضير وإعداد تطبيقات الربط ومفاتيح API الخاصة بالمطورين كخطوة استباقية لتهيئة محرك الحسبة المالي للاستخدام عبر الأنظمة الخارجية والأنظمة الشريكة المتوافقة.
          </p>
        </div>
        
        <button
          onClick={() => loadStatsAndClients()}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-705 rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث البيانات
        </button>
      </div>

      {/* 1. Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">إجمالي الأنظمة</span>
          <span className="text-xl font-black text-slate-905 dark:text-white mt-2">{stats.totalClients}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">الأنظمة النشطة</span>
          <span className="text-xl font-black text-slate-905 dark:text-white mt-2 text-emerald-600 dark:text-emerald-400">{stats.activeClients}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">مفاتيح API نشطة</span>
          <span className="text-xl font-black text-slate-905 dark:text-white mt-2 text-indigo-600 dark:text-indigo-400">{stats.activeKeys}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">طلبات اليوم</span>
          <span className="text-xl font-black text-slate-905 dark:text-white mt-2 text-slate-700 dark:text-slate-300">{stats.todayRequests}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">سجل ناجح</span>
          <span className="text-xl font-black text-slate-905 dark:text-white mt-2 text-emerald-600 dark:text-emerald-400">{stats.todaySuccess}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">طلبات مرفوضة</span>
          <span className="text-xl font-black text-slate-905 dark:text-white mt-2 text-rose-500">{stats.todayFailed}</span>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RIGHT TWO COLS: Client list, forms and configuration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Client box */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">الجهات والأنظمة المتكاملة (API Clients)</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">إدارة البوابات والجهات المصرح لها طلب حسبة معينة</p>
              </div>
              <button
                onClick={() => setShowCreateClient(!showCreateClient)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة تطبيق ربط جديد
              </button>
            </div>

            {/* Create Client Dialog / Form inline */}
            {showCreateClient && (
              <form onSubmit={handleCreateClient} className="mb-5 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم النظام/الجهة الربط</label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="مثال: نظام مبيعات الـ CR 5"
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-lg text-right text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الحالة الإدارية</label>
                    <select
                      value={newClientStatus}
                      onChange={(e) => setNewClientStatus(e.target.value as 'active' | 'disabled')}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-lg text-right text-slate-900 dark:text-white"
                    >
                      <option value="active">نشط / مصرح بالطلب</option>
                      <option value="disabled">معطل مؤقتًا</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">الوصف العام / الغرض من التكامل</label>
                  <input
                    type="text"
                    value={newClientDesc}
                    onChange={(e) => setNewClientDesc(e.target.value)}
                    placeholder="مثال: لحساب شروط الـ DSR وهوامش الربح المتغيرة مباشرة للمناديب"
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-lg text-right text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submittingClient}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-[11px] font-bold rounded-lg transition"
                  >
                    {submittingClient ? 'جاري الحفظ...' : 'تأكيد الحفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateClient(false)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {/* Clients Table */}
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <Layers className="w-8 h-8 animate-pulse mb-2 text-indigo-400" />
                <span className="text-[11px]">جاري تحميل الجهات والأنظمة...</span>
              </div>
            ) : clients.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                لا توجد جهات ربط حالياً. قم بإضافة واحد للبدء.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500">
                    <tr>
                      <th className="p-3 text-[10px] font-bold rounded-r-lg">الجهة / التطبيق</th>
                      <th className="p-3 text-[10px] font-bold">الحالة</th>
                      <th className="p-3 text-[10px] font-bold">المفاتيح المربوطة</th>
                      <th className="p-3 text-[10px] font-bold">تاريخ آخر استخدام</th>
                      <th className="p-3 text-[10px] font-bold rounded-l-lg text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {clients.map((client) => {
                      const isSelected = selectedClientId === client.id;
                      return (
                        <tr 
                          key={client.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition cursor-pointer ${
                            isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                          }`}
                          onClick={() => setSelectedClientId(client.id)}
                        >
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              {client.name}
                            </div>
                            {client.description && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{client.description}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleClientStatus(client);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                client.status === 'active' 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {client.status === 'active' ? 'نشط' : 'معطل'}
                            </button>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-350">
                            {client.active_keys_count ?? 0} مفتاح نشط / {client.keys_count ?? 0} إجمالي
                          </td>
                          <td className="p-3 text-[10px] text-slate-500 dark:text-slate-400">
                            {client.last_used_at ? new Date(client.last_used_at).toLocaleDateString('ar-SA') : 'لا توجد طلبات'}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              className="px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-350 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 rounded-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClientId(client.id);
                              }}
                            >
                              إدارة المفاتيح
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Key management panel */}
          {selectedClientId && (
            <div className="bg-white dark:bg-slate-800 border border-indigo-150/40 dark:border-indigo-900/40 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-105/50 dark:border-slate-800 pb-4 mb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-indigo-500" />
                    مفاتيح API للنظام المختار: {clients.find(c => c.id === selectedClientId)?.name}
                  </h3>
                  <p className="text-[10px] text-slate-450">إصدار أو تعطيل الرموز البرمجية للاستدعاء الخارجي.</p>
                </div>
                
                {/* Generate form state */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] text-slate-400 shrink-0">الحد اليومي:</label>
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value))}
                      className="w-14 text-xs font-mono font-bold bg-transparent border-none text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleCreateApiKey()}
                    disabled={submittingKey}
                    className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-[11px] font-black rounded-lg transition"
                  >
                    {submittingKey ? 'جاري التوليد...' : 'إصدار مفتاح جديد'}
                  </button>
                </div>
              </div>

              {loadingKeys ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">جاري تحميل المفاتيح الأمنية...</div>
              ) : clientKeys.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-405">
                  لا توجد مفاتيح نشطة حالياً لهذا النظام المبيعات.
                </div>
              ) : (
                <div className="space-y-3">
                  {clientKeys.map((key) => (
                    <div 
                      key={key.id} 
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        key.status === 'active' 
                          ? 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800'
                          : 'bg-slate-100/50 dark:bg-slate-900/10 border-slate-205 dark:border-slate-850/40 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-705 text-indigo-600 dark:text-indigo-400">
                            {key.key_prefix}************************
                          </code>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            key.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-50 dark:bg-rose-900/10 text-rose-500'
                          }`}>
                            {key.status === 'active' ? 'نشط ومصرح' : 'ملغى وتالف'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[10px] text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            تم الإنشاء: {new Date(key.created_at).toLocaleString('ar-SA')}
                          </span>
                          <span>•</span>
                          <span>الحد اليومي للطلبات: {key.daily_limit} مرة</span>
                          {key.last_used_at && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-500">آخر استخدام: {new Date(key.last_used_at).toLocaleString('ar-SA')}</span>
                            </>
                          )}
                          {key.revoked_at && (
                            <>
                              <span>•</span>
                              <span className="text-rose-500">تم الإلغاء في: {new Date(key.revoked_at).toLocaleString('ar-SA')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {key.status === 'active' && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="self-end sm:self-auto flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 text-[10px] font-bold rounded-lg border border-rose-100 dark:border-rose-900/30 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          إلغاء وتلف المفتاح
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent API logs */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
              أحدث سجلات الاستدعاء الحسابي الخارجي (API Calculation Requests)
            </h2>
            <p className="text-[10px] text-slate-450 mb-3">تفاصيل العمليات الموجهة بالكامل لمحرك الحسبة في الزمن الحقيقي.</p>

            {recentRequests.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                لا توجد طلبات API حتى الآن. مفاتيح الـ API المتوفرة تخدم الهوية الإدارية المسبقة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500">
                    <tr>
                      <th className="p-2 text-[10px] font-bold rounded-r-lg">الجهة الطالبة</th>
                      <th className="p-2 text-[10px] font-bold">معرف الطلب الخارجي</th>
                      <th className="p-2 text-[10px] font-bold text-center">الحالة</th>
                      <th className="p-2 text-[10px] font-bold">زمن الاستجابة</th>
                      <th className="p-2 text-[10px] font-bold rounded-l-lg">الوقت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/5 transition">
                        <td className="p-2 font-bold text-slate-909 dark:text-white">
                          {req.client_name ?? 'عام'}
                        </td>
                        <td className="p-2 font-mono text-slate-500 text-[11px]">
                          {req.external_request_id || req.id.substring(0, 8) + '...'}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === 'success' || req.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-rose-50 text-rose-500'
                          }`}>
                            {req.status === 'success' || req.status === 'completed' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                مكتملة
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                خطأ
                              </>
                            )}
                          </span>
                          {req.error_message && (
                            <div className="text-[9px] text-rose-450 mt-0.5 max-w-xs">{req.error_message}</div>
                          )}
                        </td>
                        <td className="p-2 font-mono font-bold text-slate-600 dark:text-slate-405">
                          {req.duration_ms ? `${req.duration_ms} ms` : '-'}
                        </td>
                        <td className="p-2 text-[10px] text-slate-400">
                          {new Date(req.created_at).toLocaleString('ar-SA')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* LEFT ONE COL: API Documentation, Guidelines and Key-Reveal Overlay Modals */}
        <div className="space-y-6">
          
          {/* Documentation Card instructions and quick view */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-indigo-100 shadow-md">
            <h2 className="text-sm font-black text-white mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <Terminal className="w-4.5 h-4.5 text-indigo-400" />
              وثائق الاستدعاء المالي والتحقق (Phase 3)
            </h2>
            
            <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
              يمكن استخدام نقاط النهاية (Endpoints) التالية لاختبار سلامة الاتصال، التحقق من المفاتيح، والربط التجريبي الهيكلي:
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[9px] text-indigo-300 block">1. اختبار سلامة النظام واستقراره (Health Check):</span>
                <div className="bg-black/40 rounded-xl p-3 border border-slate-800/80 font-mono text-[10.5px] text-left select-all overflow-x-auto block">
                  <span className="text-sky-400 font-bold block">GET /functions/v1/api-health</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-indigo-300 block">2. التحقق من مفتاح الـ API وصلاحيته (Key Check):</span>
                <div className="bg-black/40 rounded-xl p-3 border border-slate-800/80 font-mono text-[10.5px] text-left space-y-1.5 select-all overflow-x-auto block">
                  <span className="text-emerald-400 font-bold block">GET /functions/v1/api-key-check</span>
                  <span className="text-slate-400 block">Authorization: Bearer <span className="text-indigo-300">&lt;API_KEY&gt;</span></span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-indigo-300 block">3. الربط البرمجي السحابي والتحقق من المدخلات (Calculate Request):</span>
                <div className="bg-black/40 rounded-xl p-3 border border-slate-800/80 font-mono text-[10.5px] text-left space-y-1.5 select-all overflow-x-auto block">
                  <span className="text-purple-400 font-bold block">POST /functions/v1/api-calculate</span>
                  <span className="text-slate-400 block">Authorization: Bearer <span className="text-indigo-300">&lt;API_KEY&gt;</span></span>
                  <span className="text-slate-400 block">Content-Type: application/json</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed mt-4">
              نموذج الاستجابة للطلب المستلم بنجاح (202 Accepted):
            </p>

            <div className="bg-black/40 rounded-xl p-3 border border-slate-800/80 font-mono text-[10px] text-left text-indigo-200 select-all overflow-x-auto max-h-40 overflow-y-auto mt-2">
{`{
  "success": true,
  "status": "accepted",
  "message": "تم قبول الطلب والتحقق من المفتاح. سيتم تفعيل الحساب الفعلي في المرحلة التالية.",
  "requestId": "external-id-optional",
  "internalRequestId": "uuid-of-request",
  "notes": [
    "Endpoint الحساب في وضع التحضير ولا يعيد نتيجة تمويل فعلية حالياً.",
    "هذه النتيجة لا تمثل موافقة تمويلية."
  ]
}`}
            </div>
            
            <div className="mt-5 p-3.5 bg-indigo-950/40 border border-indigo-900/40 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-350 leading-relaxed">
                <span className="font-extrabold text-white block mb-0.5">ملاحظة تنظيمية حاسمة:</span>
                Endpoint الحساب يستقبل الطلبات ويتحقق منها ويسجلها قياساً فقط. سيتم تفعيل الاحتساب المالي الفعلي والمباشر في المرحلة التالية للربط.
              </p>
            </div>
          </div>

          {/* Secure practices Card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              معايير الأمان والتحقق (Phase 3)
            </h3>
            <ul className="text-[10px] text-slate-500 dark:text-slate-400 list-disc list-inside space-y-2 leading-relaxed">
              <li>
                <strong>تنشئة وتشفير سحابي:</strong> يتم توليد وتشفير وتمليح المفاتيح سحابياً عبر Supabase Edge Functions دون مرور المفاتيح الخام بالمتصفح، وحفظ البصمة بخوارزمية <code className="bg-slate-50 dark:bg-slate-900 text-indigo-500 p-0.5 rounded">HMAC-SHA256</code> مع Pepper سرّي.
              </li>
              <li>
                <strong>الكشف لمرة واحدة:</strong> يظهر المفتاح الأصلي لمرة واحدة عند التوليد فقط لحصر الاختراقات الأمنية بنسبة 100%.
              </li>
              <li>
                <strong>حظر الصلاحيات الافتراضي:</strong> تم تدعيم RLS Policies الصارمة بما يحصر تعديلات وقراءة هذه الهويات بمسؤولي الحسبة الأساسيين فقط.
              </li>
              <li>
                <strong>فحص هيكلي للمدخلات:</strong> يتم فحص سلامة وتصنيف كل طلب برمجي بدقة لضمان معايير الحقول والمدخلات السليمة قبل قبول العملية.
              </li>
              <li>
                <strong>مراقبة وضبط الاستهلاك اليومي:</strong> تدعم السياسات والوظائف السحابية فحص وتتبع حدود الطلبات القصوى واليومية لكل مفتاح منفرد لمنع التغراق والهجمات.
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* 2. Modal Key Reveal (Show Raw Key Once Only) */}
      {rawKeyToShow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 max-w-md w-full text-right shadow-2xl relative">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/30">
              <Key className="w-6 h-6 animate-bounce" />
            </div>

            <h3 className="text-center text-sm font-black text-slate-900 dark:text-white mb-2">
              تم توليد مفتاح الـ API بنجاح!
            </h3>
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed mb-5">
              انسخ هذا المفتاح الآن واحتفظ به في مكان آمن. لأسباب أمنية حماية وسرية تامة، <span className="font-extrabold text-indigo-600 dark:text-indigo-400">لن تتمكن من رؤيته مرة أخرى</span> بعد إغلاق هذه النافذة.
            </p>

            {/* Simulated terminal block with copy action */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 mb-5">
              <code className="text-[11px] font-mono break-all text-slate-900 dark:text-white select-all text-left block flex-1">
                {rawKeyToShow}
              </code>
              
              <button
                onClick={handleCopy}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-705 shrink-0 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setRawKeyToShow(null)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition shadow-md"
            >
              فهمت ذلك، تم حفظ المفتاح بنجاح
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
