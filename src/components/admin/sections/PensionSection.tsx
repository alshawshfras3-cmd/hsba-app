import React, { useState } from 'react';
import { Calendar, FileText, Clipboard, Settings2, ShieldCheck, HelpCircle } from 'lucide-react';
import { Bank, NetSalaryRule } from '../../../types';
import { 
  ApprovedSalarySourceRule, 
  PensionCalculationRule, 
  SectorClassificationMapping, 
  PensionLibraryRule, 
  BankSectorPensionRule 
} from '../../../types/pension-rules';

// Tab Components
import ApprovedSalaryTab from './pension/ApprovedSalaryTab';
import PensionCalcTab from './pension/PensionCalcTab';
import SectorClassTab from './pension/SectorClassTab';
import RulesLibraryTab from './pension/RulesLibraryTab';
import BankSectorRulesTab from './pension/BankSectorRulesTab';
import RuleTestTab from './pension/RuleTestTab';

interface PensionSectionProps {
  banks: Bank[];
  dbRulesLoading: boolean;

  // approved_salary
  approvedSalaryDbRules: ApprovedSalarySourceRule[];
  setApprovedSalaryDbRules: React.Dispatch<React.SetStateAction<ApprovedSalarySourceRule[]>>;
  salaryRules: NetSalaryRule[];

  // pension_calc
  pensionDbRules: PensionCalculationRule[];
  setPensionDbRules: React.Dispatch<React.SetStateAction<PensionCalculationRule[]>>;

  // sector_class
  sectorMappings: SectorClassificationMapping[];
  setSectorMappings: React.Dispatch<React.SetStateAction<SectorClassificationMapping[]>>;

  // rules_library
  libraryRules: PensionLibraryRule[];
  saveLibraryRulesToStorage: (rules: PensionLibraryRule[]) => void;

  // bank_sector_rules
  bankSectorRules: BankSectorPensionRule[];
  setBankSectorRules: React.Dispatch<React.SetStateAction<BankSectorPensionRule[]>>;
  saveBankSectorRulesToStorage: (rules: BankSectorPensionRule[]) => void;

  // Core callback helpers
  showToast: (msg: string, type: 'success' | 'refuse') => void;
  openHistory: (tableName: string, bankId: string, title: string) => void;
  setCopyTargetBank: (bankId: string) => void;
  setCopySourceBank: (bankId: string) => void;
  setCopySections: (sections: Array<'margins' | 'dsr' | 'personal' | 'salary_source' | 'pension'>) => void;
  setShowCopyModal: (show: boolean) => void;
}

type PensionTab = 'bank_sector_rules' | 'approved_salary' | 'pension_calc' | 'sector_class' | 'rules_library' | 'rule_test';

export default function PensionSection({
  banks,
  dbRulesLoading,
  approvedSalaryDbRules,
  setApprovedSalaryDbRules,
  salaryRules,
  pensionDbRules,
  setPensionDbRules,
  sectorMappings,
  setSectorMappings,
  libraryRules,
  saveLibraryRulesToStorage,
  bankSectorRules,
  setBankSectorRules,
  saveBankSectorRulesToStorage,
  showToast,
  openHistory,
  setCopyTargetBank,
  setCopySourceBank,
  setCopySections,
  setShowCopyModal
}: PensionSectionProps) {
  const [activeTab, setActiveTab] = useState<PensionTab>('bank_sector_rules');

  const tabItems = [
    { id: 'bank_sector_rules', label: 'الربط المباشر 🏦', icon: Settings2 },
    { id: 'approved_salary', label: 'الراتب المعتمد 💵', icon: FileText },
    { id: 'pension_calc', label: 'حساب المعاش 📊', icon: Clipboard },
    { id: 'sector_class', label: 'تصنيفات الأهلي 👮', icon: ShieldCheck },
    { id: 'rules_library', label: 'مكتبة القوالب 📚', icon: Calendar },
    { id: 'rule_test', label: 'مختبر القوانين 🧪', icon: HelpCircle }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Universal Pension Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs font-sans text-right" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">قواعد الراتب التقاعدي للجهات العسكرية والمدنية</h2>
            <p className="text-xs text-[#6B7280] mt-1">ضبط ومطابقة كيفية قراءة واحتساب الراتب المعتمد والمعاش التقاعدي لكل بنك بحسب القطاع والوظيفة لتطابق تام 100%.</p>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigator Bar */}
      <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60 flex flex-wrap gap-1 font-sans text-right" dir="rtl">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                isSelected
                  ? 'bg-white text-[#0057B8] shadow-sm font-black scale-[1.01]'
                  : 'text-gray-500 hover:text-gray-950 hover:bg-white/40'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Current Active Tab Content Component */}
      <div className="animate-fade-in">
        {activeTab === 'bank_sector_rules' && (
          <BankSectorRulesTab
            banks={banks}
            bankSectorRules={bankSectorRules}
            setBankSectorRules={setBankSectorRules}
            saveBankSectorRulesToStorage={saveBankSectorRulesToStorage}
            showToast={showToast}
          />
        )}

        {activeTab === 'approved_salary' && (
          <ApprovedSalaryTab
            banks={banks}
            dbRulesLoading={dbRulesLoading}
            approvedSalaryDbRules={approvedSalaryDbRules}
            setApprovedSalaryDbRules={setApprovedSalaryDbRules}
            showToast={showToast}
            openHistory={openHistory}
            setCopyTargetBank={setCopyTargetBank}
            setCopySourceBank={setCopySourceBank}
            setCopySections={setCopySections}
            setShowCopyModal={setShowCopyModal}
          />
        )}

        {activeTab === 'pension_calc' && (
          <PensionCalcTab
            banks={banks}
            dbRulesLoading={dbRulesLoading}
            pensionDbRules={pensionDbRules}
            setPensionDbRules={setPensionDbRules}
            showToast={showToast}
            openHistory={openHistory}
            setCopyTargetBank={setCopyTargetBank}
            setCopySourceBank={setCopySourceBank}
            setCopySections={setCopySections}
            setShowCopyModal={setShowCopyModal}
          />
        )}

        {activeTab === 'sector_class' && (
          <SectorClassTab
            sectorMappings={sectorMappings}
            setSectorMappings={setSectorMappings}
            showToast={showToast}
          />
        )}

        {activeTab === 'rules_library' && (
          <RulesLibraryTab
            libraryRules={libraryRules}
            saveLibraryRulesToStorage={saveLibraryRulesToStorage}
            showToast={showToast}
          />
        )}

        {activeTab === 'rule_test' && (
          <RuleTestTab
            banks={banks}
            salaryRules={salaryRules}
            approvedSalaryDbRules={approvedSalaryDbRules}
            pensionDbRules={pensionDbRules}
            sectorMappings={sectorMappings}
          />
        )}
      </div>
    </div>
  );
}
