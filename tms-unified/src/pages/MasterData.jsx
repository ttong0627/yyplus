import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Plus, Trash2, Edit2, Save, X, Database, Users, Box, MapPin } from 'lucide-react';
import { Utils } from '../Utils';

// =========================================================================
// 공통 기초데이터 관리 컨테이너 및 탭 컴포넌트
// =========================================================================
export default function MasterData() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: 'clinic', name: '보건소 관리', icon: <MapPin size={18} />, path: '/basic/clinic' },
    { id: 'items', name: '품목 관리', icon: <Box size={18} />, path: '/basic/items' },
    { id: 'partners', name: '거래처 관리', icon: <Database size={18} />, path: '/basic/partners' },
    { id: 'users', name: '사용자 관리', icon: <Users size={18} />, path: '/basic/users' },
  ];

  return (
    <div className="w-full h-full p-4 sm:p-6 animate-fade-in flex flex-col">
      {/* Header & Tabs */}
      <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/80 p-4 sm:p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Database className="text-indigo-600" />
            기초 데이터 통합 관리
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">시스템 운영에 필요한 기본 제원(마스터 데이터)을 관리합니다.</p>
        </div>
        
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const isActive = location.pathname.includes(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white/70 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/80 overflow-hidden flex flex-col relative">
         <Routes>
           <Route path="/" element={<Navigate to="/basic/clinic" replace />} />
           <Route path="clinic" element={<DataManager collectionName="clients" title="보건소" fields={[{k:'name', l:'보건소명'}, {k:'shortName', l:'단축명(표시용)'}, {k:'manager', l:'담당자'}, {k:'contact', l:'연락처'}, {k:'inspectTime', l:'검수시간'}, {k:'inspectLocation', l:'검수장소'}]} />} />
           <Route path="items" element={<DataManager collectionName="items" title="품목" fields={[{k:'name', l:'품목명'}, {k:'category', l:'분류(미곡/야채/과일 등)'}, {k:'unit', l:'단위'}, {k:'boxQuantity', l:'박스당 수량', type:'number'}, {k:'unitPrice', l:'박스단가', type:'number'}, {k:'supplierId', l:'기본거래처(ID)'}]} />} />
           <Route path="partners" element={<DataManager collectionName="suppliers" title="거래처" fields={[{k:'name', l:'거래처명'}, {k:'manager', l:'담당자'}, {k:'contact', l:'연락처'}, {k:'account', l:'계좌번호'}, {k:'orderType', l:'발주방식(auto/manual)'}]} />} />
           <Route path="users" element={<DataManager collectionName="users" title="사용자" fields={[{k:'name', l:'이름'}, {k:'id', l:'로그인ID'}, {k:'role', l:'권한(admin/user)'}, {k:'contact', l:'연락처'}, {k:'note', l:'비고'}]} />} />
         </Routes>
      </div>
    </div>
  );
}

// =========================================================================
// 범용 데이터 그리드 매니저 (Data Manager)
// =========================================================================
function DataManager({ collectionName, title, fields }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // Firestore 실시간 구독
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, collectionName), (snap) => {
      const list = snap.docs.map(doc => ({ fbId: doc.id, ...doc.data() }));
      // 정렬: 이름(name) 기준
      list.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
      setData(list);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsub();
  }, [collectionName]);

  const filteredData = data.filter(d => 
    fields.some(f => String(d[f.k] || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingId('NEW');
    const emptyForm = {};
    fields.forEach(f => emptyForm[f.k] = f.type === 'number' ? 0 : '');
    setEditForm(emptyForm);
  };

  const handleEdit = (row) => {
    setIsCreating(false);
    setEditingId(row.fbId);
    setEditForm(Utils.cleanData(row));
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        // 임의의 고유 ID(문서내 필드용) 발급 (기존 로직 호환)
        const newId = `${title.substring(0,1).toUpperCase()}${Date.now().toString().slice(-6)}`;
        await addDoc(collection(db, collectionName), { ...editForm, id: newId });
      } else {
        const ref = doc(db, collectionName, editingId);
        const { fbId, ...updateData } = editForm;
        await updateDoc(ref, updateData);
      }
      setEditingId(null);
      setIsCreating(false);
    } catch (e) {
      alert('저장 실패: ' + e.message);
    }
  };

  const handleDelete = async (fbId, name) => {
    if(!window.confirm(`[${name}] ${title} 데이터를 완전히 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, collectionName, fbId));
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={`${title} 검색...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => Utils.dlExcelCustom(`<table>...</table>`, `${title}목록`)} // 임시, 실제는 dlStyled 연동
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 shadow-sm transition-all"
          >
            엑셀 다운로드
          </button>
          <button 
            onClick={handleCreateNew}
            disabled={editingId === 'NEW'}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-black rounded-xl text-sm shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            <Plus size={18} /> 신규 등록
          </button>
        </div>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">데이터를 불러오는 중입니다...</div>
        ) : (
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">#</th>
                {fields.map(f => (
                  <th key={f.k} className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">{f.l}</th>
                ))}
                <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* 신규 등록 입력 행 */}
              {editingId === 'NEW' && (
                <tr className="bg-indigo-50/50 hover:bg-indigo-50 transition-colors animate-slide-down">
                  <td className="px-4 py-3 text-center text-xs font-black text-indigo-400">NEW</td>
                  {fields.map(f => (
                    <td key={f.k} className="px-4 py-2">
                      <input 
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={editForm[f.k] || ''}
                        onChange={e => setEditForm({...editForm, [f.k]: e.target.value})}
                        onKeyDown={Utils.enter}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold focus:border-indigo-500 outline-none shadow-inner"
                        placeholder={`${f.l} 입력`}
                        autoFocus={fields[0].k === f.k}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={handleSave} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"><Save size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X size={16} /></button>
                    </div>
                  </td>
                </tr>
              )}

              {/* 데이터 행 */}
              {filteredData.length === 0 && editingId !== 'NEW' ? (
                 <tr><td colSpan={fields.length + 2} className="px-4 py-12 text-center text-slate-400 font-bold">등록된 데이터가 없습니다.</td></tr>
              ) : (
                filteredData.map((row, idx) => {
                  const isEditing = editingId === row.fbId;
                  return (
                    <tr key={row.fbId} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-4 py-3 text-xs font-black text-slate-400">{idx + 1}</td>
                      
                      {fields.map(f => (
                        <td key={f.k} className="px-4 py-3 text-sm">
                          {isEditing ? (
                            <input 
                              type={f.type === 'number' ? 'number' : 'text'}
                              value={editForm[f.k] || ''}
                              onChange={e => setEditForm({...editForm, [f.k]: e.target.value})}
                              onKeyDown={Utils.enter}
                              className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-md font-bold focus:border-indigo-500 outline-none shadow-sm"
                            />
                          ) : (
                            <span className={`font-medium ${f.type === 'number' ? 'text-blue-600 font-bold' : 'text-slate-700'}`}>
                              {f.type === 'number' ? Utils.fmt(row[f.k]) : row[f.k] || '-'}
                            </span>
                          )}
                        </td>
                      ))}

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button onClick={handleSave} className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm"><Save size={14} /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEdit(row)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => handleDelete(row.fbId, row.name || '항목')} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
