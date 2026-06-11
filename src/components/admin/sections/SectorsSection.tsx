import React, { useState } from 'react';
import { Plus, Briefcase, Award, Trash2 } from 'lucide-react';
import { Sector, MilitaryRank } from '../../../types';
import { normalizeNumberInput, parseNumberInput } from '../../../lib/number-input';

interface SectorsSectionProps {
  sectors: Sector[];
  setSectors: React.Dispatch<React.SetStateAction<Sector[]>>;
  militaryRanks: MilitaryRank[];
  setMilitaryRanks: React.Dispatch<React.SetStateAction<MilitaryRank[]>>;
  showToast: (msg: string, type: 'success' | 'refuse') => void;
}

export const SectorsSection: React.FC<SectorsSectionProps> = ({
  sectors,
  setSectors,
  militaryRanks,
  setMilitaryRanks,
  showToast
}) => {
  // Sector editing modal state
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [formSectorNameAr, setFormSectorNameAr] = useState('');
  const [formSectorIsActive, setFormSectorIsActive] = useState(true);
  const [formSectorRetirementAge, setFormSectorRetirementAge] = useState('');

  // Military rank modal/form state
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<MilitaryRank | null>(null);
  const [formRankNameAr, setFormRankNameAr] = useState('');
  const [formRankId, setFormRankId] = useState('');
  const [formRankRetirementAge, setFormRankRetirementAge] = useState('');
  const [formRankDisplayOrder, setFormRankDisplayOrder] = useState('');
  const [formRankIsActive, setFormRankIsActive] = useState(true);
  const [formRankScope, setFormRankScope] = useState<'enlisted' | 'officer'>('enlisted');
  const [rankError, setRankError] = useState('');

  const parseArabicAndEnglishNumber = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return "";
    let str = String(value).trim();
    const arabicIndic = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = str.replace(arabicIndic[i], i.toString());
    }
    const persian = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = str.replace(persian[i], i.toString());
    }
    return str;
  };

  const openEditSectorModal = (sec: Sector) => {
    setEditingSector(sec);
    setFormSectorNameAr(sec.nameAr);
    setFormSectorIsActive(sec.isActive);
    setFormSectorRetirementAge(String(sec.defaultRetirementAge || 60));
    setIsSectorModalOpen(true);
  };

  const saveSector = () => {
    if (!formSectorNameAr.trim()) {
      showToast('يرجى إدخال اسم القطاع', 'refuse');
      return;
    }
    const ageNum = Math.round(parseNumberInput(formSectorRetirementAge, 60));
    const updatedSectors = sectors.map(s => 
      s.id === editingSector?.id 
        ? { ...s, nameAr: formSectorNameAr, isActive: formSectorIsActive, defaultRetirementAge: (s.id === 'military' || s.id === 'retired') ? 0 : ageNum } 
        : s
    );
    setSectors(updatedSectors);
    setIsSectorModalOpen(false);
    showToast('تم تحديث القطاع بنجاح!', 'success');
  };

  const openAddRankModal = () => {
    setEditingRank(null);
    setFormRankNameAr('');
    setFormRankId('');
    setFormRankRetirementAge('');
    setFormRankDisplayOrder(String(militaryRanks.length + 1));
    setFormRankIsActive(true);
    setFormRankScope('enlisted');
    setRankError('');
    setIsRankModalOpen(true);
  };

  const openEditRankModal = (rank: MilitaryRank) => {
    setEditingRank(rank);
    setFormRankNameAr(rank.nameAr);
    setFormRankId(rank.id);
    setFormRankRetirementAge(String(rank.retirementAge));
    setFormRankDisplayOrder(String(rank.displayOrder || 1));
    setFormRankIsActive(rank.isActive);
    setFormRankScope(rank.sectorScope || 'enlisted');
    setRankError('');
    setIsRankModalOpen(true);
  };

  const handleDeleteRank = (rankIdToDelete: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الرتبة العسكرية نهائياً؟ قد يؤثر الحذف على حسابات العملاء الذين يحملون هذه الرتبة.')) {
      setMilitaryRanks(prev => prev.filter(r => r.id !== rankIdToDelete));
      showToast('تم حذف الرتبة العسكرية بنجاح!', 'success');
    }
  };

  const saveRank = () => {
    if (!formRankNameAr.trim()) {
      setRankError('اسم الرتبة مطلوب.');
      return;
    }
    
    let cleanId = formRankId.trim().toLowerCase().replace(/\s+/g, '_');
    if (!editingRank && !cleanId) {
      setRankError('ID الرتبة مطلوب للرتبة الجديدة.');
      return;
    }

    if (!editingRank && militaryRanks.some(r => r.id === cleanId)) {
      setRankError('ID هذه الرتبة مستخدم بالفعل، يرجى اختيار معرف فريد.');
      return;
    }

    const ageStr = normalizeNumberInput(parseArabicAndEnglishNumber(formRankRetirementAge));
    const orderStr = normalizeNumberInput(parseArabicAndEnglishNumber(formRankDisplayOrder));

    if (!ageStr || !orderStr) {
      setRankError('سن التقاعد وترتيب العرض حقول مطلوبة.');
      return;
    }

    const ageNum = Number(ageStr);
    const orderNum = Number(orderStr);

    if (isNaN(ageNum) || isNaN(orderNum)) {
      setRankError('الرجاء إدخال أرقام صحيحة لسن التقاعد وترتيب العرض.');
      return;
    }

    if (editingRank) {
      const updatedRank: MilitaryRank = {
        ...editingRank,
        nameAr: formRankNameAr.trim(),
        retirementAge: ageNum,
        displayOrder: orderNum,
        isActive: formRankIsActive,
        sectorScope: formRankScope
      };
      setMilitaryRanks(prev => prev.map(r => r.id === editingRank.id ? updatedRank : r));
      showToast('تم تحديث الرتبة العسكرية بنجاح!', 'success');
    } else {
      const newRank: MilitaryRank = {
        id: cleanId,
        nameAr: formRankNameAr.trim(),
        retirementAge: ageNum,
        displayOrder: orderNum,
        isActive: formRankIsActive,
        sectorScope: formRankScope,
        pensionMultiplier: 420
      };
      setMilitaryRanks(prev => [...prev, newRank]);
      showToast('تم إضافة الرتبة العسكرية بنجاح!', 'success');
    }

    setIsRankModalOpen(false);
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header Description */}
      <div>
        <h2 className="text-lg font-bold text-[#111827]">إعدادات القطاعات الوظيفية والرتب العسكرية</h2>
        <p className="text-xs text-[#6B7280]">ترتيب وإدارة القطاعات الوظيفية، وإدارة الرتب العسكرية لتعيين سن التقاعد وضبط معايير العرض والقبول.</p>
      </div>

      {/* Section 1: Sectors Grid */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-[#111827] text-sm flex items-center gap-1.5 border-b pb-2 border-gray-100">
          <Briefcase className="w-4 h-4 text-[#0057B8]" />
          <span>القسم الأول: القطاعات الوظيفية</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sectors.map((sec) => (
            <div key={sec.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-extrabold text-[#111827] text-sm">{sec.nameAr}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sec.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {sec.isActive ? 'مفعل' : 'غير مفعل'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 flex flex-col gap-1">
                  <div>
                    <span className="font-semibold text-slate-400">Sector ID:</span>{' '}
                    <code className="bg-slate-50 px-1 py-0.5 rounded font-mono text-[10px] text-slate-600">{sec.id}</code>
                  </div>
                  {sec.id !== 'military' && sec.id !== 'retired' && (
                    <div>
                      <span className="font-semibold text-slate-400">سن التقاعد الثابت:</span>{' '}
                      <span className="font-bold text-slate-700">{sec.defaultRetirementAge || 60} سنة</span>
                    </div>
                  )}
                  {sec.id === 'military' && (
                    <div>
                      <span className="font-semibold text-slate-400">سن التقاعد:</span>{' '}
                      <span className="font-semibold text-slate-600 font-sans">من الرتبة العسكرية</span>
                    </div>
                  )}
                  {sec.id === 'retired' && (
                    <div>
                      <span className="font-semibold text-slate-400">سن التقاعد:</span>{' '}
                      <span className="font-semibold text-slate-500 font-sans">لا ينطبق</span>
                    </div>
                  )}
                  {sec.notes && <p className="mt-1">ملاحظة: {sec.notes}</p>}
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => openEditSectorModal(sec)}
                  className="w-full text-center text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  تعديل القطاع
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Military Ranks Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2 border-gray-100">
          <h3 className="font-extrabold text-[#111827] text-sm flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#0057B8]" />
            <span>القسم الثاني: الرتب العسكرية</span>
          </h3>
          <button
            type="button"
            onClick={openAddRankModal}
            className="flex items-center gap-1 bg-[#0057B8] hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة رتبة عسكرية</span>
          </button>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-right">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#111827] min-w-[700px]">
              <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-100 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold">الرتبة</th>
                  <th className="p-4 font-bold">Rank ID</th>
                  <th className="p-4 font-bold text-center">النوع</th>
                  <th className="p-4 font-bold text-center">سن التقاعد</th>
                  <th className="p-4 font-bold text-center">ترتيب العرض</th>
                  <th className="p-4 font-bold text-center">الحالة</th>
                  <th className="p-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-semibold font-sans">
                {militaryRanks && militaryRanks.length > 0 ? (
                  militaryRanks.slice().sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)).map((rank) => (
                    <tr key={rank.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-800">{rank.nameAr}</td>
                      <td className="p-4">
                        <code className="bg-slate-50 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-500">{rank.id}</code>
                      </td>
                      <td className="p-4 text-center text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rank.sectorScope === 'officer' 
                            ? 'bg-blue-50 text-[#0057B8]' 
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {rank.sectorScope === 'officer' ? 'ضباط' : 'أفراد'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-sans">
                        {rank.retirementAge} سنة
                      </td>
                      <td className="p-4 text-center font-sans">
                        {rank.displayOrder}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setMilitaryRanks(prev => prev.map(r => r.id === rank.id ? { ...r, isActive: !r.isActive } : r))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            rank.isActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              rank.isActive ? '-translate-x-4' : 'translate-x-[12px]'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditRankModal(rank)}
                            className="text-[#0057B8] hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors text-xs font-bold cursor-pointer"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRank(rank.id)}
                            className="text-red-650 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors text-xs font-bold cursor-pointer flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">لا توجد رتب عسكرية مسجلة حالياً.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTORS MODAL POPUP */}
      {isSectorModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative z-55 bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all w-full max-w-md border border-gray-100 font-sans">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900" id="sector-modal-title">
                تعديل بيانات القطاع الوظيفي
              </h3>
              <button
                type="button"
                onClick={() => setIsSectorModalOpen(false)}
                className="text-gray-400 hover:text-gray-650 focus:outline-none text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">اسم القطاع:</label>
                <input
                  type="text"
                  value={formSectorNameAr}
                  onChange={(e) => setFormSectorNameAr(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-bold text-gray-600">ID القطاع:</label>
                <input
                  type="text"
                  value={editingSector?.id || ''}
                  disabled
                  className="w-full bg-slate-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 cursor-not-allowed focus:outline-none text-right"
                />
              </div>

              {editingSector?.id !== 'military' && editingSector?.id !== 'retired' && (
                <div className="space-y-1.5 text-right font-sans">
                  <label className="block text-xs font-bold text-gray-600">سن التقاعد الثابت:</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={formSectorRetirementAge}
                    onChange={(e) => setFormSectorRetirementAge(normalizeNumberInput(e.target.value))}
                    className="text-right w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 font-sans"
                    placeholder="مثال: 60"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-gray-600">حالة التفعيل:</span>
                <button
                  type="button"
                  onClick={() => setFormSectorIsActive(!formSectorIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formSectorIsActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      formSectorIsActive ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs">
              <button
                type="button"
                onClick={saveSector}
                className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
              >
                تطبيق التعديلات
              </button>
              <button
                type="button"
                onClick={() => setIsSectorModalOpen(false)}
                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MILITARY RANKS MODAL POPUP */}
      {isRankModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative z-55 bg-white rounded-3xl text-right overflow-hidden shadow-2xl transform transition-all w-full max-w-md border border-gray-100 font-sans">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900" id="rank-modal-title">
                {editingRank ? 'تعديل بيانات الرتبة العسكرية' : 'إضافة رتبة عسكرية جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRankModalOpen(false)}
                className="text-gray-400 hover:text-gray-655 focus:outline-none text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-6 space-y-4">
              {rankError && (
                <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-2xl border border-red-100 font-semibold">
                  ⚠️ {rankError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">اسم الرتبة:</label>
                <input
                  type="text"
                  value={formRankNameAr}
                  onChange={(e) => setFormRankNameAr(e.target.value)}
                  placeholder="مثال: جندي، رائد"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-bold text-gray-650">Rank ID (معرف الرتبة):</label>
                <input
                  type="text"
                  value={formRankId}
                  onChange={(e) => setFormRankId(e.target.value)}
                  disabled={editingRank !== null}
                  placeholder="مثال: soldier, major"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-right ${
                    editingRank !== null 
                      ? 'bg-slate-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-slate-50 border-gray-200 text-gray-700 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                {!editingRank && (
                  <p className="text-[10px] text-gray-400 font-sans">أدخل معرّف بالإنجليزية (مثل: colonel أو soldier_1).</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-650">الفئة العسكرية (أفراد / ضباط):</label>
                <select
                  value={formRankScope}
                  onChange={(e) => setFormRankScope(e.target.value as 'enlisted' | 'officer')}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="enlisted">عسكري أفراد (enlisted)</option>
                  <option value="officer">عسكري ضباط (officer)</option>
                </select>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-bold text-gray-650">سن التقاعد الإلزامي للرتبة:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={formRankRetirementAge}
                  onChange={(e) => setFormRankRetirementAge(normalizeNumberInput(e.target.value))}
                  className="text-right w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 font-sans"
                  placeholder="مثال: 44"
                />
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-bold text-gray-650">ترتيب العرض:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={formRankDisplayOrder}
                  onChange={(e) => setFormRankDisplayOrder(normalizeNumberInput(e.target.value))}
                  className="text-right w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 font-sans"
                  placeholder="مثال: 1"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-gray-600">حالة التفعيل:</span>
                <button
                  type="button"
                  onClick={() => setFormRankIsActive(!formRankIsActive)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formRankIsActive ? 'bg-[#0057B8]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      formRankIsActive ? '-translate-x-4' : 'translate-x-[12px]'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 font-bold text-xs">
              <button
                type="button"
                onClick={saveRank}
                className="bg-[#0057B8] hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
              >
                {editingRank ? 'تطبيق التعديلات' : 'إضافة رتبة'}
              </button>
              <button
                type="button"
                onClick={() => setIsRankModalOpen(false)}
                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
