import React, { useEffect, useState } from 'react';
import { 
  Sparkles, Key, AppWindow, Cpu, Clock, Activity, 
  Terminal, CheckCircle2, XCircle, Trash2, Plus, 
  Copy, Check, AlertCircle, RefreshCw, Layers,
  Eye, EyeOff, Play, Lock, BookOpen, ChevronLeft, Info
} from 'lucide-react';
import { 
  listApiClients, createApiClient, updateApiClientStatus, 
  listApiKeys, createApiKey, revokeApiKey, 
  getApiIntegrationStats, listRecentApiRequests, listRecentApiResults,
  testApiHealth, testApiKeyCheck, testApiCalculate,
  ApiClient, ApiKey, ApiRequestLog, ApiResultLog
} from '../../../lib/apiIntegrationsService';
import { useAuth } from '../../../contexts/AuthContext';

export default function IntegrationsSection() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'management' | 'docs' | 'sandbox'>('management');
  
  // Base loading & stats states
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    activeKeys: 0,
    todayRequests: 0,
    todaySuccess: 0,
    todayFailed: 0
  });
  
  // Data lists
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [recentRequests, setRecentRequests] = useState<ApiRequestLog[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientKeys, setClientKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

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
  const [copiedKey, setCopiedKey] = useState(false);

  // Copy-trigger notification tracker
  const [copiedTextType, setCopiedTextType] = useState<string | null>(null);

  // Interactive logs details modal states
  const [selectedRequestLog, setSelectedRequestLog] = useState<ApiRequestLog | null>(null);
  const [selectedResultLog, setSelectedResultLog] = useState<any | null>(null);

  // Sandbox Tester States
  const [sandboxEndpoint, setSandboxEndpoint] = useState<'health' | 'key-check' | 'calculate'>('health');
  const [sandboxApiKey, setSandboxApiKey] = useState('');
  const [showSandboxKey, setShowSandboxKey] = useState(false);
  const [sandboxPayload, setSandboxPayload] = useState(JSON.stringify({
    "requestId": "sandbox-test-001",
    "customer": {
      "birthDate": "1992-02-21",
      "employmentSector": "private",
      "salary": 10000,
      "basicSalary": 7000,
      "housingAllowance": 2000,
      "otherAllowances": 1000,
      "obligations": 1505,
      "employmentDate": "2017-01-01"
    },
    "finance": {
      "type": "real_estate",
      "propertyPrice": 750000,
      "downPayment": 50000,
      "supportType": "none",
      "preferredBank": "alrajhi",
      "termYears": 25
    }
  }, null, 2));

  // Sandbox response displays
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: number; data: any } | null>(null);
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);

  // Fetch Supabase Configuration URL elegantly
  const metaEnv = (import.meta as any).env || {};
  const currentSupabaseUrl = (metaEnv.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co').trim();

  // Load standard data metrics
  const loadStatsAndData = async () => {
    setLoading(true);
    setLoadingResults(true);
    try {
      const statData = await getApiIntegrationStats();
      setStats(statData);
      
      const clientData = await listApiClients();
      setClients(clientData);

      const logs = await listRecentApiRequests();
      setRecentRequests(logs);

      const results = await listRecentApiResults();
      setRecentResults(results);
    } catch (err) {
      console.error('[INTEGRATIONS UI] Failed to load statistics and clients:', err);
    } finally {
      setLoading(false);
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    loadStatsAndData();
  }, [user]);

  // Load client keys dynamically
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
      await loadStatsAndData();
    } catch (err: any) {
      alert('فشل إضافة جهة الربط: ' + (err.message || err));
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleToggleClientStatus = async (client: ApiClient) => {
    const nextStatus = client.status === 'active' ? 'disabled' : 'active';
    try {
      await updateApiClientStatus(client.id, nextStatus);
      await loadStatsAndData();
    } catch (err: any) {
      alert('فشل تعديل حالة جهة الربط: ' + (err.message || err));
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
      
      const statData = await getApiIntegrationStats();
      setStats(statData);
    } catch (err: any) {
      alert('فشل إصدار مفتاح API جديد: ' + (err.message || err));
    } finally {
      setSubmittingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء وتجميد مفتاح الـ API هذا نهائياً؟ لا يمكن الاسترجاع بعد الابطال.')) {
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

  // Clipboard copies
  const triggerCopyText = (text: string, typeName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextType(typeName);
    setTimeout(() => setCopiedTextType(null), 2000);
  };

  // Sandbox runner
  const handleRunSandboxTest = async () => {
    setJsonValidationError(null);
    setTestResult(null);
    setIsTesting(true);

    try {
      if (sandboxEndpoint === 'health') {
        const result = await testApiHealth();
        setTestResult(result);
      } else if (sandboxEndpoint === 'key-check') {
        if (!sandboxApiKey.trim()) {
          setTestResult({ status: 401, data: { success: false, error: "Missing API Key input." } });
          setIsTesting(false);
          return;
        }
        const result = await testApiKeyCheck(sandboxApiKey.trim());
        setTestResult(result);
      } else if (sandboxEndpoint === 'calculate') {
        if (!sandboxApiKey.trim()) {
          setTestResult({ status: 401, data: { success: false, error: "Missing API Key in Authorization header." } });
          setIsTesting(false);
          return;
        }

        // Validate payload is valid JSON before sending
        let parsedPayload: any;
        try {
          parsedPayload = JSON.parse(sandboxPayload);
        } catch (jsonErr: any) {
          setJsonValidationError(`بنية طلب الـ JSON المدخلة تالفة أو تحتوي أخطاء كتابية: ${jsonErr.message}`);
          setIsTesting(false);
          return;
        }

        const result = await testApiCalculate(sandboxApiKey.trim(), parsedPayload);
        setTestResult(result);
      }
    } catch (err: any) {
      setTestResult({ status: 500, data: { success: false, error: err.message || err } });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Upper Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-500" />
            تكاملات الأنظمة الخارجية وبوابة الـ API الحسابية
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            قم بتحضير وإعداد تطبيقات الربط ومفاتيح API المصرحة للمطورين الشركاء لطلب الحسابات المالية التقديرية مباشرة من محرك الحسبة المالي السحابي.
          </p>
        </div>
        
        <button
          onClick={() => loadStatsAndData()}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-805 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-705 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          تحديث السجلات
        </button>
      </div>

      {/* 1. Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">الأنظمة الشريكة</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-2">{stats.totalClients}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">الأنظمة النشطة</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-2 text-emerald-600 dark:text-emerald-400">{stats.activeClients}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">المفاتيح المعتمدة</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-2 text-indigo-600 dark:text-indigo-400">{stats.activeKeys}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">طلبات الاستدعاء اليوم</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-2 text-slate-700 dark:text-slate-300">{stats.todayRequests}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">عمليات مكتملة</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-2 text-emerald-600 dark:text-emerald-450">{stats.todaySuccess}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">عمليات فاشلة/تالفة</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-2 text-rose-500">{stats.todayFailed}</span>
        </div>
      </div>

      {/* Main split dashboard with elegant layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main interactive area (Left Col - 8 span) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Top Section Navigation Tabs */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-2 flex gap-1 shadow-sm">
            <button
              onClick={() => setActiveTab('management')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'management'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                  : 'text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              إدارة الأنظمة والمفاتيح
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'docs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                  : 'text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              توثيق الـ API الفني
            </button>
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'sandbox'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                  : 'text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Play className="w-4 h-4 animate-pulse text-rose-500" />
              مختبر تجارب المطورين (Sandbox)
            </button>
          </div>

          {/* TAB 1: MANAGEMENT */}
          {activeTab === 'management' && (
            <div className="space-y-6">
              
              {/* Clients Box */}
              <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">الجهات والأنظمة المتكاملة (API Clients)</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">الشركاء وال CRM الخارجي المهيأ لإصدار رغبات الاتصال.</p>
                  </div>
                  <button
                    onClick={() => setShowCreateClient(!showCreateClient)}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    تهيئة نظام ربط خارجي
                  </button>
                </div>

                {/* Inline Create Form */}
                {showCreateClient && (
                  <form onSubmit={handleCreateClient} className="mb-5 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">اسم النظام/الجهة الربط</label>
                        <input
                          type="text"
                          required
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="مثال: واجهة مندوب الشركة العقارية الحليفة"
                          className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-700 rounded-lg text-right text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">الحالة المصرحية</label>
                        <select
                          value={newClientStatus}
                          onChange={(e) => setNewClientStatus(e.target.value as 'active' | 'disabled')}
                          className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-700 rounded-lg text-right text-slate-900 dark:text-white"
                        >
                          <option value="active">مفعل / جاهز لتوليد المفاتيح</option>
                          <option value="disabled">معطل مؤقتًا</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">الوصف والغرض العام من الربط</label>
                      <input
                        type="text"
                        value={newClientDesc}
                        onChange={(e) => setNewClientDesc(e.target.value)}
                        placeholder="مثال: يربط تطبيق مندوب مبيعات جدة مباشرة لتقدير قيمة التمويل المتاحة للزبون."
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-700 rounded-lg text-right text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={submittingClient}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-[11px] font-bold rounded-lg transition"
                      >
                        {submittingClient ? 'جاري الحفظ...' : 'حفظ النظام'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateClient(false)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-650 dark:text-slate-300 text-[11px] font-bold rounded-lg transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}

                {/* Clients Table */}
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <Layers className="w-8 h-8 animate-pulse mb-2 text-indigo-400" />
                    <span className="text-[11px]">جاري جلب جهات الربط...</span>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    لا توجد جهات ربط حالياً. قم بإضافة جهة للبدء في توليد مفاتيح الوصول.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500">
                        <tr>
                          <th className="p-3 text-[10px] font-bold rounded-r-lg">النظام الشريك</th>
                          <th className="p-3 text-[10px] font-bold">الحالة</th>
                          <th className="p-3 text-[10px] font-bold">المفاتيح المربوطة</th>
                          <th className="p-3 text-[10px] font-bold">آخر طلب تم تسجيله</th>
                          <th className="p-3 text-[10px] font-bold rounded-l-lg text-center">التصرف المتاح</th>
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
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                    client.status === 'active' 
                                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-50 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {client.status === 'active' ? 'نشط ومصرح' : 'معطل مؤقتاً'}
                                </button>
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300 font-bold">
                                {client.active_keys_count ?? 0} نشط / {client.keys_count ?? 0} إجمالي
                              </td>
                              <td className="p-3 text-[10px] text-slate-500">
                                {client.last_used_at ? new Date(client.last_used_at).toLocaleDateString('ar-SA') + ' - ' + new Date(client.last_used_at).toLocaleTimeString('ar-SA') : 'لم يستعلم تالياً'}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  className="px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-350 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedClientId(client.id);
                                  }}
                                >
                                  إدارة المفاتيح الكودية
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

              {/* Client keys box */}
              {selectedClientId && (
                <div className="bg-white dark:bg-slate-800 border border-indigo-150/40 dark:border-indigo-900/40 rounded-2xl p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-905 dark:text-white flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-indigo-500" />
                        مفاتيح الـ API لجهة الربط: <span className="text-indigo-600 dark:text-indigo-455 font-bold">{clients.find(c => c.id === selectedClientId)?.name}</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">يمكنك توليد وتجميد المفاتيح في الوقت الحقيقي.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-150 dark:border-slate-800">
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
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-[11px] font-black rounded-xl transition cursor-pointer"
                      >
                        {submittingKey ? 'جاري إصدار مفتاح...' : 'توليد مفتاح جديد'}
                      </button>
                    </div>
                  </div>

                  {loadingKeys ? (
                    <div className="py-8 text-center text-xs text-slate-400">جاري جلب المفاتيح من السيرفر الأمني...</div>
                  ) : clientKeys.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                      لا توجد مفاتيح وصول نشطة حالياً لهذا الشريك. انقر توليد مفتاح لتمكين الوصول الخارجي.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientKeys.map((key) => (
                        <div 
                          key={key.id} 
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                            key.status === 'active' 
                              ? 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800'
                              : 'bg-slate-100/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-850/40 opacity-55'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono font-bold bg-white dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-150 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                                {key.key_prefix}************************
                              </code>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                key.status === 'active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'
                              }`}>
                                {key.status === 'active' ? 'نشط' : 'ملغى وتالف'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                تاريخ التوليد: {new Date(key.created_at).toLocaleString('ar-SA')}
                              </span>
                              <span>•</span>
                              <span>الحد الأقصى لليوم الواحد: {key.daily_limit} استدعاء</span>
                              {key.last_used_at && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-505 font-bold">آخر قراءة: {new Date(key.last_used_at).toLocaleString('ar-SA')}</span>
                                </>
                              )}
                              {key.revoked_at && (
                                <>
                                  <span>•</span>
                                  <span className="text-rose-500">تم التعطيل: {new Date(key.revoked_at).toLocaleString('ar-SA')}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {key.status === 'active' && (
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="self-end sm:self-auto flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/10 dark:text-rose-450 text-[10px] font-extrabold rounded-lg border border-rose-100 dark:border-rose-900/40 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              تلف وإبطال المفتاح
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TECHNICAL DOCUMENTATION */}
          {activeTab === 'docs' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-750 pb-3">
                  <Terminal className="w-5 h-5 text-indigo-500" />
                  توثيق واجهة الدخول والأوامر البرمجية للربط (API Reference)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                  تعتمد بوابة HESBA API على حماية الاتصال عبر المفتاح المطور (<code className="bg-slate-50 dark:bg-slate-900 text-indigo-500 p-0.5 px-1 rounded text-[11px]">Authorization: Bearer hsba_live_...</code>).
                  تدرج النتائج تقديرياً بشكل كامل ومحمي دون كشف أي معلومات تمليح أو خوارزمية margin rules أو exception bps أو formula داخلي لفرز الأهلية.
                </p>
                <div className="mt-2 p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
                  ⚠️ <strong>نتائج الـ API وقواعد الاحتساب تقديرية ومؤتمتة وليست موافقة تمويلية نهائية.</strong>
                </div>
              </div>

              {/* Endpoints */}
              <div className="space-y-4">
                
                {/* Health Check Documentation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-7 00 dark:text-slate-205 flex items-center gap-1">
                      <span className="bg-sky-500 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">GET</span>
                      1. اختبار سلامة الاتصال والحالة العامة (Health Check)
                    </span>
                    <button
                      onClick={() => triggerCopyText(`${currentSupabaseUrl}/functions/v1/api-health`, 'health_url')}
                      className="text-[10px] text-slate-400 hover:text-indigo-500 flex items-center gap-1"
                    >
                      {copiedTextType === 'health_url' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      نسخ URL
                    </button>
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-left select-all overflow-x-auto block">
                    {currentSupabaseUrl}/functions/v1/api-health
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block">مثال لنموذج الاستجابة (HTTP 200)</span>
                    <pre className="text-[10.5px] font-mono text-slate-600 dark:text-slate-300 text-left overflow-x-auto">
{`{
  "status": "ok",
  "service": "HESBA Engine",
  "version": "v1"
}`}
                    </pre>
                  </div>
                </div>

                {/* API Key Check Documentation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-205 flex items-center gap-1">
                      <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">GET</span>
                      2. التحقق من صلاحية وجودة مفتاح API (Key Check Verification)
                    </span>
                    <button
                      onClick={() => triggerCopyText(`${currentSupabaseUrl}/functions/v1/api-key-check`, 'key_url')}
                      className="text-[10px] text-slate-400 hover:text-indigo-500 flex items-center gap-1"
                    >
                      {copiedTextType === 'key_url' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      نسخ URL
                    </button>
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-left space-y-1 select-all overflow-x-auto block">
                    <div className="text-emerald-400 font-bold">{currentSupabaseUrl}/functions/v1/api-key-check</div>
                    <div className="text-slate-430">Authorization: Bearer &lt;API_KEY&gt;</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block">مثال لنموذج الاستجابة (HTTP 200)</span>
                    <pre className="text-[10.5px] font-mono text-slate-600 dark:text-slate-300 text-left overflow-x-auto">
{`{
  "success": true,
  "status": "valid",
  "clientId": "771e8cc3-9a3d-4fa0-b53c-f4b9da859ce0",
  "dailyLimit": 100,
  "usedToday": 3,
  "remainingToday": 97
}`}
                    </pre>
                  </div>
                </div>

                {/* API Calculate Documentation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-205 flex items-center gap-1">
                      <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">POST</span>
                      3. إرسال طلب الاحتساب المالي وتصدير العروض (Calculate Core)
                    </span>
                    <button
                      onClick={() => triggerCopyText(`${currentSupabaseUrl}/functions/v1/api-calculate`, 'calc_url')}
                      className="text-[10px] text-slate-400 hover:text-indigo-500 flex items-center gap-1"
                    >
                      {copiedTextType === 'calc_url' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      نسخ URL
                    </button>
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-left space-y-1 select-all overflow-x-auto block">
                    <div className="text-indigo-400 font-bold">{currentSupabaseUrl}/functions/v1/api-calculate</div>
                    <div className="text-slate-430">Authorization: Bearer &lt;API_KEY&gt;</div>
                    <div className="text-slate-430">Content-Type: application/json</div>
                  </div>

                  {/* Body Specs */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center border-b border-rich-white dark:border-slate-800 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 block">بنية البيانات وحقول المدخلات (JSON)</span>
                      <button
                        onClick={() => triggerCopyText(sandboxPayload, 'raw_payload')}
                        className="text-[9px] text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5"
                      >
                        {copiedTextType === 'raw_payload' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                        نسخ كود الطلب
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-300 text-left overflow-x-auto max-h-56 overflow-y-auto">
                      {sandboxPayload}
                    </pre>
                  </div>

                  {/* Response Specs */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 border-b border-rich-white dark:border-slate-800 pb-2 block">بنية الاستجابة للطلب المؤهل (HTTP 200 - Eligible Contract)</span>
                    <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-300 text-left overflow-x-auto max-h-56 overflow-y-auto">
{`{
  "success": true,
  "resultId": "4a1bc1b4-2104-4cc9-b873-5183cc940ea5",
  "requestId": "test-001",
  "eligible": true,
  "status": "eligible",
  "summary": {
    "maxRealEstateFinance": 690000,
    "maxPersonalFinance": 150000,
    "estimatedInstallment": 4200,
    "totalAvailable": 840000,
    "propertyGap": 0,
    "recommendedBank": "alrajhi"
  },
  "banks": [
    {
      "bankId": "alrajhi",
      "bankName": "مصرف الراجحي",
      "eligible": true,
      "status": "approved",
      "realEstateFinance": 690000,
      "personalFinance": 150000,
      "totalAvailable": 840000,
      "estimatedInstallment": 4200,
      "termMonths": 300
    }
  ],
  "notes": [
    "هذه النتيجة تقديرية وليست موافقة تمويلية نهائية."
  ]
}`}
                    </pre>
                  </div>

                  {/* cURL specs */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center border-b border-rich-white dark:border-slate-800 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 block">الطلب عبر سطر الأوامر (cURL Example)</span>
                      <button
                        onClick={() => triggerCopyText(`curl -X POST "${currentSupabaseUrl}/functions/v1/api-calculate" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "test-001",
    "customer": {
      "birthDate": "1992-02-21",
      "employmentSector": "private",
      "salary": 10000
    },
    "finance": {
      "type": "real_estate",
      "propertyPrice": 750000,
      "downPayment": 50000
    }
  }'`, 'curl_snippet')}
                        className="text-[9px] text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5"
                      >
                        {copiedTextType === 'curl_snippet' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                        نسخ cURL Command
                      </button>
                    </div>
                    <pre className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 text-left overflow-x-auto whitespace-pre-wrap select-all">
{`curl -X POST "${currentSupabaseUrl}/functions/v1/api-calculate" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "test-001",
    "customer": {
      "birthDate": "1992-02-21",
      "employmentSector": "private",
      "salary": 10000
    },
    "finance": {
      "type": "real_estate",
      "propertyPrice": 750000,
      "downPayment": 50000
    }
  }'`}
                    </pre>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE SANDBOX TESTER */}
          {activeTab === 'sandbox' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-5">
              <div>
                <h2 className="text-base font-black text-slate-905 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-755 pb-3">
                  <Play className="w-5 h-5 text-indigo-505 animate-pulse" />
                  مختبر تجارب الطلبات التفاعلي (Live Sandbox Tester)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  اختبر الاتصال المباشر وسلامة صياغة الـ JSON بنقرات تجريبية آمنة دون تخزين المفاتيح في المتصفح أو حفظها محلياً.
                </p>
              </div>

              {/* Security Header badge */}
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>المعايير الأمنية مطبقة:</strong> لا يتم حفظ مفتاح API في الـ localStorage أو sessionStorage ولا توجد أي استثمارات للتخزين الخارجي.
                </span>
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                
                {/* Endpoint Selection */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-400 mb-1.5">ارتباط نقطة الهبوط (Choose Endpoint):</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSandboxEndpoint('health')}
                      className={`py-2 text-[11px] font-bold border rounded-lg transition ${
                        sandboxEndpoint === 'health'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-650 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-extrabold'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650 dark:bg-slate-805 dark:border-slate-705 dark:text-slate-350'
                      }`}
                    >
                      api-health (دون مفتاح)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxEndpoint('key-check')}
                      className={`py-2 text-[11px] font-bold border rounded-lg transition ${
                        sandboxEndpoint === 'key-check'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-650 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-extrabold'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650 dark:bg-slate-805 dark:border-slate-705 dark:text-slate-350'
                      }`}
                    >
                      api-key-check (يتطلب مفتاح)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxEndpoint('calculate')}
                      className={`py-2 text-[11px] font-bold border rounded-lg transition ${
                        sandboxEndpoint === 'calculate'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-650 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-extrabold'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650 dark:bg-slate-805 dark:border-slate-705 dark:text-slate-350'
                      }`}
                    >
                      api-calculate (يتطلب مفتاح + مدخلات)
                    </button>
                  </div>
                </div>

                {/* API Key Entry Box (if needed) */}
                {sandboxEndpoint !== 'health' && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-[10.5px] font-bold text-slate-400">مفتاح المطور (Authorization Header API Key):</label>
                      <button
                        type="button"
                        onClick={() => setShowSandboxKey(!showSandboxKey)}
                        className="text-[9px] text-indigo-550 flex items-center gap-0.5"
                      >
                        {showSandboxKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showSandboxKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showSandboxKey ? "text" : "password"}
                        value={sandboxApiKey}
                        onChange={(e) => setSandboxApiKey(e.target.value)}
                        placeholder="hsba_live_cbc6ea5..."
                        className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-700 rounded-xl text-right text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Request Payload Textarea (if calculate) */}
                {sandboxEndpoint === 'calculate' && (
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">حمولة الطلب الحسابي ومواصفات الزبون (Request Body Payload - JSON):</label>
                    <textarea
                      value={sandboxPayload}
                      onChange={(e) => setSandboxPayload(e.target.value)}
                      rows={10}
                      className="w-full text-xs font-mono p-3 bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 text-left"
                    ></textarea>
                    {jsonValidationError && (
                      <div className="mt-1 text-xs text-rose-500 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {jsonValidationError}
                      </div>
                    )}
                  </div>
                )}

                {/* Execution and Reset state */}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleRunSandboxTest}
                    disabled={isTesting}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Play className="w-4 h-4" />
                    {isTesting ? 'جاري الاستدعاء السحابي...' : 'إرسال واستدعاء الطلب تجريبياً'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSandboxApiKey('');
                      setShowSandboxKey(false);
                      setTestResult(null);
                      setJsonValidationError(null);
                    }}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-650 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
                  >
                    إعادة ضبط
                  </button>
                </div>

                {/* Response Visualizer */}
                {testResult && (
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">نتيجة الاستجابة السيرفر المباشرة:</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-bold text-slate-500">حالة الاستدعاء HTTP:</span>
                        <span className={`px-2 py-0.5 rounded-full font-mono font-bold ${
                          testResult.status >= 200 && testResult.status < 300
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:border-emerald-900/35'
                            : 'bg-rose-50 text-rose-500 border border-rose-100 dark:border-rose-900/35'
                        }`}>
                          {testResult.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-left overflow-x-auto">
                      <pre className="text-[11px] font-mono text-indigo-300 leading-relaxed max-h-72 overflow-y-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Activity requests log (Recent requests) */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-750 pb-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                سجل استدعاء الطلبات المدخلة (API Request Logs)
              </h2>
              <button
                onClick={loadStatsAndData}
                className="text-[10px] text-indigo-500 hover:text-indigo-650 flex items-center gap-0.5"
              >
                {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                تحديث
              </button>
            </div>

            {recentRequests.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                لا توجد طلبات استدعاء للـ API بعد. قم بتجربة الـ Sandbox لمحاكاة المدخلات.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500">
                    <tr>
                      <th className="p-2 text-[10px] font-bold rounded-r-lg">الجهة</th>
                      <th className="p-2 text-[10px] font-bold">معرف الطلب</th>
                      <th className="p-2 text-[10px] font-bold text-center">الحالة الكودية</th>
                      <th className="p-2 text-[10px] font-bold text-center">المدة</th>
                      <th className="p-2 text-[10px] font-bold">التوقيت والتاريخ</th>
                      <th className="p-2 text-[10px] font-bold rounded-l-lg text-center">تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition">
                        <td className="p-2 font-bold text-slate-900 dark:text-white">
                          {req.client_name ?? 'عام'}
                        </td>
                        <td className="p-2 font-mono text-slate-500 text-[11px]">
                          {req.external_request_id || req.id.substring(0, 8) + '...'}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            req.status === 'success' || req.status === 'completed' || req.status === 'received'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:border-emerald-900/10 dark:bg-emerald-950/20'
                              : req.status === 'validation_error'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:border-amber-900/10'
                              : 'bg-rose-50 text-rose-500 border border-rose-100 dark:border-rose-900/10'
                          }`}>
                            {req.status === 'success' || req.status === 'completed' || req.status === 'received' ? (
                              'مكتملة بنجاح'
                            ) : req.status === 'validation_error' ? (
                              'خطأ في التحقق'
                            ) : (
                              'فشل/خطأ في المحرك'
                            )}
                          </span>
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-500">
                          {req.duration_ms ? `${req.duration_ms} ms` : '-'}
                        </td>
                        <td className="p-2 text-[10px] text-slate-400">
                          {new Date(req.created_at).toLocaleString('ar-SA')}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setSelectedRequestLog(req)}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-650 hover:bg-slate-200 text-[9px] font-bold rounded cursor-pointer"
                          >
                            عرض البيانات
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity results log (Recent results) */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-755 pb-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-500" />
                آخر مخرجات العمليات والنتائج المصدرة (Sanitized API Calculation Results)
              </h2>
              <button
                onClick={loadStatsAndData}
                className="text-[10px] text-indigo-505 hover:text-indigo-650"
              >
                تحديث النتائج
              </button>
            </div>

            {loadingResults ? (
              <div className="py-6 text-center text-slate-405 text-xs animate-pulse">جاري تحميل مخرجات النتائج...</div>
            ) : recentResults.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                لا توجد نتائج API حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500">
                    <tr>
                      <th className="p-2 text-[10px] font-bold rounded-r-lg">اسم الشريك</th>
                      <th className="p-2 text-[10px] font-bold">الحالة المالية</th>
                      <th className="p-2 text-[10px] font-bold">البنك الموصى به</th>
                      <th className="p-2 text-[10px] font-bold text-center">إجمالي التمويل</th>
                      <th className="p-2 text-[10px] font-bold text-center">القسط الشهري</th>
                      <th className="p-2 text-[10px] font-bold">المدة المستغرقة</th>
                      <th className="p-2 text-[10px] font-bold rounded-l-lg text-center">الأداة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentResults.map((result) => {
                      const payload = result.result_payload || {};
                      const isEligible = payload.eligible;
                      const summary = payload.summary || {};
                      
                      return (
                        <tr key={result.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition">
                          <td className="p-2 font-bold text-slate-900 dark:text-white">
                            {result.client_name ?? 'عام'}
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              isEligible
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                                : 'bg-rose-50 text-rose-500 dark:bg-rose-950/20'
                            }`}>
                              {isEligible ? 'مؤهل تمويلياً' : 'غير متطابق / غير مؤهل'}
                            </span>
                          </td>
                          <td className="p-2 font-bold text-slate-700 dark:text-slate-300">
                            {summary.recommendedBank === 'alrajhi' ? 'مصرف الراجحي' : summary.recommendedBank || '-'}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {summary.totalAvailable ? `${summary.totalAvailable.toLocaleString('ar-SA')} ريال` : '0'}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600">
                            {summary.estimatedInstallment ? `${summary.estimatedInstallment.toLocaleString('ar-SA')} ر.س/ش` : '0'}
                          </td>
                          <td className="p-2 font-mono text-slate-400 text-[11px]">
                            {result.duration_ms ? `${result.duration_ms} ms` : '-'}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => setSelectedResultLog(result)}
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-750 text-slate-655 font-bold hover:bg-slate-200 hover:text-black rounded text-[9px] cursor-pointer"
                            >
                              تفاصيل العرض
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

        </div>

        {/* SIDEBAR COL: System parameters, warning, Security Practices (Right Col - 4 span) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Informational Notice */}
          <div className="bg-indigo-950 text-indigo-100 rounded-2xl p-5 shadow-sm space-y-3 border border-indigo-900">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5 pb-2 border-b border-indigo-900">
              <Info className="w-5 h-5 text-indigo-400" />
              أطر الربط والـ API الآمنة
            </h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              يدعم خادم ربط بيئة <strong>HESBA API</strong> الاندماج الفوري مع بوابات التقديم المالي دون إبراز الأرقام الحساسة والملح الداخلي.
            </p>
            <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-1">
              <li>معدلات DSR غير قابلة للاستخراج الخارجي.</li>
              <li>تفاصيل هوامش وأرباح البنوك مشفرة.</li>
              <li>التحقق من الكيانات محمي بRLS أمني صارم.</li>
              <li>تسجيل فوري لسرعة الاستراد بالأجزاء من الثانية.</li>
            </ul>
          </div>

          {/* System Audit Standard Card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-905 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-505" />
              معايير وحواجز الأمان (Information Security Barriers)
            </h3>
            <div className="space-y-2 text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <p>
                🔒 <strong>فصل الهياكل الكلي:</strong> لا يتم حفظ مفاتيح API في قواعد البيانات بطريقة النص العادي (Plain Text). يتم استخدام تشفير بصمي بـ <code className="bg-slate-50 dark:bg-slate-900 text-indigo-500 p-0.5 px-1 rounded text-[10px]">SHA-256</code> ومجهول مع مفتاح pepper مشفر بالكامل.
              </p>
              <p>
                ⚡ <strong>تطهير كلي للمخرجات:</strong> المخرج آمن وخالٍ من diagnostics الداخلي أو صيغ التامينات والمعادلات الإستراتيجية.
              </p>
              <p>
                ⚖️ <strong>الحد اليومي الصارم:</strong> يحظر محرك الربط أي طلب يتجاوز الحد المخصص يومياً للعميل حماية للطلب واستدامة للخادم.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: Display raw key reveal once only (as is) */}
      {rawKeyToShow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 max-w-md w-full text-right shadow-2xl relative">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/30">
              <Key className="w-6 h-6 animate-bounce" />
            </div>

            <h3 className="text-center text-sm font-black text-slate-900 dark:text-white mb-2 font-heading">
              تم توليد مفتاح الـ API بنجاح!
            </h3>
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              انسخ هذا المفتاح الآن واحتفظ به في مكان آمن. لأسباب حماية وسرية تامة، <span className="font-extrabold text-indigo-600 dark:text-indigo-400">لن تتمكن من رؤيته مطلقاً مرة أخرى</span> بعد مغادرة الصفحة.
            </p>

            {/* Simulated terminal block with copy action */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 mb-5">
              <code className="text-[11px] font-mono break-all text-slate-900 dark:text-white select-all text-left block flex-1">
                {rawKeyToShow}
              </code>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rawKeyToShow);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-705 shrink-0 transition cursor-pointer"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setRawKeyToShow(null)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition shadow-md cursor-pointer text-center"
            >
              فهمت ذلك، قمت بنسخ وحفظ المفتاح
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Request Payload JSON Modal */}
      {selectedRequestLog && (
        <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 max-w-xl w-full text-right shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-rich-white dark:border-slate-700 pb-3 mb-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-500" />
                تفاصيل بيانات الطلب الوارد المنقولة (API Request Payload)
              </h3>
              <button
                onClick={() => setSelectedRequestLog(null)}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-655 text-slate-500 font-bold rounded-lg cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-left overflow-x-auto">
              <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed max-h-96 overflow-y-auto">
                {JSON.stringify(selectedRequestLog.request_payload, null, 2)}
              </pre>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => triggerCopyText(JSON.stringify(selectedRequestLog.request_payload, null, 2), 'log_payload')}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {copiedTextType === 'log_payload' ? 'تم نسخ الطلب!' : 'نسخ كود الـ Payload'}
              </button>
              <button
                onClick={() => setSelectedRequestLog(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Result Payload JSON Modal */}
      {selectedResultLog && (
        <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 max-w-xl w-full text-right shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-rich-white dark:border-slate-700 pb-3 mb-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-500" />
                العروض والنتائج المنظفة المصدرة (Sanitized API Calculation Results)
              </h3>
              <button
                onClick={() => setSelectedResultLog(null)}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-655 text-slate-500 font-bold rounded-lg cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-left overflow-x-auto">
              <pre className="text-[11px] font-mono text-indigo-300 leading-relaxed max-h-96 overflow-y-auto">
                {JSON.stringify(selectedResultLog.result_payload || {}, null, 2)}
              </pre>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => triggerCopyText(JSON.stringify(selectedResultLog.result_payload || {}, null, 2), 'log_result')}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {copiedTextType === 'log_result' ? 'تم نسخ مخرج النتيجة!' : 'نسخ كود النتائج المنظفة'}
              </button>
              <button
                onClick={() => setSelectedResultLog(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
