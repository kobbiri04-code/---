import React, { useEffect } from 'react';
import { Truck, Map, Database, Info } from 'lucide-react';
import FileUploader from './components/FileUploader';
import MapDashboard from './components/MapDashboard';
import SidebarControls from './components/SidebarControls';
import useDispatchStore from './store/dispatchStore';
import { SAMPLE_STORES, SAMPLE_DRIVERS } from './data/sampleData';

/**
 * 앱 메인 레이아웃
 * ┌────────────────────────────────────┐
 * │           TopBar + FileUploader    │
 * ├───────────────────────┬────────────┤
 * │      MapDashboard     │  Sidebar   │
 * │   (Lasso + Markers)   │ Controls   │
 * └───────────────────────┴────────────┘
 */
export default function App() {
  const { stores, setStores, setDrivers, isGeocoding, geocodingProgress } = useDispatchStore();

  // 샘플 데이터 자동 로드 (파일 업로드 전 즉시 시연 가능)
  useEffect(() => {
    if (stores.length === 0) {
      setStores(SAMPLE_STORES);
      setDrivers(SAMPLE_DRIVERS);
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden font-sans">

      {/* ─── 상단 헤더 ─────────────────────────────────── */}
      <header className="flex-shrink-0 bg-slate-900 border-b border-slate-700 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                <Truck size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-white leading-none">
                  VRP 배차 시뮬레이터
                </h1>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  GIS 기반 프랜차이즈 물류 배차 최적화 시스템
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 ml-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                <Map size={10} className="text-teal-400" />
                <span>경기 화성 물류센터 기준</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                <Database size={10} className="text-blue-400" />
                <span>차량 한도: 12,000,000원</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 지오코딩 진행 상태 */}
            {isGeocoding && (
              <div className="flex items-center gap-2 bg-blue-900/40 border border-blue-500/30 rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-blue-300">지오코딩 {geocodingProgress}%</span>
              </div>
            )}

            {/* 사용 안내 */}
            <div className="group relative">
              <button className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800">
                <Info size={14} />
              </button>
              <div className="absolute right-0 top-8 w-64 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 hidden group-hover:block text-xs text-slate-300 space-y-1.5">
                <div className="font-bold text-white mb-2">📋 사용 방법</div>
                <div>1️⃣ 상단에서 엑셀 파일을 업로드하거나 샘플 데이터로 시작</div>
                <div>2️⃣ 우측 패널에서 평일/주말 모드 선택</div>
                <div>3️⃣ <strong className="text-blue-300">올가미 ON</strong> → 지도 드래그로 매장 선택</div>
                <div>4️⃣ 또는 마커를 직접 <strong className="text-blue-300">클릭</strong>하여 개별 선택</div>
                <div>5️⃣ 적재율 확인 후 기사 배정 및 <strong className="text-teal-300">배차 확정</strong></div>
                <div className="border-t border-slate-700 pt-1.5 mt-1.5 text-slate-500 text-[10px]">
                  🟠 주황/빨강 마커: 주말 매출 30% 이상 급증 피크 매장
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── 파일 업로더 ────────────────────────────────── */}
      <FileUploader />

      {/* ─── 메인 콘텐츠 (지도 + 사이드바) ──────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* 지도 */}
        <div className="flex-1 relative overflow-hidden">
          <MapDashboard />
        </div>

        {/* 우측 사이드바 */}
        <SidebarControls />
      </div>
    </div>
  );
}
