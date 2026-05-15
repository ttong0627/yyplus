import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Utils } from '../../utils';
import { Ic } from '../../components/common/Icons';

const PKG_NUMS = [1, 2, 3, 4, 5, 6];
const PKG_TYPES = ['일반', '조제', '혼합', '완모', '직접입력'];

export default function PkgRegisterPage() {
  const { st, updateSt, showToast, showConfirm, globalMonth } = useApp();

  const [targetClient, setTargetClient] = useState('');
  const [editingPkg, setEditingPkg] = useState(null);
  const [newPkgModal, setNewPkgModal] = useState({ is: false, num: 1, type: '일반', customType: '', count: 0, round: 1, pkgNote: '' });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [bulkGrid, setBulkGrid] = useState(() => initBulkGrid());

  function initBulkGrid() {
    return PKG_NUMS.reduce((a, v) => ({
      ...a,
      [v]: v <= 3
        ? [{ id: Utils.genId(), type: '일반', q1: '', q2: '' }, { id: Utils.genId(), type: '조제', q1: '', q2: '' }, { id: Utils.genId(), type: '혼합', q1: '', q2: '' }, { id: Utils.genId(), type: '완모', q1: '', q2: '' }]
        : [{ id: Utils.genId(), type: '일반', q1: '', q2: '' }]
    }), {});
  }

  const getMappedWorkDate = useCallback((deliveryDateStr) => {
    if (!deliveryDateStr) return null;
    const override = (st.workSchedules || []).find(ws => ws?.deliveryDate === deliveryDateStr);
    if (override) return override.workDate;
    return Utils.calculateWorkDate(deliveryDateStr);
  }, [st.workSchedules]);

  const getMappedItem = useCallback((clientId, itemId, mappingUid = null) => {
    const masterItem = (st.items || []).find(i => i?.id === itemId) || {};
    const clientMap = (st.mappings || []).find(m => m?.clientId === clientId && m?.month === globalMonth)
      || (st.mappings || []).find(m => m?.clientId === clientId);
    let mapped = null;
    if (clientMap) {
      if (mappingUid) mapped = (clientMap.mappedItems || []).find(m => m?.uid === mappingUid);
      if (!mapped) mapped = (clientMap.mappedItems || []).find(m => m?.itemId === itemId);
    }
    return {
      itemId, mappingUid: mapped?.uid || mappingUid,
      category: masterItem?.category || '미분류',
      name: mapped?.clientItemName || masterItem?.name || '알수없는 품목',
      unit: masterItem?.unit || '',
      orderUnit: mapped?.orderUnit || 1
    };
  }, [st.items, st.mappings, globalMonth]);

  const currentPackages = useMemo(() => {
    const pkgs = (st.packageOrders || []).filter(p =>
      p?.month === globalMonth && (!targetClient || p?.clientId === targetClient)
    );
    if (targetClient) {
      const hasC23 = pkgs.some(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통');
      const hasC46 = pkgs.some(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');
      if (!hasC46) pkgs.unshift({ id: 'VIRTUAL_C46', clientId: targetClient, month: globalMonth, round: 0, pkgGroup: '산모용 (4~6)', pkgNum: '4~6공통', pkgType: '공통', personCount: '-', items: [] });
      if (!hasC23) pkgs.unshift({ id: 'VIRTUAL_C23', clientId: targetClient, month: globalMonth, round: 0, pkgGroup: '아기용 (2~3)', pkgNum: '2~3공통', pkgType: '공통', personCount: '-', items: [] });
    }
    return pkgs;
  }, [st.packageOrders, globalMonth, targetClient]);

  const getPkgItemCount = useCallback((pkg) => {
    if (!pkg?.items) return 0;
    let count = (pkg.items).filter(i => (i?.qtyPerPerson && Number(i?.qtyPerPerson) > 0) || (i?.note && String(i?.note).trim() !== '')).length;
    if (pkg.pkgType !== '공통' && !String(pkg.pkgNum).startsWith('4-1')) {
      const common23 = currentPackages.find(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통');
      const common46 = currentPackages.find(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');
      if ((pkg.pkgNum == 2 || pkg.pkgNum == 3) && common23?.items) count += common23.items.filter(i => (i?.qtyPerPerson && Number(i?.qtyPerPerson) > 0) || (i?.note && String(i?.note).trim() !== '')).length;
      if (pkg.pkgNum >= 4 && pkg.pkgNum <= 6 && common46?.items) count += common46.items.filter(i => (i?.qtyPerPerson && Number(i?.qtyPerPerson) > 0) || (i?.note && String(i?.note).trim() !== '')).length;
    }
    return count;
  }, [currentPackages]);

  const handleAddPackage = (e) => {
    if (e) e.preventDefault();
    if (!targetClient) return showToast('보건소를 선택해주세요.', 'warn');
    if (newPkgModal.count <= 0) return showToast('수량을 입력해주세요.', 'warn');
    const finalType = newPkgModal.type === '직접입력' ? newPkgModal.customType : newPkgModal.type;
    if (!String(finalType).trim()) return showToast('상세 타입을 입력해주세요.', 'warn');
    const derivedGroup = newPkgModal.num <= 3 ? '아기용 (1~3)' : '산모용 (4~6)';
    const newPkg = {
      id: `PKG_${Date.now()}_${Utils.genId()}`, clientId: targetClient, month: globalMonth,
      round: newPkgModal.round, pkgGroup: derivedGroup, pkgNum: newPkgModal.num,
      pkgType: finalType, personCount: Number(newPkgModal.count), items: [], pkgNote: newPkgModal.pkgNote
    };
    updateSt('packageOrders', [...(st.packageOrders || []), newPkg]);
    setNewPkgModal({ ...newPkgModal, is: false, count: 0, customType: '', pkgNote: '' });
    showToast('패키지가 생성되었습니다.', 'success');
  };

  const deletePackage = (id) => {
    showConfirm('패키지를 삭제하시겠습니까?', () => {
      updateSt('packageOrders', (st.packageOrders || []).filter(p => p?.id !== id));
      if (editingPkg?.id === id) setEditingPkg(null);
    });
  };

  const savePackageItems = useCallback((nxItems) => {
    if (String(editingPkg?.id || '').startsWith('VIRTUAL_')) {
      const realId = `PKG_${Date.now()}_${Utils.genId()}`;
      const newPkg = { ...editingPkg, id: realId, items: nxItems };
      updateSt('packageOrders', [...(st.packageOrders || []), newPkg]);
      setEditingPkg(newPkg);
    } else {
      updateSt('packageOrders', (st.packageOrders || []).map(p => p?.id === editingPkg?.id ? { ...editingPkg, items: nxItems } : p));
      setEditingPkg({ ...editingPkg, items: nxItems });
    }
  }, [editingPkg, st.packageOrders, updateSt]);

  const handleItemInput = useCallback((mit, field, val) => {
    if (!editingPkg) return;
    let nx = [...(editingPkg.items || [])];
    const existingIdx = mit?.isManual
      ? nx.findIndex(i => i?.isManual && i?.uid === mit?.uid)
      : nx.findIndex(i => !i?.isManual && (i?.mappingUid === mit?.uid || (!i?.mappingUid && i?.itemId === mit?.itemId)));
    if (existingIdx >= 0) {
      if (field === 'qtyPerPerson' && (val === '' || Number(val) <= 0) && !nx[existingIdx]?.note && !mit?.isManual) {
        nx.splice(existingIdx, 1);
      } else {
        nx[existingIdx] = { ...nx[existingIdx], [field]: val, mappingUid: mit?.isManual ? null : mit?.uid };
      }
    } else {
      if (val !== '' && (field === 'qtyPerPerson' ? Number(val) > 0 : true)) {
        nx.push({
          uid: mit?.isManual ? mit?.uid : `U_${Date.now()}_${Math.random()}`,
          mappingUid: mit?.isManual ? null : mit?.uid,
          itemId: mit?.itemId, qtyPerPerson: field === 'qtyPerPerson' ? val : '',
          note: field === 'note' ? val : '', isManual: mit?.isManual,
          manualUnit: field === 'manualUnit' ? val : (mit?.manualUnit || ''),
          manualOrderUnit: field === 'manualOrderUnit' ? val : (mit?.manualOrderUnit || '')
        });
      }
    }
    savePackageItems(nx);
  }, [editingPkg, savePackageItems]);

  const addManualItem = (itemId) => {
    if (!editingPkg || !itemId) return;
    const nx = [...(editingPkg.items || [])];
    nx.push({ uid: `U_MANUAL_${Date.now()}_${Math.random()}`, mappingUid: null, itemId, qtyPerPerson: '', note: '', isManual: true, manualUnit: '', manualOrderUnit: '' });
    savePackageItems(nx);
  };

  const handleNameChange = (mappingUid, newName) => {
    const nxMappings = [...(st.mappings || [])];
    const cIdx = nxMappings.findIndex(m => m?.clientId === targetClient);
    if (cIdx >= 0) {
      const iIdx = (nxMappings[cIdx]?.mappedItems || []).findIndex(i => i?.uid === mappingUid);
      if (iIdx >= 0) { nxMappings[cIdx].mappedItems[iIdx].clientItemName = newName; updateSt('mappings', nxMappings); }
    }
  };

  const handleCopyPackage = (sourcePkg) => {
    if (!editingPkg) return;
    const copiedItems = (sourcePkg?.items || []).map(it => ({ ...it, uid: `U_${Date.now()}_${Math.random()}` }));
    const updatedPkg = { ...editingPkg, items: copiedItems };
    updateSt('packageOrders', (st.packageOrders || []).map(p => p?.id === updatedPkg.id ? updatedPkg : p));
    setEditingPkg(updatedPkg);
    setShowCopyModal(false);
    showToast('구성이 복사되었습니다.', 'success');
  };

  const updatePackageMeta = (field, val) => {
    if (!editingPkg || editingPkg.pkgType === '공통') return;
    const updatedPkg = { ...editingPkg, [field]: field === 'personCount' ? (Number(val) || 0) : val };
    updateSt('packageOrders', (st.packageOrders || []).map(p => p?.id === editingPkg?.id ? updatedPkg : p));
    setEditingPkg(updatedPkg);
  };

  // Bulk grid handlers
  const handleBulkUpdate = (num, id, field, val) => setBulkGrid(prev => ({ ...prev, [num]: (prev[num] || []).map(item => item?.id === id ? { ...item, [field]: val } : item) }));
  const handleBulkAddRow = (num) => setBulkGrid(prev => ({ ...prev, [num]: [...(prev[num] || []), { id: Utils.genId(), type: '', q1: '', q2: '', isCustom: true }] }));
  const handleBulkRemoveRow = (num, id) => setBulkGrid(prev => ({ ...prev, [num]: (prev[num] || []).filter(item => item?.id !== id) }));

  const openBulkModal = () => {
    if (!targetClient) return showToast('보건소를 먼저 선택해 주세요.', 'warn');
    const newGrid = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const defaults = { 1: ['일반', '조제', '혼합', '완모'], 2: ['일반', '조제', '혼합', '완모'], 3: ['일반', '조제', '혼합', '완모'], 4: ['일반'], 5: ['일반'], 6: ['일반'] };
    const existing = {};
    (st.packageOrders || []).filter(p => p?.clientId === targetClient && p?.month === globalMonth && p?.pkgType !== '공통').forEach(p => {
      const num = Number(p?.pkgNum);
      if (isNaN(num) || !PKG_NUMS.includes(num)) return;
      const key = `${num}_${p?.pkgType || '일반'}`;
      if (!existing[key]) existing[key] = { q1: '', q2: '', p1: null, p2: null };
      if (p?.round === 1) { existing[key].q1 = p?.personCount; existing[key].p1 = p; }
      if (p?.round === 2) { existing[key].q2 = p?.personCount; existing[key].p2 = p; }
    });
    PKG_NUMS.forEach(num => {
      const typesToAdd = new Set(defaults[num]);
      Object.keys(existing).forEach(k => { const parts = k.split('_'); if (parts.length >= 2 && Number(parts[0]) === num) typesToAdd.add(parts.slice(1).join('_')); });
      Array.from(typesToAdd).forEach(type => {
        const ex = existing[`${num}_${type}`] || {};
        newGrid[num].push({ id: Utils.genId(), type, q1: ex.q1 || '', q2: ex.q2 || '', p1: ex.p1 || null, p2: ex.p2 || null, isCustom: !defaults[num].includes(type) });
      });
    });
    setBulkGrid(newGrid);
    setShowBulkModal(true);
  };

  const handleBulkSave = () => {
    let updated = [...(st.packageOrders || [])];
    const toDelete = new Set();
    const toAddOrUpdate = [];
    PKG_NUMS.forEach(num => {
      const groupName = num <= 3 ? '아기용 (1~3)' : '산모용 (4~6)';
      (bulkGrid[num] || []).forEach(sub => {
        const q1 = Number(sub?.q1) || 0, q2 = Number(sub?.q2) || 0, typeName = String(sub?.type || '').trim() || '일반';
        if (q1 > 0) {
          if (sub?.p1) toAddOrUpdate.push({ ...sub.p1, personCount: q1, pkgType: typeName });
          else toAddOrUpdate.push({ id: `PKG_${Date.now()}_${Utils.genId()}`, clientId: targetClient, month: globalMonth, round: 1, pkgGroup: groupName, pkgNum: num, pkgType: typeName, personCount: q1, items: [], pkgNote: '' });
        } else if (sub?.p1) toDelete.add(sub.p1.id);
        if (q2 > 0) {
          if (sub?.p2) toAddOrUpdate.push({ ...sub.p2, personCount: q2, pkgType: typeName });
          else toAddOrUpdate.push({ id: `PKG_${Date.now()}_${Utils.genId()}`, clientId: targetClient, month: globalMonth, round: 2, pkgGroup: groupName, pkgNum: num, pkgType: typeName, personCount: q2, items: [], pkgNote: '' });
        } else if (sub?.p2) toDelete.add(sub.p2.id);
      });
    });
    updated = updated.filter(p => !toDelete.has(p?.id));
    toAddOrUpdate.forEach(newP => { const idx = updated.findIndex(p => p?.id === newP?.id); if (idx >= 0) updated[idx] = newP; else updated.push(newP); });
    updateSt('packageOrders', updated);
    setShowBulkModal(false);
    showToast('일괄 작업이 완료되었습니다.', 'success');
  };

  const sortedClients = useMemo(() => {
    return (st.clients || []).map(c => {
      const ord = (st.clientOrders || []).find(o => o?.clientId === c?.id && o?.month === globalMonth);
      const d1 = ord ? getMappedWorkDate(ord?.deliveryDate1) || '9999-99-99' : '9999-99-99';
      return { ...c, _sortDate: d1 };
    }).filter(Boolean).sort((a, b) => a._sortDate.localeCompare(b._sortDate) || (a?.name || '').localeCompare(b?.name || ''));
  }, [st.clients, st.clientOrders, globalMonth, getMappedWorkDate]);

  // Editor section: get items for the editing package
  const editorContent = useMemo(() => {
    if (!editingPkg || !targetClient) return null;
    const targetMonthMap = (st.mappings || []).find(m => m?.clientId === targetClient && m?.month === globalMonth);
    const clientMappedItems = targetMonthMap?.mappedItems || [];
    const common23 = currentPackages.find(p => p?.pkgType === '공통' && p?.pkgNum === '2~3공통');
    const common46 = currentPackages.find(p => p?.pkgType === '공통' && p?.pkgNum === '4~6공통');
    let applicableCommonItems = [];
    if (editingPkg.pkgType !== '공통') {
      const dn = editingPkg.pkgType === '일반' ? `${editingPkg?.pkgNum}패키지` : `${editingPkg?.pkgNum}-${editingPkg?.pkgType}`;
      if (!String(dn).startsWith('4-1')) {
        if (editingPkg?.pkgNum === 2 || editingPkg?.pkgNum === 3) applicableCommonItems = common23?.items || [];
        if (editingPkg?.pkgNum >= 4 && editingPkg?.pkgNum <= 6) applicableCommonItems = common46?.items || [];
      }
    }
    const commonMappingUids = applicableCommonItems.map(ci => ci?.mappingUid).filter(Boolean);
    const displayedItems = editingPkg?.pkgType === '공통' ? clientMappedItems : clientMappedItems.filter(mi => !commonMappingUids.includes(mi?.uid));
    const manualItems = (editingPkg?.items || []).filter(ei => ei?.isManual);
    const getQty = (mit) => (editingPkg?.items || []).find(i => i?.isManual ? i?.uid === mit?.uid : (i?.mappingUid === mit?.uid || (!i?.mappingUid && i?.itemId === mit?.itemId)))?.qtyPerPerson || '';
    const getNote = (mit) => (editingPkg?.items || []).find(i => i?.isManual ? i?.uid === mit?.uid : (i?.mappingUid === mit?.uid || (!i?.mappingUid && i?.itemId === mit?.itemId)))?.note || '';
    const selectedItems = displayedItems.filter(mit => !!getQty(mit) || !!getNote(mit));
    const unselectedItems = displayedItems.filter(mit => !getQty(mit) && !getNote(mit));
    return { clientMappedItems, applicableCommonItems, displayedItems, manualItems, selectedItems, unselectedItems, getQty, getNote };
  }, [editingPkg, targetClient, st.mappings, globalMonth, currentPackages]);

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-120px)]">
      {/* 1. 보건소 선택 */}
      <div className="w-full lg:w-52 shrink-0 flex flex-col gap-3 bg-slate-800 p-4 rounded-2xl border border-slate-700">
        <div className="shrink-0">
          <h3 className="font-black text-sm text-white mb-2 flex items-center gap-1.5">{Ic.Bldg} 1. 보건소 선택</h3>
          <div className="text-lg font-black text-indigo-400 bg-slate-900 border border-slate-700 px-3 py-3 rounded-xl text-center">
            {globalMonth.replace('-', '년 ')}월
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sortedClients.map(c => {
            const isReg = (st.packageOrders || []).some(p => p?.clientId === c?.id && p?.month === globalMonth && p?.pkgType !== '공통' && (p?.items || []).length > 0);
            return (
              <button key={c?.id} onClick={() => { setTargetClient(c?.id); setEditingPkg(null); }}
                className={`w-full p-2.5 text-left rounded-xl text-xs font-black transition-all border flex items-center justify-between
                  ${targetClient === c?.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 hover:bg-slate-700 border-slate-700'}`}>
                <div>
                  <div className="truncate">{c?.name}</div>
                  {c._sortDate !== '9999-99-99' && <div className={`text-[10px] mt-0.5 ${targetClient === c?.id ? 'text-indigo-200' : 'text-slate-500'}`}>1차: {c._sortDate.substring(5)}</div>}
                </div>
                {isReg && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">완료</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 패키지 목록 */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col bg-slate-800 p-4 rounded-2xl border border-slate-700">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="font-black text-sm text-white flex items-center gap-1.5">{Ic.Box} 2. 패키지 선택</h3>
          {targetClient && (
            <div className="flex gap-1.5">
              <button onClick={openBulkModal} className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black">{Ic.ListP} 일괄</button>
              <button onClick={() => setNewPkgModal({ ...newPkgModal, is: true, round: 1 })} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-black">{Ic.Plus}</button>
            </div>
          )}
        </div>

        {!targetClient ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-bold">보건소를 선택하세요</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* 공통 패키지 */}
            {currentPackages.filter(p => p?.pkgType === '공통').map(pkg => {
              const isBaby = String(pkg?.pkgGroup || '').includes('아기');
              return (
                <div key={pkg?.id} onClick={() => setEditingPkg(pkg)}
                  className={`p-2 rounded-lg cursor-pointer border transition-all flex justify-between items-center border-l-4
                    ${isBaby ? 'border-l-pink-500' : 'border-l-teal-500'}
                    ${editingPkg?.id === pkg?.id ? 'ring-2 ring-indigo-500 bg-slate-900 border-slate-600' : 'bg-slate-900 border-slate-700 hover:bg-slate-700'}`}>
                  <div>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black text-white mr-1.5 ${isBaby ? 'bg-pink-500' : 'bg-teal-500'}`}>공통</span>
                    <span className="font-black text-[11px] text-slate-200">{pkg?.pkgGroup}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600">{getPkgItemCount(pkg)}품목</span>
                </div>
              );
            })}

            {/* 1차/2차 패키지 */}
            {[1, 2].map(round => {
              const roundPkgs = currentPackages.filter(p => p?.round === round && p?.pkgType !== '공통').sort((a, b) => Number(a?.pkgNum || 0) - Number(b?.pkgNum || 0));
              return (
                <div key={round}>
                  <div className={`flex items-center justify-between py-1.5 px-2 rounded-md border mb-1.5 ${round === 1 ? 'border-blue-500/30 bg-blue-900/20' : 'border-emerald-500/30 bg-emerald-900/20'}`}>
                    <span className={`text-[10px] font-black ${round === 1 ? 'text-blue-400' : 'text-emerald-400'}`}>{round === 1 ? '🔵 1차' : '🟢 2차'} 배송</span>
                    <button onClick={() => setNewPkgModal({ is: true, round, num: 1, type: '일반', customType: '', count: 0, pkgNote: '' })}
                      className="text-[9px] font-black bg-slate-900 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/50 hover:bg-indigo-600 hover:text-white">
                      + 추가
                    </button>
                  </div>
                  <div className="space-y-1">
                    {roundPkgs.map(pkg => {
                      const dn = pkg?.pkgType === '일반' ? `${pkg?.pkgNum}패키지` : `${pkg?.pkgNum}-${pkg?.pkgType}`;
                      return (
                        <div key={pkg?.id} onClick={() => setEditingPkg(pkg)}
                          className={`p-2 rounded-lg cursor-pointer border transition-all flex items-center justify-between
                            ${editingPkg?.id === pkg?.id ? 'ring-2 ring-indigo-500 bg-slate-900 border-slate-600' : 'bg-slate-900 border-slate-700 hover:bg-slate-700'}`}>
                          <div>
                            <span className="font-black text-xs text-slate-200">{dn}</span>
                            {pkg?.pkgNote && <div className="text-[9px] text-rose-400 mt-0.5 truncate max-w-[140px]">🚨 {pkg?.pkgNote}</div>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-black text-indigo-400">{pkg?.personCount}개</span>
                            <button onClick={e => { e.stopPropagation(); deletePackage(pkg?.id); }} className="text-rose-500 hover:text-rose-400 p-0.5">{Ic.Trash}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 패키지 품목 편집 */}
      <div className="flex-1 flex flex-col bg-slate-800 p-4 rounded-2xl border border-slate-700 min-w-0 overflow-hidden">
        {!editingPkg ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="bg-slate-900 border border-slate-700 p-5 rounded-full mb-4">{Ic.ListP}</div>
            <p className="font-bold text-sm">2단계에서 편집할 패키지를 클릭하세요.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-sm">
                  {editingPkg.pkgType === '공통' ? editingPkg.pkgGroup : `${editingPkg.round}차 ${editingPkg.pkgType === '일반' ? editingPkg.pkgNum + '패키지' : editingPkg.pkgNum + '-' + editingPkg.pkgType}`}
                </h3>
                {editingPkg.pkgType !== '공통' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-bold">수량</span>
                    <input type="number" onWheel={e=>e.target.blur()} value={editingPkg.personCount || ''} onChange={e=>updatePackageMeta('personCount', e.target.value)}
                      className="w-16 text-center text-sm font-black bg-slate-900 border border-slate-700 rounded-lg py-1 text-indigo-400 outline-none focus:border-indigo-500" />
                    <span className="text-xs text-slate-400">개</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setShowCopyModal(true)} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-black flex items-center gap-1">{Ic.Copy} 복사</button>
              </div>
            </div>

            {/* 특이사항 */}
            {editingPkg.pkgType !== '공통' && (
              <input type="text" placeholder="🚨 패키지 특이사항 (예: 문앞 금지)" value={editingPkg.pkgNote || ''}
                onChange={e=>updatePackageMeta('pkgNote', e.target.value)}
                className="input-base w-full mb-3 text-xs text-rose-300 border-rose-500/30 bg-rose-500/10 placeholder-rose-500/50 focus:border-rose-500 shrink-0" />
            )}

            {/* 돌발품목 강제추가 */}
            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700 mb-3 shrink-0">
              <span className="text-[10px] font-black text-amber-500 pl-1 shrink-0">➕ 돌발품목</span>
              <select onChange={e => { addManualItem(e.target.value); e.target.value = ''; }}
                className="flex-1 text-xs font-black outline-none bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-200 cursor-pointer focus:border-indigo-500">
                <option value="">-- DB 전체 마스터 품목에서 검색 --</option>
                {(st.items || []).map(m => <option key={m?.id} value={m?.id}>[{m?.category}] {m?.name}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {editorContent?.applicableCommonItems?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg mb-2 border border-amber-500/20">⭐ 자동 적용 공통 품목</div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5">
                    {editorContent.applicableCommonItems.map(cit => {
                      const mapped = getMappedItem(targetClient, cit?.itemId, cit?.mappingUid);
                      const du = Utils.getDisplayOrderUnit(mapped?.orderUnit, mapped?.unit);
                      return (
                        <div key={`c-${cit?.mappingUid || cit?.itemId}`} className="flex items-center justify-between px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl opacity-70">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-black text-slate-300 text-xs truncate max-w-[100px]">{mapped?.name}</span>
                            {du && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0.5 rounded font-black shrink-0">{du}</span>}
                          </div>
                          <div className="w-8 text-center font-black text-slate-400 bg-slate-800 border border-slate-600 py-0.5 rounded text-xs shrink-0">{cit?.qtyPerPerson}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 선택된 품목 */}
              {(editorContent?.manualItems?.length > 0 || editorContent?.selectedItems?.length > 0) && (
                <div className="text-xs font-black text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg mb-1.5 border border-indigo-500/20">✓ 패키지 구성품</div>
              )}

              {editorContent?.manualItems?.map(mit => {
                const isSelected = !!mit?.qtyPerPerson || !!mit?.note;
                return (
                  <div key={`manual-${mit?.uid}`} className={`flex items-center gap-1.5 p-1.5 rounded-xl border transition-all ${isSelected ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-700 bg-slate-900'}`}>
                    <select value={mit?.itemId || ''} onChange={e => handleItemInput({ ...mit, itemId: e.target.value }, 'qtyPerPerson', mit?.qtyPerPerson)}
                      className={`w-28 text-xs font-black outline-none bg-transparent cursor-pointer truncate ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>
                      <option value="">-- 마스터 품목 --</option>
                      {(st.items || []).map(m => <option key={m?.id} value={m?.id}>[{m?.category}] {m?.name}</option>)}
                    </select>
                    <input type="text" placeholder="단위" value={mit?.manualUnit || ''} onChange={e => handleItemInput(mit, 'manualUnit', e.target.value)} className="w-12 p-1 text-center text-[10px] font-bold rounded outline-none bg-slate-800 text-amber-300 border border-amber-500/30" />
                    <input type="number" onWheel={e=>e.target.blur()} placeholder="수량" value={mit?.qtyPerPerson || ''} onChange={e => handleItemInput(mit, 'qtyPerPerson', e.target.value)} className="w-12 p-1.5 text-center text-sm font-black rounded-lg outline-none bg-slate-800 text-amber-400 border border-amber-500/50" />
                    <input type="text" placeholder="특이사항" value={mit?.note || ''} onChange={e => handleItemInput(mit, 'note', e.target.value)} className="flex-1 p-1.5 text-[10px] font-bold rounded-lg outline-none bg-slate-800 text-amber-400 border border-amber-500/30 min-w-0" />
                    <button onClick={() => { handleItemInput(mit, 'qtyPerPerson', ''); handleItemInput(mit, 'note', ''); }} className="text-rose-400 hover:bg-rose-500 hover:text-white p-1 rounded-lg transition-colors shrink-0">{Ic.Trash}</button>
                  </div>
                );
              })}

              {editorContent?.selectedItems?.map(mit => {
                const mappedInfo = getMappedItem(targetClient, mit?.itemId, mit?.uid);
                const du = Utils.getDisplayOrderUnit(mappedInfo?.orderUnit, mappedInfo?.unit);
                return (
                  <div key={`ms-${mit?.uid}`} className="flex items-center gap-1.5 p-1.5 rounded-xl border border-indigo-500/50 bg-indigo-500/10">
                    <input type="text" value={mappedInfo?.name || ''} onChange={e => handleNameChange(mit?.uid, e.target.value)}
                      className="w-28 text-xs font-black outline-none bg-transparent text-indigo-100 truncate" />
                    {du && <span className="text-[9px] font-black text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0">{du}</span>}
                    <input type="number" onWheel={e=>e.target.blur()} placeholder="수량" value={editorContent.getQty(mit)} onChange={e => handleItemInput(mit, 'qtyPerPerson', e.target.value)} className="w-12 p-1.5 text-center text-sm font-black rounded-lg outline-none bg-slate-800 text-indigo-300 border border-indigo-500/50" />
                    <input type="text" placeholder="특이사항" value={editorContent.getNote(mit)} onChange={e => handleItemInput(mit, 'note', e.target.value)} className="flex-1 p-1.5 text-[10px] font-bold rounded-lg outline-none bg-slate-800 text-indigo-200 border border-indigo-500/30 min-w-0" />
                    <button onClick={() => { handleItemInput(mit, 'qtyPerPerson', ''); handleItemInput(mit, 'note', ''); }} className="text-rose-400 hover:bg-rose-500 hover:text-white p-1 rounded-lg shrink-0">{Ic.Trash}</button>
                  </div>
                );
              })}

              {editorContent?.unselectedItems?.length > 0 && (
                <div className="text-xs font-black text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg mt-3 mb-1.5 border border-slate-700">추가 가능한 품목</div>
              )}
              {editorContent?.unselectedItems?.map(mit => {
                const mappedInfo = getMappedItem(targetClient, mit?.itemId, mit?.uid);
                const du = Utils.getDisplayOrderUnit(mappedInfo?.orderUnit, mappedInfo?.unit);
                return (
                  <div key={`mu-${mit?.uid}`} className="flex items-center gap-1.5 p-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-500 transition-all">
                    <input type="text" value={mappedInfo?.name || ''} onChange={e => handleNameChange(mit?.uid, e.target.value)} className="w-28 text-xs font-black outline-none bg-transparent text-slate-300 truncate" />
                    {du && <span className="text-[9px] font-black text-indigo-400 bg-indigo-900/20 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0">{du}</span>}
                    <input type="number" onWheel={e=>e.target.blur()} placeholder="수량" value="" onChange={e => handleItemInput(mit, 'qtyPerPerson', e.target.value)} className="w-12 p-1.5 text-center text-sm font-black rounded-lg outline-none bg-slate-800 text-slate-200 border border-slate-600 focus:border-indigo-500" />
                    <input type="text" placeholder="특이사항" value="" onChange={e => handleItemInput(mit, 'note', e.target.value)} className="flex-1 p-1.5 text-[10px] font-bold rounded-lg outline-none bg-slate-800 text-slate-300 border border-slate-600 focus:border-indigo-500 min-w-0" />
                    <div className="w-7 shrink-0" />
                  </div>
                );
              })}

              {!editorContent?.clientMappedItems?.length && !editorContent?.manualItems?.length && (
                <div className="text-center text-slate-500 text-xs font-bold py-8">품목 매핑 데이터가 없습니다.</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 새 패키지 모달 */}
      {newPkgModal.is && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700 shadow-2xl border-t-8 border-t-indigo-500">
            <button onClick={() => setNewPkgModal({ ...newPkgModal, is: false })} className="absolute top-6 right-6 p-2 bg-slate-700 rounded-full hover:bg-rose-500 text-slate-400 hover:text-white">{Ic.X}</button>
            <h3 className="text-lg font-black text-white mb-6">{newPkgModal.round}차 패키지 생성</h3>
            <form onSubmit={handleAddPackage} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1">패키지 번호</label>
                <select value={newPkgModal.num} onChange={e => setNewPkgModal({ ...newPkgModal, num: Number(e.target.value) })} className="input-base w-full">
                  {PKG_NUMS.map(n => <option key={n} value={n}>{n} 패키지</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1">상세 타입</label>
                <select value={newPkgModal.type} onChange={e => setNewPkgModal({ ...newPkgModal, type: e.target.value })} className="input-base w-full mb-2">
                  {PKG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {newPkgModal.type === '직접입력' && (
                  <input type="text" value={newPkgModal.customType} onChange={e => setNewPkgModal({ ...newPkgModal, customType: e.target.value })} placeholder="직접 입력" className="input-base w-full mb-2" required autoFocus />
                )}
                <input type="text" value={newPkgModal.pkgNote} onChange={e => setNewPkgModal({ ...newPkgModal, pkgNote: e.target.value })} placeholder="특이사항 (예: 문앞 금지)" className="input-base w-full border-rose-500/30 bg-rose-500/10 text-rose-300 placeholder-rose-500/50 focus:border-rose-500" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1">패키지 수량</label>
                <input type="number" onWheel={e=>e.target.blur()} min="1" value={newPkgModal.count || ''} onChange={e => setNewPkgModal({ ...newPkgModal, count: e.target.value })} placeholder="0" className="input-base w-full text-center text-xl font-black text-indigo-400" required />
              </div>
              <button type="submit" className="btn-primary w-full mt-4">이 설정으로 생성하기</button>
            </form>
          </div>
        </div>
      )}

      {/* 복사 모달 */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md border border-slate-700 shadow-2xl max-h-[80vh] flex flex-col border-t-8 border-t-indigo-500">
            <button onClick={() => setShowCopyModal(false)} className="absolute top-6 right-6 p-2 bg-slate-700 rounded-full hover:bg-rose-500 text-slate-400 hover:text-white">{Ic.X}</button>
            <h3 className="text-lg font-black text-white mb-4">구성 복사하기</h3>
            <div className="flex-1 overflow-y-auto space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-700">
              {(st.packageOrders || []).filter(p => p.id !== editingPkg?.id && p.items?.length > 0)
                .sort((a, b) => (b.month || '').localeCompare(a.month || ''))
                .map(pkg => (
                  <div key={pkg.id} onClick={() => handleCopyPackage(pkg)}
                    className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-indigo-400 cursor-pointer transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{pkg.month} ({pkg.round}차)</span>
                      <span className="text-xs text-slate-400">{(st.clients || []).find(c => c.id === pkg.clientId)?.shortName}</span>
                    </div>
                    <h4 className="font-black text-slate-200">{pkg.pkgNum}패키지 ({pkg.pkgType})</h4>
                    <p className="text-xs text-slate-500 mt-1">{pkg.items?.length}개 품목</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 일괄 생성 모달 */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col border-t-8 border-t-indigo-500 border border-slate-700">
            <button onClick={() => setShowBulkModal(false)} className="absolute top-6 right-6 p-2 bg-slate-700 rounded-full hover:bg-rose-500 text-slate-400 hover:text-white z-10">{Ic.X}</button>
            <div className="flex-none p-6 pb-4 border-b border-slate-700">
              <h3 className="text-xl font-black text-white mb-1">1~6패키지 수량 일괄 생성</h3>
              <p className="text-xs font-bold text-slate-400">좌측: <span className="text-blue-400">1차 배송</span>, 우측: <span className="text-emerald-400">2차 배송</span> 수량</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
              <div className="flex flex-col xl:flex-row gap-4">
                {/* 1차 */}
                <div className="flex-1 bg-slate-800 rounded-2xl border border-blue-500/30 overflow-hidden">
                  <div className="bg-blue-600/20 border-b border-blue-500/30 text-blue-300 text-center py-3 font-black">🔵 1차 배송</div>
                  <div className="p-4 space-y-4">
                    {PKG_NUMS.map(num => (
                      <div key={num} className="border border-slate-700 rounded-xl p-3 bg-slate-900">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-black text-sm text-white">{num} 패키지 <span className="text-xs text-slate-500">{num <= 3 ? '(아기용)' : '(산모용)'}</span></h4>
                          <button onClick={() => handleBulkAddRow(num)} className="text-[10px] bg-slate-800 border border-slate-600 text-indigo-400 px-2 py-1 rounded font-black hover:bg-indigo-600 hover:text-white">{Ic.Plus} 추가</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(bulkGrid[num] || []).map(sub => (
                            <div key={`s1-${sub?.id}`} className="flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-lg p-1.5 min-w-[140px] focus-within:border-blue-500">
                              <span className="font-black text-slate-400 text-xs">{num}-</span>
                              {sub?.isCustom ? (
                                <input type="text" value={sub?.type} onChange={e => handleBulkUpdate(num, sub?.id, 'type', e.target.value)} placeholder="이름" className="w-14 text-xs font-black border-b border-slate-600 outline-none text-center text-white bg-transparent" />
                              ) : (
                                <span className="text-sm font-black text-slate-200 px-1">{sub?.type}</span>
                              )}
                              <input type="number" onWheel={e=>e.target.blur()} value={sub?.q1 || ''} onChange={e => handleBulkUpdate(num, sub?.id, 'q1', e.target.value)} placeholder="0" className="flex-1 w-12 text-base font-black text-center outline-none bg-slate-900 border border-transparent focus:border-blue-500 text-blue-400 rounded-lg py-1" />
                              {sub?.isCustom && <button onClick={() => handleBulkRemoveRow(num, sub?.id)} className="text-rose-400 hover:bg-rose-500 hover:text-white p-0.5 rounded">{Ic.X}</button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 2차 */}
                <div className="flex-1 bg-slate-800 rounded-2xl border border-emerald-500/30 overflow-hidden">
                  <div className="bg-emerald-600/20 border-b border-emerald-500/30 text-emerald-300 text-center py-3 font-black">🟢 2차 배송</div>
                  <div className="p-4 space-y-4">
                    {PKG_NUMS.map(num => (
                      <div key={num} className="border border-slate-700 rounded-xl p-3 bg-slate-900">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-black text-sm text-white">{num} 패키지 <span className="text-xs text-slate-500">{num <= 3 ? '(아기용)' : '(산모용)'}</span></h4>
                          <button onClick={() => handleBulkAddRow(num)} className="text-[10px] bg-slate-800 border border-slate-600 text-indigo-400 px-2 py-1 rounded font-black hover:bg-indigo-600 hover:text-white">{Ic.Plus} 추가</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(bulkGrid[num] || []).map(sub => (
                            <div key={`s2-${sub?.id}`} className="flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-lg p-1.5 min-w-[140px] focus-within:border-emerald-500">
                              <span className="font-black text-slate-400 text-xs">{num}-</span>
                              {sub?.isCustom ? (
                                <input type="text" value={sub?.type} onChange={e => handleBulkUpdate(num, sub?.id, 'type', e.target.value)} placeholder="이름" className="w-14 text-xs font-black border-b border-slate-600 outline-none text-center text-white bg-transparent" />
                              ) : (
                                <span className="text-sm font-black text-slate-200 px-1">{sub?.type}</span>
                              )}
                              <input type="number" onWheel={e=>e.target.blur()} value={sub?.q2 || ''} onChange={e => handleBulkUpdate(num, sub?.id, 'q2', e.target.value)} placeholder="0" className="flex-1 w-12 text-base font-black text-center outline-none bg-slate-900 border border-transparent focus:border-emerald-500 text-emerald-400 rounded-lg py-1" />
                              {sub?.isCustom && <button onClick={() => handleBulkRemoveRow(num, sub?.id)} className="text-rose-400 hover:bg-rose-500 hover:text-white p-0.5 rounded">{Ic.X}</button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-none p-4 border-t border-slate-700 bg-slate-800 flex justify-between items-center rounded-b-2xl">
              <button onClick={() => { if (window.confirm('입력값을 모두 초기화하시겠습니까?')) { const nx = { ...bulkGrid }; PKG_NUMS.forEach(n => nx[n] = (nx[n]||[]).map(i=>({...i,q1:'',q2:''}))); setBulkGrid(nx); } }} className="btn-danger text-sm">{Ic.Trash} 전체 초기화</button>
              <button onClick={handleBulkSave} className="btn-primary text-base px-12">{Ic.Check} 수량이 있는 패키지 일괄 생성</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
