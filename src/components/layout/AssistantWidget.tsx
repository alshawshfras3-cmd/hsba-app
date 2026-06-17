import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, Send, X, Bot, User, HelpCircle, AlertCircle } from 'lucide-react';
import { 
  CUSTOMER_CONFIG, 
  ADMIN_CONFIG, 
  getAssistantResponse, 
  Message, 
  Suggestion 
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

  const config = mode === 'admin' ? ADMIN_CONFIG : CUSTOMER_CONFIG;

  // Initialize with greeting on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'greeting',
          sender: 'assistant',
          text: config.greeting,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, messages.length, config.greeting]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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

    // Simulate smart thinking/delay
    setTimeout(() => {
      const responseText = getAssistantResponse(mode, text);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 600);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    handleSendMessage(suggestion.question);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'greeting',
        sender: 'assistant',
        text: config.greeting,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-6 z-[999]" dir="rtl">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          id={`open-assistant-${mode}`}
          className={`flex items-center gap-2 px-4 py-3 bg-gradient-to-r ${
            mode === 'admin' 
              ? 'from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 focus:ring-indigo-500' 
              : 'from-[#0057B8] to-[#0ea5a4] hover:from-[#004eab] hover:to-[#0d9493] focus:ring-[#0057B8]'
          } text-white font-extrabold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-102 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none cursor-pointer max-w-[170px]`}
        >
          <Sparkles className="w-4.5 h-4.5 animate-pulse shrink-0" />
          <span className="text-xs tracking-tight whitespace-nowrap">
            {mode === 'admin' ? 'مساعد الإدارة' : 'مساعد حسبة'}
          </span>
        </button>
      )}

      {/* Floating Chat Box Panel */}
      {isOpen && (
        <div 
          id={`assistant-panel-${mode}`}
          className="w-[350px] sm:w-[380px] max-w-[calc(100vw-32px)] h-[500px] sm:h-[550px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-fade-in transition-all duration-300 transform"
        >
          {/* Header */}
          <div 
            className={`p-4 flex items-center justify-between text-white select-none ${
              mode === 'admin' 
                ? 'bg-gradient-to-r from-indigo-650 to-violet-700' 
                : 'bg-gradient-to-r from-[#0057B8] to-[#0ea5a4]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-black">{config.title}</h4>
                <span className="text-[10px] text-white/80 font-medium">مستشار رقمي فوري لقواعد حسبة</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="مسح المحادثة"
                className="p-1 px-1.5 hover:bg-white/10 rounded-lg text-xs font-semibold text-white/90 transition-colors cursor-pointer"
              >
                إعادة ضبط
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/90 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="bg-amber-50/70 border-b border-amber-100/50 p-2.5 px-3 flex items-start gap-2 select-none text-[10px] text-amber-800 font-semibold leading-normal">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
            <span className="text-right">{config.disclaimer}</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 space-y-3.5 min-h-0 flex flex-col">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-start flex-row-reverse' : 'justify-start'}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.sender === 'user' 
                    ? 'bg-slate-200 text-slate-700' 
                    : mode === 'admin' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'bg-[#0057B8]/10 text-[#0057B8]'
                }`}>
                  {msg.sender === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Bubble */}
                <div 
                  className={`max-w-[78%] p-3 rounded-2xl text-xs leading-relaxed font-sans whitespace-pre-line shadow-xs ${
                    msg.sender === 'user'
                      ? mode === 'admin'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-[#0057B8] text-white rounded-tr-none'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 justify-start">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  mode === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-[#0057B8]/10 text-[#0057B8]'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-100 text-slate-500 p-3 px-4 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions list */}
          <div className="p-3 border-t border-slate-100 bg-white space-y-1.5 select-none shrink-0">
            <span className="text-[10px] text-slate-400 font-bold block mb-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-400" />
              <span>أسئلة مفتاحية مقترحة:</span>
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[105px] overflow-y-auto pr-1">
              {config.suggestions.map((sug) => (
                <button
                  key={sug.id}
                  onClick={() => handleSuggestionClick(sug)}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] text-slate-700 font-bold border border-slate-100 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-98"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0 select-none"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="اكتب سؤالك هنا عن الحسبة التمويلية..."
              className="flex-1 px-3.5 py-2.5 bg-white border border-slate-150 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8] font-sans"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={`p-2.5 bg-[#0057B8] hover:bg-[#004eab] disabled:bg-slate-200 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                mode === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-[#0057B8] hover:bg-[#004eab]'
              }`}
            >
              <Send className="w-4 h-4 transform rotate-180" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
