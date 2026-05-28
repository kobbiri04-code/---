import React, { useState, useMemo } from 'react';
import {
  Truck, Users, CheckCircle2, AlertTriangle, Package,
  Trash2, ChevronDown, ChevronUp, RotateCcw, MousePointer2,
  TrendingUp, Calendar, BarChart2, MapPin, X, Info
} from 'lucide-react';
import useDispatchStore, { MAX_LOAD_AMOUNT, COURSE_COLORS } from '../store/dispatchStore';

/** 금액 포맷 */
function fmtMoney(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}백만원`;
  return v?.toLocaleString('ko-KR') + '원';
}
function fmtMoneyFull(v) {
  return v?.toLocaleString('ko-KR') + '원';
}

/** 적재율 색상 결정 */
function getLoadColor(rate) {
  if (rate > 100) return { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' };
  if (rate >= 90) return { bar: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/10' };
  if (rate >= 60) return { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' };
  return { bar: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-700/50' };
}

// ─── 적재율 프로그레스 바 ─────────────────────────────────────────────

function LoadProgressBar({ rate, totalAmount }) {
  const clampedRate = Math.min(rate, 100);
  const isOverload = rate > 100;
  const isFull = rate >= 90 && !isOverload;
  const colors = getLoadColor(rate);

  return (
    <div className={`rounded-xl p-3 border ${
      isOverload ? 'border-red-500/40 bg-red-500/10' : 
      isFull ? 'border-green-500/40 bg-green-500/10' : 
      'border-slate-700 bg-slate-800/50'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={13} className={colors.text} />
          <span className="text-xs font-semibold text-slate-300">차량 적재율</span>
        </div>
        <div className={`text-sm font-bold ${colors.text}`}>
          {rate.toFixed(1)}%
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="relative h-5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar} ${
            isOverload ? 'progress-overload' : isFull ? 'progress-full' : ''
          }`}
          style={{ width: `${clampedRate}%` }}
        />
        {/* 90% 기준선 */}
        <div className="absolute top-0 bottom-0 border-l border-dashed border-green-400/60"
          style={{ left: '90%' }} />
        {/* 기준선 레이블 */}
        <div className="absolute top-0 text-[9px] text-green-400/80 font-bold"
          style={{ left: '90%', paddingLeft: 3 }}>만차</div>
      </div>

      {/* 금액 표시 */}
      <div className="flex justify-between mt-1.5 text-[10px]">
        <span className={colors.text + ' font-semibold'}>
          {fmtMoney(totalAmount)}
        </span>
        <span className="text-slate-500">/ {fmtMoney(MAX_LOAD_AMOUNT)}</span>
      </div>

      {/* 상태 메시지 */}
      {isOverload && (
        <div className="mt-2 flex items-center gap-1.5 bg-red-900/50 border border-red-500/40 rounded-lg p-2">
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0 animate-pulse" />
          <div>
            <div className="text-xs font-bold text-red-300">⚠ 과적 경고 (Overload Warning)</div>
            <div className="text-[10px] text-red-400 mt-0.5">
              한도 초과: +{fmtMoney(totalAmount - MAX_LOAD_AMOUNT)}
            </div>
          </div>
        </div>
      )}
      {isFull && (
        <div className="mt-2 flex items-center gap-1.5 bg-green-900/40 border border-green-500/30 rounded-lg p-2">
          <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
          <div className="text-xs font-bold text-green-300">✓ 만차 도달 — 배차 확정 가능</div>
        </div>
      )}
      {rate > 0 && rate < 60 && (
        <div className="mt-2 text-[10px] text-slate-500 text-center">
          추가 여유: {fmtMoney(MAX_LOAD_AMOUNT - totalAmount)}
        </div>
      )}
    </div>
  );
}

// ─── 선택된 매장 목록 ─────────────────────────────────────────────────

function SelectedStoreList({ selectedStores, isWeekendMode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { toggleStoreSelection } = useDispatchStore();

  if (selectedStores.length === 0) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-amber-400" />
          <span className="text-xs font-semibold text-slate-200">
            선택 매장 ({selectedStores.length}개)
          </span>
        </div>
        {isExpanded ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
      </button>

      {isExpanded && (
        <div className="max-h-48 overflow-y-auto border-t border-slate-700">
          {selectedStores.map((store) => {
            const sales = isWeekendMode ? store.saturdaySales : store.avgDailySales;
            return (
              <div
                key={store.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-slate-700/40 border-b border-slate-700/50 last:border-0 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200 truncate">{store.name}</span>
                    {store.isPeak && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded">피크</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{store.address}</div>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-xs font-semibold text-teal-300 whitespace-nowrap">{fmtMoney(sales)}</span>
                  <button
                    onClick={() => toggleStoreSelection(store.id)}
                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 기사 선택 컴포넌트 ───────────────────────────────────────────────

function DriverSelector({ selectedDriverId, onSelect }) {
  const { drivers } = useDispatchStore();

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
        <Users size={11} className="inline mr-1" />
        배차 기사 선택
      </label>
      <select
        value={selectedDriverId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
      >
        <option value="">-- 기사를 선택하세요 --</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.vehicleTon}) · {d.garage}
          </option>
        ))}
        {drivers.length === 0 && (
          <option value="" disabled>기사 데이터를 업로드해주세요</option>
        )}
      </select>
    </div>
  );
}

// ─── 확정된 코스 목록 ─────────────────────────────────────────────────

function ConfirmedCourseList() {
  const { confirmedCourses, removeCourse } = useDispatchStore();
  const [isExpanded, setIsExpanded] = useState(true);

  if (confirmedCourses.length === 0) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Truck size={13} className="text-blue-400" />
          <span className="text-xs font-semibold text-slate-200">
            확정 코스 ({confirmedCourses.length}건)
          </span>
        </div>
        {isExpanded ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-700">
          {confirmedCourses.map((course) => (
            <div key={course.id} className="p-3 border-b border-slate-700/50 last:border-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
                    style={{ background: course.color }} />
                  <span className="text-xs font-bold text-white">
                    코스 {course.courseNo}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    course.isWeekendMode
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-teal-500/20 text-teal-300'
                  }`}>
                    {course.isWeekendMode ? '주말' : '평일'}
                  </span>
                </div>
                <button
                  onClick={() => removeCourse(course.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-xs text-slate-400 mb-1">
                <span className="text-blue-300 font-medium">{course.driverName}</span>
                {' · '}
                <span>{course.stores.length}개 매장</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-300">
                  {fmtMoneyFull(course.totalAmount)}
                </span>
                <span className="text-[10px] text-slate-600">{course.createdAt}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {course.stores.slice(0, 6).map((s) => (
                  <span key={s.id} className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                    {s.name}
                  </span>
                ))}
                {course.stores.length > 6 && (
                  <span className="text-[9px] text-slate-500">+{course.stores.length - 6}개</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 메인 SidebarControls ─────────────────────────────────────────────

export default function SidebarControls() {
  const {
    stores,
    selectedStoreIds,
    isWeekendMode,
    isLassoMode,
    confirmedCourses,
    toggleWeekendMode,
    toggleLassoMode,
    clearSelection,
    confirmDispatch,
    resetAll,
  } = useDispatchStore();

  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [confirmMsg, setConfirmMsg] = useState(null);

  // 선택된 매장 계산
  const selectedStores = useMemo(
    () => stores.filter((s) => selectedStoreIds.has(s.id)),
    [stores, selectedStoreIds]
  );

  const totalAmount = useMemo(
    () => selectedStores.reduce((sum, s) => sum + (isWeekendMode ? s.saturdaySales : s.avgDailySales), 0),
    [selectedStores, isWeekendMode]
  );

  const loadRate = useMemo(() => (totalAmount / MAX_LOAD_AMOUNT) * 100, [totalAmount]);

  // 전체 통계
  const totalStores = stores.length;
  const assignedStoreCount = confirmedCourses.reduce((sum, c) => sum + c.stores.length, 0);
  const totalConfirmedAmount = confirmedCourses.reduce((sum, c) => sum + c.totalAmount, 0);

  const handleConfirm = () => {
    if (selectedStores.length === 0) {
      setConfirmMsg({ type: 'error', text: '선택된 매장이 없습니다.' });
      return;
    }
    if (totalAmount > MAX_LOAD_AMOUNT) {
      setConfirmMsg({ type: 'error', text: '과적 상태입니다. 매장을 줄여주세요.' });
      return;
    }
    const course = confirmDispatch(selectedDriverId || null);
    setSelectedDriverId('');
    setConfirmMsg({ type: 'success', text: `코스 ${course.courseNo} 확정 완료! (${course.stores.length}개 매장)` });
    setTimeout(() => setConfirmMsg(null), 3000);
  };

  return (
    <div className="w-72 flex-shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-blue-400" />
            <h2 className="text-sm font-bold text-white">배차 관리</h2>
          </div>
          <button
            onClick={resetAll}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
            title="전체 초기화"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-1.5 mt-2.5">
          {[
            { label: '전체 매장', value: totalStores, icon: <MapPin size={10} />, color: 'text-slate-300' },
            { label: '배차 완료', value: assignedStoreCount, icon: <CheckCircle2 size={10} />, color: 'text-teal-300' },
            { label: '확정 코스', value: confirmedCourses.length, icon: <Package size={10} />, color: 'text-blue-300' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/60 rounded-lg p-2 text-center">
              <div className={`flex items-center justify-center gap-0.5 ${stat.color} mb-0.5`}>
                {stat.icon}
                <span className="text-[10px]">{stat.label}</span>
              </div>
              <div className={`text-sm font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── 평일 / 주말 모드 토글 ── */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200 mb-0.5 flex items-center gap-1.5">
                <Calendar size={12} className={isWeekendMode ? 'text-orange-400' : 'text-teal-400'} />
                배차 기준 모드
              </div>
              <div className="text-[10px] text-slate-500">
                {isWeekendMode ? '토요일 매출 기준 적용 중' : '일평균 매출 기준 적용 중'}
              </div>
            </div>
            <div
              className={`relative w-12 h-6 rounded-full cursor-pointer transition-all duration-300 ${
                isWeekendMode ? 'bg-orange-500' : 'bg-slate-600'
              }`}
              onClick={toggleWeekendMode}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                  isWeekendMode ? 'left-6' : 'left-0.5'
                }`}
              />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
            <div className={`rounded-lg px-2 py-1.5 text-center font-medium transition-all ${
              !isWeekendMode ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40' : 'bg-slate-700/40 text-slate-500'
            }`}>
              📅 평일 모드
            </div>
            <div className={`rounded-lg px-2 py-1.5 text-center font-medium transition-all ${
              isWeekendMode ? 'bg-orange-600/30 text-orange-300 border border-orange-500/40' : 'bg-slate-700/40 text-slate-500'
            }`}>
              🗓 주말(토) 모드
            </div>
          </div>
        </div>

        {/* ── 올가미 툴 ── */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <MousePointer2 size={12} className={isLassoMode ? 'text-blue-400' : 'text-slate-400'} />
              <span className="text-xs font-semibold text-slate-200">올가미(Lasso) 툴</span>
            </div>
            <button
              onClick={toggleLassoMode}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                isLassoMode
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isLassoMode ? '✓ ON' : 'OFF'}
            </button>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">
            {isLassoMode
              ? '🖱 지도 위에서 마우스를 드래그하여 매장 영역을 선택하세요'
              : '버튼을 눌러 올가미 모드를 활성화하세요. 마커를 클릭해도 개별 선택 가능합니다.'}
          </div>
          {selectedStoreIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="mt-2 w-full text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg py-1.5 transition-all"
            >
              <X size={10} className="inline mr-1" />
              선택 초기화 ({selectedStoreIds.size}개)
            </button>
          )}
        </div>

        {/* ── 현재 선택 요약 ── */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={13} className="text-teal-400" />
            <span className="text-xs font-semibold text-slate-200">현재 배차 집합</span>
          </div>

          {selectedStores.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-1">🗺</div>
              <div className="text-xs text-slate-500">
                지도에서 매장을 선택하거나<br />올가미로 영역을 그려주세요
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-700/50 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-slate-400 mb-0.5">선택 매장 수</div>
                  <div className="text-lg font-bold text-amber-400">{selectedStores.length}개</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-slate-400 mb-0.5">총 물동량</div>
                  <div className="text-sm font-bold text-teal-300">{fmtMoney(totalAmount)}</div>
                </div>
              </div>

              {/* 적재율 프로그레스 바 */}
              <LoadProgressBar rate={loadRate} totalAmount={totalAmount} />
            </>
          )}
        </div>

        {/* ── 선택 매장 목록 ── */}
        <SelectedStoreList selectedStores={selectedStores} isWeekendMode={isWeekendMode} />

        {/* ── 기사 배정 및 확정 ── */}
        {selectedStores.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">기사 배정 및 확정</span>
            </div>

            <DriverSelector selectedDriverId={selectedDriverId} onSelect={setSelectedDriverId} />

            {confirmMsg && (
              <div className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${
                confirmMsg.type === 'success'
                  ? 'bg-green-900/40 border-green-500/30 text-green-300'
                  : 'bg-red-900/40 border-red-500/30 text-red-300'
              }`}>
                {confirmMsg.type === 'success' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {confirmMsg.text}
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={selectedStores.length === 0 || totalAmount > MAX_LOAD_AMOUNT}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
                totalAmount > MAX_LOAD_AMOUNT
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed'
                  : selectedStores.length > 0
                  ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-500 hover:to-teal-500 active:scale-95 shadow-blue-500/20'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {totalAmount > MAX_LOAD_AMOUNT
                ? '⚠ 과적 — 배차 불가'
                : selectedStores.length === 0
                ? '매장을 선택하세요'
                : `✓ 배차 확정 (${selectedStores.length}개 매장)`}
            </button>

            {totalAmount <= MAX_LOAD_AMOUNT && (
              <div className="text-[10px] text-slate-600 text-center flex items-center justify-center gap-1">
                <Info size={9} />
                기사 미선택 시 '미배정' 상태로 저장됩니다
              </div>
            )}
          </div>
        )}

        {/* ── 확정 코스 목록 ── */}
        <ConfirmedCourseList />

        {/* ── 배차 종합 현황 ── */}
        {confirmedCourses.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">배차 종합 현황</div>
            <div className="space-y-1.5">
              {[
                { label: '총 확정 코스', value: `${confirmedCourses.length}코스`, color: 'text-blue-300' },
                { label: '총 배차 매장', value: `${assignedStoreCount}개`, color: 'text-teal-300' },
                { label: '총 물동량', value: fmtMoneyFull(totalConfirmedAmount), color: 'text-amber-300' },
                { label: '평균 적재율', value: `${(totalConfirmedAmount / (confirmedCourses.length * MAX_LOAD_AMOUNT) * 100).toFixed(1)}%`, color: 'text-green-300' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
