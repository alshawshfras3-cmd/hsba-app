import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle, 
  MessageSquare, 
  PhoneCall, 
  ArrowLeft,
  RefreshCw,
  PlusCircle,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import { useAppState } from '../../context/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CUSTOMER_CONFIG, 
  ADMIN_CONFIG, 
  Message, 
  Suggestion,
  AssistantState,
  INITIAL_ASSISTANT_STATE,
  handleAssistantTurn,
  parseFieldsFromMessage
} from '../../lib/assistantService';

interface AssistantWidgetProps {
  mode: 'customer' | 'admin';
}

export default function AssistantWidget({ mode }: AssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fetch full system configurations from Global AppState
  const sysContext = useAppState();

  const [assistantState, setAssistantState] = useState<AssistantState>(INITIAL_ASSISTANT_STATE);

  const config = mode === 'admin' ? ADMIN_CONFIG : CUSTOMER_CONFIG;

  // Session storage keys
  const HISTORY_KEY = `hesba_assistant_history_${mode}`;
  const STATE_KEY = `hesba_assistant_state_${mode}`;

  // 1. Session state & history hydration and sync
  useEffect(() => {
    try {
      const storedHistory = sessionStorage.getItem(HISTORY_KEY);
      const storedState = sessionStorage.getItem(STATE_KEY);
      if (storedHistory) {
        setMessages(JSON.parse(storedHistory));
      }
      if (storedState) {
        setAssistantState(JSON.parse(storedState));
      }
    } catch (e) {
      console.warn('Could not read session state', e);
    }
  }, [mode]);

  // Persist files to session storage on any changes
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
      } catch (e) {
        console.warn('Could not save session history', e);
      }
    }
  }, [messages, mode]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(assistantState));
    } catch (e) {
      console.warn('Could not save session state', e);
    }
  }, [assistantState, mode]);

  // 2. Clear state on logout
  useEffect(() => {
    if (!user) {
      // Clear session storages
      sessionStorage.removeItem(HISTORY_KEY);
      sessionStorage.removeItem(STATE_KEY);
      setMessages([]);
      setAssistantState(INITIAL_ASSISTANT_STATE);
    }
  }, [user, mode]);

  // Initialize with greeting if empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialGreeting: Message = {
        id: 'greeting',
        sender: 'assistant',
        text: config.greeting,
        timestamp: new Date(),
        richContent: mode === 'customer' ? {
          type: 'buttons',
          buttons: [
            { id: 'explain_results', label: '📊 اشرح نتيجتي', action: 'اشرح نتيجتي' },
            { id: 'support_amt', label: '🏠 كم مبلغ الدعم؟', action: 'كم مبلغ الدعم؟' },
            { id: 'highest_finance', label: '⭐ أعلى تمويل', action: 'أعلى تمويل متاح' },
            { id: 'lowest_installment', label: '📉 أقل قسط', action: 'أقل قسط شهري' },
            { id: 'how_support', label: '💡 كيف يتم الدعم؟', action: 'كيف يتم الدعم؟' },
            { id: 'support_types_diff', label: '⚖️ الفرق بين أنواع الدعم', action: 'الفرق بين أنواع الدعم' },
            { id: 'why_banks_diff', label: '🏛️ لماذا اختلفت البنوك؟', action: 'لماذا اختلفت البنوك؟' },
            { id: 'how_obligations_affect', label: '💳 كيف تؤثر الالتزامات؟', action: 'كيف تؤثر الالتزامات؟' },
            { id: 'dsr_meaning', label: '📊 معنى الاستقطاع', action: 'معنى الاستقطاع' },
            { id: 'margin_meaning', label: '📈 معنى هامش الربح', action: 'معنى هامش الربح' },
            { id: 'is_final', label: '⚠️ هل النتيجة نهائية؟', action: 'هل النتيجة نهائية؟' }
          ]
        } : undefined
      };
      setMessages([initialGreeting]);
    }
  }, [isOpen, messages.length, config.greeting, mode]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Listen for global custom events to open/close assistant
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    const handleClose = () => {
      setIsOpen(false);
    };

    if (mode === 'customer') {
      window.addEventListener('open-customer-assistant', handleOpen);
      window.addEventListener('close-customer-assistant', handleClose);
    } else if (mode === 'admin') {
      window.addEventListener('open-admin-assistant', handleOpen);
      window.addEventListener('close-admin-assistant', handleClose);
    }

    return () => {
      if (mode === 'customer') {
        window.removeEventListener('open-customer-assistant', handleOpen);
        window.removeEventListener('close-customer-assistant', handleClose);
      } else if (mode === 'admin') {
        window.removeEventListener('open-admin-assistant', handleOpen);
        window.removeEventListener('close-admin-assistant', handleClose);
      }
    };
  }, [mode]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Context objects to feed to the calculation engine
    const contextObj = {
      banks: sysContext.banks,
      products: sysContext.products,
      militaryRanks: sysContext.militaryRanks,
      salaryRules: sysContext.salaryRules,
      pensionRules: sysContext.pensionRules,
      termRules: sysContext.termRules,
      marginRules: sysContext.marginRules,
      dsrRules: sysContext.dsrRules,
      supportSettings: sysContext.supportSettings,
      personalRules: sysContext.personalRules,
      housingSupportTiers: sysContext.housingSupportTiers,
      advancePaymentTiers: sysContext.advancePaymentTiers,
      bankSectorRules: sysContext.bankSectorRules,
      customSectors: sysContext.customSectors,
      results: sysContext.results
    };

    // Simulate smart thinking/delay
    setTimeout(() => {
      const outcome = handleAssistantTurn(text, assistantState, contextObj);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: outcome.response,
        timestamp: new Date()
      };

      if (outcome.richContent) {
        assistantMessage.richContent = outcome.richContent;
      }

      setAssistantState(outcome.newState);
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 600);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    handleSendMessage(suggestion.question);
  };

  const handleStartingAction = (question: string) => {
    handleSendMessage(question);
  };

  const clearChat = () => {
    sessionStorage.removeItem(HISTORY_KEY);
    sessionStorage.removeItem(STATE_KEY);
    setAssistantState(INITIAL_ASSISTANT_STATE);
    setMessages([
      {
        id: 'greeting',
        sender: 'assistant',
        text: config.greeting,
        timestamp: new Date(),
        richContent: mode === 'customer' ? {
          type: 'buttons',
          buttons: [
            { id: 'explain_results', label: '📊 اشرح نتيجتي', action: 'اشرح نتيجتي' },
            { id: 'support_amt', label: '🏠 كم مبلغ الدعم؟', action: 'كم مبلغ الدعم؟' },
            { id: 'highest_finance', label: '⭐ أعلى تمويل', action: 'أعلى تمويل متاح' },
            { id: 'lowest_installment', label: '📉 أقل قسط', action: 'أقل قسط شهري' },
            { id: 'how_support', label: '💡 كيف يتم الدعم؟', action: 'كيف يتم الدعم؟' },
            { id: 'support_types_diff', label: '⚖️ الفرق بين أنواع الدعم', action: 'الفرق بين أنواع الدعم' },
            { id: 'why_banks_diff', label: '🏛️ لماذا اختلفت البنوك؟', action: 'لماذا اختلفت البنوك؟' },
            { id: 'how_obligations_affect', label: '💳 كيف تؤثر الالتزامات؟', action: 'كيف تؤثر الالتزامات؟' },
            { id: 'dsr_meaning', label: '📊 معنى الاستقطاع', action: 'معنى الاستقطاع' },
            { id: 'margin_meaning', label: '📈 معنى هامش الربح', action: 'معنى هامش الربح' },
            { id: 'is_final', label: '⚠️ هل النتيجة نهائية؟', action: 'هل النتيجة نهائية?' }
          ]
        } : undefined
      }
    ]);
  };

  const handleContactClickInResults = (bankId: string) => {
    handleSendMessage(`contact_${bankId}`);
  };

  const renderRichContent = (msg: Message) => {
    if (!msg.richContent) return null;

    const { type, buttons, results, summaryData, whatsappData } = msg.richContent;

    // 1. Rendering Quick Button Chips
    if (type === 'buttons' && buttons) {
      return (
        <div className="flex flex-wrap gap-2 mt-3 select-none justify-start px-2">
          {buttons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleSendMessage(btn.action)}
              type="button"
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-800 font-bold border border-slate-200/80 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-xs active:scale-95"
            >
              {btn.label}
            </button>
          ))}
        </div>
      );
    }

    // 2. Rendering Calculation Results Comparative List
    if (type === 'results' && results) {
      // Sort results by totalPurchasingPower descending
      const sorted = [...results].sort((a, b) => {
        if (a.isEligible && !b.isEligible) return -1;
        if (!a.isEligible && b.isEligible) return 1;
        return b.totalPurchasingPower - a.totalPurchasingPower;
      });

      return (
        <div className="mt-3.5 space-y-3 px-1">
          <div className="text-[10px] text-slate-400 font-bold mb-1.5 mr-1 select-none">
            عروض الجهات التمويلية مرتبة من الأعلى تمويلاً:
          </div>
          {sorted.map((item, idx) => {
            const isBest = idx === 0 && item.isEligible;
            return (
              <div 
                key={item.bankId}
                className={`bg-white border rounded-2xl p-3.5 transition-all relative ${
                  isBest 
                    ? 'border-emerald-500 bg-emerald-50/10 shadow-xs' 
                    : 'border-slate-100/90 shadow-2xs hover:shadow-xs'
                }`}
              >
                {/* Status indicator and badges */}
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs font-black text-slate-900">{item.bankName}</span>
                  <div className="flex items-center gap-1.5">
                    {isBest && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-[9px] font-black text-white rounded-full">
                        الأعلى تمويلاً ⭐
                      </span>
                    )}
                    {item.isEligible ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded-md">
                        مؤهل
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-100/50 px-1.5 py-0.5 rounded-md">
                        غير مؤهل
                      </span>
                    )}
                  </div>
                </div>

                {item.isEligible ? (
                  <div className="grid grid-cols-2 gap-2 text-right">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans">التمويل الإجمالي المتاح</span>
                      <span className="text-xs font-black text-[#0057B8]">{item.totalPurchasingPower.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans">القسط الشهري</span>
                      <span className="text-xs font-black text-slate-800">{item.monthlyInstallment.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans">المدة القصوى</span>
                      <span className="text-xs font-bold text-slate-700">{item.termYears} سنة ({item.termMonths} شهر)</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans">الدعم المستحق</span>
                      <span className="text-xs font-bold text-emerald-600">
                        {item.supportAmount > 0 
                          ? `${item.supportAmount.toLocaleString('ar-SA')} ر.س (${item.supportType === 'monthly' ? 'شهري ثابت' : 'دفعة مسبقة'})` 
                          : 'لا يستحق دعم'}
                      </span>
                    </div>
                    
                    {/* Action buttons internally */}
                    <div className="col-span-2 pt-2.5 border-t border-slate-100/80 mt-1.5 flex justify-end">
                      <button
                        onClick={() => handleContactClickInResults(item.bankId)}
                        type="button"
                        className="px-3 py-1.5 bg-[#0057B8]/10 hover:bg-[#0057B8]/20 text-[#0057B8] text-[10px] font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>اترك معلوماتك للموظف</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-rose-500 font-bold bg-rose-50/40 p-2 rounded-xl mt-1 leading-relaxed">
                    ⚙️ سبب الاستبعاد: {item.rejectionReason || 'عدم توافق سياسة البنك الائتمانية مع البيانات المدخلة.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // 3. Rendering Confirmation & Summary Data
    if (type === 'data_summary' && summaryData) {
      return (
        <div className="mt-3 bg-slate-55 border border-slate-200/60 rounded-2xl p-3.5 space-y-3 shadow-3xs max-w-[90%]">
          <div className="flex items-center gap-2 text-[#0057B8] font-black text-xs select-none">
            <CheckCircle className="w-4 h-4 text-emerald-500 animate-bounce" />
            <span>تأكيد بيانات الحسبة المدخلة:</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3 select-none justify-start">
            {buttons?.map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleSendMessage(btn.action)}
                type="button"
                className={`px-3 py-2 text-[10px] font-black rounded-xl cursor-pointer transition-all active:scale-95 shadow-2xs ${
                  btn.id === 'calc_start' 
                    ? 'bg-emerald-650 hover:bg-emerald-700 text-white bg-emerald-600' 
                    : 'bg-slate-200/80 hover:bg-slate-300 text-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 4. WhatsApp confirmation dialog flow
    if (type === 'whatsapp_approval' && whatsappData) {
      return (
        <div className="mt-3.5 border border-[#0ea5a4]/30 bg-[#0ea5a4]/5 rounded-2xl p-4 space-y-3 shadow-3xs">
          <div className="flex items-center gap-2 text-[#0ea5a4] font-black text-xs select-none">
            <PhoneCall className="w-4 h-4 animate-pulse" />
            <span>الاتصال بخدمة عملاء {whatsappData.bankName}:</span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
            سيتم نقلك خارجيًا إلى تطبيق واتساب مباشرة للتحدث مع منسق الجهة، لمراجعة بيانات الحسبة وعروض الدعم السكني المعتمدة.
          </p>

          <div className="flex gap-2">
            {buttons?.map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleSendMessage(btn.action)}
                type="button"
                className={`px-3 py-2 text-[10px] font-black rounded-xl cursor-pointer transition-all active:scale-95 ${
                  btn.id === 'whats_send'
                    ? 'bg-[#0ea5a4] hover:bg-[#0c908f] text-white shadow-md'
                    : 'bg-slate-200/80 hover:bg-slate-300 text-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderActiveModeHelpers = () => {
    // Only prompt active button guidelines if we have no messages other than the first greeting
    if (messages.length !== 1 || mode !== 'customer') return null;

    return (
      <div className="grid grid-cols-1 gap-2 p-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0 select-none">
        <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1 mb-1 justify-start">
          <Sparkles className="w-3.5 h-3.5 text-[#0057B8]" />
          <span>اختر مسار المساعد الفوري للبدء:</span>
        </span>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
          <button
            onClick={() => handleStartingAction('احسب تمويلي الآن')}
            className="p-2.5 text-right font-black text-[11px] text-slate-850 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:bg-[#0057B8]/5 hover:border-[#0057B8] transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="w-5 h-5 bg-[#0057B8]/10 text-[#0057B8] rounded-lg flex items-center justify-center font-bold font-sans">📊</span>
            <span>بناء وحساب تمويلي</span>
          </button>
          
          <button
            onClick={() => handleStartingAction('ما هو الفرق بين الدعم الشهري ودعم الدفعة المسبقة؟')}
            className="p-2.5 text-right font-black text-[11px] text-slate-850 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:bg-[#0057B8]/5 hover:border-[#0057B8] transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="w-5 h-5 bg-[#0057B8]/10 text-[#0057B8] rounded-lg flex items-center justify-center font-bold font-sans">🏠</span>
            <span>شرح أنواع الدعم السكني</span>
          </button>

          <button
            onClick={() => handleStartingAction('ما هي نسبة الاستقطاع DSR؟')}
            className="p-2.5 text-right font-black text-[11px] text-slate-850 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:bg-[#0057B8]/5 hover:border-[#0057B8] transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="w-5 h-5 bg-[#0057B8]/10 text-[#0057B8] rounded-lg flex items-center justify-center font-bold font-sans">📉</span>
            <span>شرح نسبة الاستقطاع DSR</span>
          </button>

          <button
            onClick={() => handleStartingAction('لماذا تقل مدة التمويل عند اقتراب العميل من التقاعد؟')}
            className="p-2.5 text-right font-black text-[11px] text-slate-850 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:bg-[#0057B8]/5 hover:border-[#0057B8] transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="w-5 h-5 bg-[#0057B8]/10 text-[#0057B8] rounded-lg flex items-center justify-center font-bold font-sans">📅</span>
            <span>أثر قرب التقاعد السني</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="z-[999]" dir="rtl">
      {/* Floating Chat Panel Context */}
      {isOpen && (
        <div 
          id={`assistant-panel-${mode}`}
          className={`bg-white shadow-3xl border border-slate-100 flex flex-col overflow-hidden animate-fade-in transition-all duration-300 z-[9999] 
            fixed inset-0 w-full h-full 
            sm:inset-y-4 sm:left-4 sm:right-auto sm:top-4 sm:bottom-4 sm:w-[440px] sm:h-[calc(100vh-32px)] sm:rounded-3xl`}
        >
          {/* Header */}
          <div 
            className={`p-4 py-3.5 flex items-center justify-between text-white select-none shrink-0 ${
              mode === 'admin' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-750' 
                : 'bg-gradient-to-r from-[#0057B8] to-[#0ea5a4]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shadow-xs">
                <Bot className="w-5.5 h-5.5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight">{mode === 'admin' ? 'مساعد الإدارة' : 'مساعد حسبة الذكي'}</h4>
                <p className="text-[10px] text-white/80 font-medium font-sans">
                  {mode === 'admin' ? 'الإرشاد الفوري لخصائص النظام' : 'مستشارك التمويلي الآمن والموثوق'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                type="button"
                className="px-2 py-1 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white/95 transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>إعادة تصفير</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                type="button"
                aria-label="إغلاق"
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/95 transition-colors cursor-pointer flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="bg-amber-50/75 border-b border-amber-100/40 p-3 px-4 flex items-start gap-2 select-none text-[10px] text-amber-800 font-bold leading-normal shrink-0">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 animate-pulse" />
            <span className="text-right leading-relaxed">{config.disclaimer}</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 space-y-4 min-h-0 flex flex-col">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-start flex-row-reverse' : 'justify-start'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-3xs ${
                  msg.sender === 'user' 
                    ? 'bg-slate-200 text-slate-705 bg-slate-100' 
                    : mode === 'admin' 
                      ? 'bg-indigo-50 text-indigo-800' 
                      : 'bg-[#0057B8]/10 text-[#0057B8]'
                }`}>
                  {msg.sender === 'user' ? (
                    <User className="w-4.5 h-4.5" />
                  ) : (
                    <Bot className="w-4.5 h-4.5" />
                  )}
                </div>

                {/* Bubble Container */}
                <div className="flex flex-col max-w-[84%] gap-1">
                  <div 
                    className={`p-3 px-4 rounded-2xl text-xs leading-relaxed font-sans whitespace-pre-line shadow-3xs ${
                      msg.sender === 'user'
                        ? 'bg-[#0057B8] text-white rounded-tr-none font-bold'
                        : 'bg-white border border-slate-100/80 text-slate-800 rounded-tl-none font-medium'
                    }`}
                  >
                    {msg.text}
                  </div>
                  
                  {/* Rich content like results comparison / buttons */}
                  {renderRichContent(msg)}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 justify-start">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-3xs ${
                  mode === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-[#0057B8]/10 text-[#0057B8]'
                }`}>
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div className="bg-white border border-slate-100 text-slate-500 p-3 px-4 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-3xs">
                  <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce bg-slate-400"></span>
                  <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce [animation-delay:0.2s] bg-slate-400"></span>
                  <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce [animation-delay:0.4s] bg-slate-400"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Starting Guideline Helpers (Only visible at first) */}
          {renderActiveModeHelpers()}

          {/* Text Input area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3.5 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0 select-none pb-5 sm:pb-4"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="اكتب سؤالك، أو قسطك الحالي، أو حدِّث حساب راتبك..."
              className="flex-1 px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8] font-sans shadow-2xs"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              aria-label="إرسال"
              className={`p-3 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                mode === 'admin' 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-[#0057B8] hover:bg-[#004eab]'
              }`}
            >
              <Send className="w-4.5 h-4.5 transform rotate-180" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
