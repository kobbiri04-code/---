import React, { useEffect, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import useDispatchStore, { MAX_LOAD_AMOUNT, PEAK_RATIO_THRESHOLD } from '../store/dispatchStore';
import { isPointInPolygon, LOGISTICS_CENTER } from '../utils/geocoding';

// Leaflet 기본 아이콘 이미지 경로 수동 설정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/** 원형 마커 SVG 아이콘 생성 */
function createCircleIcon(color, selected = false, courseNo = null, isClosed = false) {
  const outerRing = selected
    ? `<circle cx="12" cy="12" r="11" fill="none" stroke="#f59e0b" stroke-width="3" opacity="0.9"/>`
    : '';
  const courseLabel =
    courseNo != null
      ? `<text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="sans-serif">${courseNo}</text>`
      : '';
  const closedX = isClosed
    ? `<line x1="8" y1="8" x2="16" y2="16" stroke="white" stroke-width="1.5"/>
       <line x1="16" y1="8" x2="8" y2="16" stroke="white" stroke-width="1.5"/>`
    : '';
  const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      ${outerRing}
      <circle cx="12" cy="12" r="${selected ? 8 : 9}" fill="${color}" stroke="white" stroke-width="2"/>
      ${closedX}
      ${courseLabel}
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

/** 차고지 마커 */
function createGarageIcon(color = '#6366f1') {
  const svg = `
    <svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0 C6.3 0 0 6.3 0 14 C0 22 14 34 14 34 C14 34 28 22 28 14 C28 6.3 21.7 0 14 0Z" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="14" y="18" text-anchor="middle" fill="white" font-size="12" font-family="sans-serif">🚚</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 34],
    iconAnchor: [14, 34],
    popupAnchor: [0, -36],
  });
}

/** 물류센터 아이콘 */
const DEPOT_ICON = L.divIcon({
  html: `
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="17" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/>
      <text x="18" y="22" text-anchor="middle" font-size="16" font-family="sans-serif">🏭</text>
    </svg>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

/** 금액 포맷 */
function formatMoney(v) {
  return v?.toLocaleString('ko-KR') + '원';
}

/** 적재율 계산 */
function calcLoadRate(amount) {
  return Math.min((amount / MAX_LOAD_AMOUNT) * 100, 200);
}

// ─── 올가미(Lasso) 레이어 ─────────────────────────────────────────────

function LassoLayer({ onSelectionChange }) {
  const map = useMap();
  const isDrawing = useRef(false);
  const points = useRef([]);
  const polylineRef = useRef(null);
  const polygonRef = useRef(null);
  const { isLassoMode, stores } = useDispatchStore();

  const cleanup = useCallback(() => {
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
    points.current = [];
  }, [map]);

  useEffect(() => {
    if (isLassoMode) {
      map.getContainer().style.cursor = 'crosshair';
      map.dragging.disable();
    } else {
      map.getContainer().style.cursor = '';
      map.dragging.enable();
      cleanup();
    }
    return () => { map.getContainer().style.cursor = ''; map.dragging.enable(); };
  }, [isLassoMode, map, cleanup]);

  useMapEvents({
    mousedown(e) {
      if (!isLassoMode) return;
      isDrawing.current = true;
      points.current = [[e.latlng.lat, e.latlng.lng]];
      cleanup();
      polylineRef.current = L.polyline(points.current, {
        color: '#3b82f6', weight: 2, dashArray: '6 3', opacity: 0.9,
      }).addTo(map);
    },
    mousemove(e) {
      if (!isLassoMode || !isDrawing.current) return;
      points.current.push([e.latlng.lat, e.latlng.lng]);
      if (polylineRef.current) polylineRef.current.setLatLngs(points.current);
    },
    mouseup() {
      if (!isLassoMode || !isDrawing.current) return;
      isDrawing.current = false;
      if (points.current.length < 3) { cleanup(); return; }

      const closedPoints = [...points.current, points.current[0]];
      if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }

      polygonRef.current = L.polygon(closedPoints, {
        color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2, dashArray: '6 3',
      }).addTo(map);

      // 종결 매장 제외하고 내부 매장 감지
      const selected = stores
        .filter((s) => !s.isClosed && isPointInPolygon({ lat: s.lat, lng: s.lng }, points.current))
        .map((s) => s.id);

      onSelectionChange(selected);

      setTimeout(() => {
        if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
      }, 3000);
    },
  });

  return null;
}

// ─── 확정 코스 폴리라인 ──────────────────────────────────────────────

function CoursePolylines() {
  const map = useMap();
  const { confirmedCourses } = useDispatchStore();
  const linesRef = useRef([]);

  useEffect(() => {
    linesRef.current.forEach((l) => map.removeLayer(l));
    linesRef.current = [];
    confirmedCourses.forEach((course) => {
      if (course.stores.length < 2) return;
      const latlngs = course.stores.map((s) => [s.lat, s.lng]);
      const line = L.polyline(latlngs, { color: course.color, weight: 2.5, opacity: 0.7, dashArray: '8 4' }).addTo(map);
      linesRef.current.push(line);
    });
  }, [confirmedCourses, map]);

  return null;
}

// ─── 매장 마커 컴포넌트 ──────────────────────────────────────────────

function StoreMarkers() {
  const { stores, selectedStoreIds, isWeekendMode, confirmedCourses, toggleStoreSelection } =
    useDispatchStore();

  const storeCourseMap = {};
  confirmedCourses.forEach((course) => {
    course.stores.forEach((s) => {
      storeCourseMap[s.id] = { color: course.color, no: course.courseNo };
    });
  });

  return stores.map((store) => {
    const isSelected = selectedStoreIds.has(store.id);
    const courseInfo = storeCourseMap[store.id];
    const isPeak =
      store.saturdaySales > 0 &&
      store.avgDailySales > 0 &&
      store.saturdaySales / store.avgDailySales >= PEAK_RATIO_THRESHOLD;
    const isClosed = store.isClosed;

    let color;
    if (isClosed) {
      color = '#64748b'; // 종결: 회색
    } else if (courseInfo) {
      color = courseInfo.color;
    } else if (isWeekendMode && isPeak) {
      color = '#ef4444'; // 주말모드 피크: 빨강
    } else if (isPeak) {
      color = '#f97316'; // 평일 피크: 주황
    } else {
      color = '#0d9488'; // 일반: 청록
    }

    const icon = createCircleIcon(color, isSelected, courseInfo?.no, isClosed);
    const currentSales = isWeekendMode ? store.saturdaySales : store.avgDailySales;
    const peakRatio = store.avgDailySales > 0
      ? Math.round((store.saturdaySales / store.avgDailySales - 1) * 100)
      : 0;

    return (
      <Marker
        key={store.id}
        position={[store.lat, store.lng]}
        icon={icon}
        eventHandlers={{
          click: () => {
            if (!isClosed) toggleStoreSelection(store.id);
          },
        }}
      >
        <Popup className="store-popup">
          <div className="min-w-[220px] p-3">
            {/* 매장명 + 상태 배지 */}
            <div className="flex items-start justify-between mb-2 gap-2">
              <span className="font-bold text-slate-800 text-sm leading-tight">{store.name}</span>
              <div className="flex gap-1 flex-shrink-0">
                {isClosed && (
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">⛔ 종결</span>
                )}
                {!isClosed && isPeak && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">⚡ 피크</span>
                )}
                {courseInfo && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                    style={{ background: courseInfo.color }}>코스 {courseInfo.no}</span>
                )}
              </div>
            </div>

            {/* 주소 */}
            <div className="text-xs text-slate-500 mb-2.5 leading-relaxed">{store.address}</div>

            {/* 매출 정보 */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className={`rounded-lg p-2 ${isWeekendMode ? 'bg-slate-100' : 'bg-teal-50 border border-teal-100'}`}>
                <div className="text-slate-400 mb-0.5">일평균 매출</div>
                <div className={`font-bold ${isWeekendMode ? 'text-slate-600' : 'text-teal-700'}`}>
                  {store.avgDailySales ? formatMoney(store.avgDailySales) : '-'}
                </div>
              </div>
              <div className={`rounded-lg p-2 ${isWeekendMode ? 'bg-orange-50 border border-orange-100' : isPeak ? 'bg-red-50' : 'bg-slate-100'}`}>
                <div className={`mb-0.5 ${isWeekendMode ? 'text-orange-500' : isPeak ? 'text-red-400' : 'text-slate-400'}`}>토요일 매출</div>
                <div className={`font-bold ${isWeekendMode ? 'text-orange-700' : isPeak ? 'text-red-600' : 'text-slate-700'}`}>
                  {store.saturdaySales ? formatMoney(store.saturdaySales) : '-'}
                </div>
              </div>
            </div>

            {/* 이번달 총합 */}
            {store.totalMonthlySales > 0 && (
              <div className="bg-slate-50 rounded-lg p-2 text-xs mb-2">
                <div className="text-slate-400 mb-0.5">이번달 총 매출</div>
                <div className="font-bold text-slate-700">{formatMoney(store.totalMonthlySales)}</div>
              </div>
            )}

            {/* 피크 경고 */}
            {!isClosed && isPeak && (
              <div className="text-xs text-orange-600 bg-orange-50 rounded-lg p-1.5 mb-2">
                ⚠ 주말 매출이 평일 대비 <strong>+{peakRatio}%</strong> 급증
              </div>
            )}

            {/* 선택 상태 */}
            {!isClosed && (
              <div className={`text-xs px-2 py-1.5 rounded-lg text-center font-semibold cursor-pointer ${
                isSelected ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {isSelected ? '✓ 선택됨 (클릭하여 해제)' : '클릭하여 선택'}
              </div>
            )}
            {isClosed && (
              <div className="text-xs px-2 py-1.5 rounded-lg text-center text-slate-400 bg-slate-100">
                종결된 매장입니다
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    );
  });
}

// ─── 기사 차고지 마커 ────────────────────────────────────────────────

function DriverMarkers() {
  const { drivers } = useDispatchStore();
  return drivers.map((driver) => (
    <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={createGarageIcon()}>
      <Popup>
        <div className="p-2 min-w-[140px]">
          <div className="font-bold text-sm text-slate-800">{driver.name}</div>
          <div className="text-xs text-slate-500 mt-1">🚚 {driver.vehicleTon}</div>
          <div className="text-xs text-slate-500 mt-0.5">🏠 {driver.garage}</div>
        </div>
      </Popup>
    </Marker>
  ));
}

// ─── 지도 초기화 ────────────────────────────────────────────────────

function MapInitializer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100); }, [map]);
  return null;
}

// ─── 메인 MapDashboard ──────────────────────────────────────────────

export default function MapDashboard() {
  const {
    stores,
    selectedStoreIds,
    setSelectedStoreIds,
    isLassoMode,
    isWeekendMode,
    confirmedCourses,
  } = useDispatchStore();

  const handleLassoSelection = useCallback(
    (ids) => { setSelectedStoreIds(ids); },
    [setSelectedStoreIds]
  );

  const selectedStores = stores.filter((s) => selectedStoreIds.has(s.id));
  const totalAmount = selectedStores.reduce(
    (sum, s) => sum + (isWeekendMode ? s.saturdaySales : s.avgDailySales),
    0
  );
  const loadRate = calcLoadRate(totalAmount);

  // 활성 매장 수 (종결 제외)
  const activeCount = stores.filter((s) => !s.isClosed).length;
  const closedCount = stores.filter((s) => s.isClosed).length;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[37.45, 127.00]}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        {/* Google Maps — 한국어(hl=ko) 설정으로 네이버 스타일과 유사한 한글 지도 */}
        <TileLayer
          url="https://mt{s}.google.com/vt/lyrs=m&hl=ko&gl=KR&x={x}&y={y}&z={z}"
          attribution='© Google Maps'
          subdomains={['0','1','2','3']}
          maxZoom={20}
          tileSize={256}
        />

        <MapInitializer />

        {/* 물류센터 마커 */}
        <Marker position={[LOGISTICS_CENTER.lat, LOGISTICS_CENTER.lng]} icon={DEPOT_ICON}>
          <Popup>
            <div className="p-2">
              <div className="font-bold text-sm">🏭 {LOGISTICS_CENTER.name}</div>
              <div className="text-xs text-slate-500 mt-1">배차 기준 거점</div>
            </div>
          </Popup>
        </Marker>

        {/* 매장 마커 */}
        <StoreMarkers />

        {/* 기사 차고지 마커 */}
        <DriverMarkers />

        {/* 확정 코스 폴리라인 */}
        <CoursePolylines />

        {/* 올가미 레이어 */}
        <LassoLayer onSelectionChange={handleLassoSelection} />
      </MapContainer>

      {/* ── 지도 위 오버레이 ── */}
      <div className="absolute top-3 left-3 z-[1000] space-y-2 pointer-events-none">
        {/* 모드 배지 */}
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
          isWeekendMode ? 'bg-orange-500 text-white' : 'bg-teal-600 text-white'
        }`}>
          {isWeekendMode ? '🗓 주말(토요일) 모드' : '📅 평일 모드'}
        </div>

        {/* 올가미 안내 */}
        {isLassoMode && (
          <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
            ✏ 드래그로 영역을 그려 매장을 선택하세요
          </div>
        )}

        {/* 선택 현황 */}
        {selectedStoreIds.size > 0 && (
          <div className="bg-white/90 text-slate-800 px-3 py-1.5 rounded-lg text-xs shadow-lg backdrop-blur-sm border border-slate-200">
            <span className="text-amber-600 font-bold">{selectedStoreIds.size}개</span> 선택됨 ·{' '}
            <span className={`font-bold ${loadRate > 100 ? 'text-red-500' : loadRate >= 90 ? 'text-green-600' : 'text-slate-700'}`}>
              {totalAmount.toLocaleString('ko-KR')}원
            </span>
          </div>
        )}
      </div>

      {/* ── 범례 ── */}
      <div className="absolute bottom-6 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-xl text-xs border border-slate-200">
        <div className="font-bold text-slate-700 mb-2">범례</div>
        <div className="space-y-1.5">
          <LegendItem color="#0d9488" label="일반 매장" />
          <LegendItem color="#f97316" label="피크 매장 (주말 +30%↑)" />
          <LegendItem color="#ef4444" label="피크 매장 (주말 모드)" />
          <LegendItem color="#64748b" label="종결 매장" isX />
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-teal-500 flex-shrink-0" />
            <span className="text-slate-600">선택된 매장</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🏭</span>
            <span className="text-slate-600">물류센터 (화성)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🚚</span>
            <span className="text-slate-600">기사 차고지</span>
          </div>
          {confirmedCourses.length > 0 && (
            <>
              <div className="border-t border-slate-200 my-1" />
              {confirmedCourses.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border border-white shadow-sm flex-shrink-0"
                    style={{ background: c.color }} />
                  <span className="text-slate-600">코스 {c.courseNo} · {c.driverName}</span>
                </div>
              ))}
              {confirmedCourses.length > 5 && (
                <div className="text-slate-400">+{confirmedCourses.length - 5}개 코스</div>
              )}
            </>
          )}
        </div>

        {/* 매장 통계 */}
        <div className="border-t border-slate-200 mt-2 pt-2 text-[10px] text-slate-500 space-y-0.5">
          <div>활성 매장: <span className="text-teal-600 font-semibold">{activeCount}개</span></div>
          {closedCount > 0 && <div>종결 매장: <span className="text-slate-400">{closedCount}개</span></div>}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, isX }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex-shrink-0 flex items-center justify-center"
        style={{ background: color }}>
        {isX && (
          <svg width="8" height="8" viewBox="0 0 8 8" className="absolute">
            <line x1="1" y1="1" x2="7" y2="7" stroke="white" strokeWidth="1.5" />
            <line x1="7" y1="1" x2="1" y2="7" stroke="white" strokeWidth="1.5" />
          </svg>
        )}
      </div>
      <span className="text-slate-600">{label}</span>
    </div>
  );
}
