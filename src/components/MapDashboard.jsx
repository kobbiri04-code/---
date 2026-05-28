import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import useDispatchStore, { COURSE_COLORS, MAX_LOAD_AMOUNT, PEAK_RATIO_THRESHOLD } from '../store/dispatchStore';
import { isPointInPolygon, LOGISTICS_CENTER } from '../utils/geocoding';

// Leaflet 기본 아이콘 이미지 경로 수동 설정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/** 원형 마커 SVG 아이콘 생성 */
function createCircleIcon(color, size = 16, selected = false, courseNo = null) {
  const outerRing = selected ? `<circle cx="12" cy="12" r="11" fill="none" stroke="#f59e0b" stroke-width="3" opacity="0.9"/>` : '';
  const courseLabel = courseNo != null
    ? `<text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="sans-serif">${courseNo}</text>`
    : '';
  const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      ${outerRing}
      <circle cx="12" cy="12" r="${selected ? 8 : 9}" fill="${color}" stroke="white" stroke-width="2"/>
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

// ─── 올가미(Lasso) 레이어 컴포넌트 ─────────────────────────────────────

function LassoLayer({ onSelectionChange }) {
  const map = useMap();
  const isDrawing = useRef(false);
  const points = useRef([]);
  const polylineRef = useRef(null);
  const polygonRef = useRef(null);
  const { isLassoMode, stores } = useDispatchStore();

  // 레이어 정리
  const cleanup = useCallback(() => {
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (polygonRef.current) {
      map.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
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
    return () => {
      map.getContainer().style.cursor = '';
      map.dragging.enable();
    };
  }, [isLassoMode, map, cleanup]);

  useMapEvents({
    mousedown(e) {
      if (!isLassoMode) return;
      isDrawing.current = true;
      points.current = [[e.latlng.lat, e.latlng.lng]];
      cleanup();
      polylineRef.current = L.polyline(points.current, {
        color: '#3b82f6',
        weight: 2,
        dashArray: '6 3',
        opacity: 0.9,
      }).addTo(map);
    },
    mousemove(e) {
      if (!isLassoMode || !isDrawing.current) return;
      points.current.push([e.latlng.lat, e.latlng.lng]);
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(points.current);
      }
    },
    mouseup() {
      if (!isLassoMode || !isDrawing.current) return;
      isDrawing.current = false;

      if (points.current.length < 3) {
        cleanup();
        return;
      }

      // 닫힌 다각형으로 변환
      const closedPoints = [...points.current, points.current[0]];
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      polylineRef.current = null;

      polygonRef.current = L.polygon(closedPoints, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '6 3',
      }).addTo(map);

      // 다각형 내부의 매장 탐색
      const selected = stores
        .filter((s) => isPointInPolygon({ lat: s.lat, lng: s.lng }, points.current))
        .map((s) => s.id);

      onSelectionChange(selected);

      // 3초 후 다각형 자동 제거
      setTimeout(() => {
        if (polygonRef.current) {
          map.removeLayer(polygonRef.current);
          polygonRef.current = null;
        }
      }, 3000);
    },
  });

  return null;
}

// ─── 확정 코스 폴리라인 ───────────────────────────────────────────────

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
      const line = L.polyline(latlngs, {
        color: course.color,
        weight: 2.5,
        opacity: 0.7,
        dashArray: '8 4',
      }).addTo(map);
      linesRef.current.push(line);
    });
  }, [confirmedCourses, map]);

  return null;
}

// ─── 매장 마커 컴포넌트 ───────────────────────────────────────────────

function StoreMarkers() {
  const { stores, selectedStoreIds, isWeekendMode, confirmedCourses, toggleStoreSelection } =
    useDispatchStore();

  // 어느 코스에 속하는지 맵 생성
  const storeCourseMap = {};
  confirmedCourses.forEach((course) => {
    course.stores.forEach((s) => {
      storeCourseMap[s.id] = { color: course.color, no: course.courseNo };
    });
  });

  return stores.map((store) => {
    const isSelected = selectedStoreIds.has(store.id);
    const courseInfo = storeCourseMap[store.id];
    const isPeak = store.saturdaySales > 0 && store.saturdaySales / store.avgDailySales >= PEAK_RATIO_THRESHOLD;

    let color;
    if (courseInfo) {
      color = courseInfo.color;
    } else if (isWeekendMode && isPeak) {
      color = '#ef4444';
    } else if (isPeak) {
      color = '#f97316';
    } else {
      color = '#0d9488';
    }

    const icon = createCircleIcon(color, 16, isSelected, courseInfo?.no);
    const currentSales = isWeekendMode ? store.saturdaySales : store.avgDailySales;

    return (
      <Marker
        key={store.id}
        position={[store.lat, store.lng]}
        icon={icon}
        eventHandlers={{
          click: () => toggleStoreSelection(store.id),
        }}
      >
        <Popup className="store-popup">
          <div className="min-w-[200px] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 text-sm">{store.name}</span>
              {isPeak && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                  ⚡ 피크
                </span>
              )}
              {courseInfo && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                  style={{ background: courseInfo.color }}>
                  코스 {courseInfo.no}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mb-2 leading-relaxed">{store.address}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-100 rounded-lg p-2">
                <div className="text-slate-400 mb-0.5">일평균 물량</div>
                <div className="font-bold text-slate-700">{formatMoney(store.avgDailySales)}</div>
              </div>
              <div className={`rounded-lg p-2 ${isPeak ? 'bg-red-50' : 'bg-slate-100'}`}>
                <div className={`mb-0.5 ${isPeak ? 'text-red-400' : 'text-slate-400'}`}>토요일 물량</div>
                <div className={`font-bold ${isPeak ? 'text-red-600' : 'text-slate-700'}`}>
                  {store.saturdaySales ? formatMoney(store.saturdaySales) : '-'}
                </div>
              </div>
            </div>
            {isPeak && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 rounded p-1.5">
                ⚠ 주말 매출이 평일 대비{' '}
                <strong>{Math.round((store.saturdaySales / store.avgDailySales - 1) * 100)}%</strong>{' '}
                급증
              </div>
            )}
            <div className={`mt-2 text-xs px-2 py-1.5 rounded-lg text-center font-semibold ${
              isSelected ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {isSelected ? '✓ 선택됨 (클릭하여 해제)' : '클릭하여 선택'}
            </div>
          </div>
        </Popup>
      </Marker>
    );
  });
}

// ─── 기사 차고지 마커 ─────────────────────────────────────────────────

function DriverMarkers() {
  const { drivers } = useDispatchStore();
  return drivers.map((driver) => (
    <Marker
      key={driver.id}
      position={[driver.lat, driver.lng]}
      icon={createGarageIcon()}
    >
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

// ─── 지도 초기화 컴포넌트 ──────────────────────────────────────────────

function MapInitializer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

// ─── 메인 MapDashboard ─────────────────────────────────────────────────

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
    (ids) => {
      setSelectedStoreIds(ids);
    },
    [setSelectedStoreIds]
  );

  // 선택된 매장 적재율 계산
  const selectedStores = stores.filter((s) => selectedStoreIds.has(s.id));
  const totalAmount = selectedStores.reduce(
    (sum, s) => sum + (isWeekendMode ? s.saturdaySales : s.avgDailySales),
    0
  );
  const loadRate = calcLoadRate(totalAmount);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[LOGISTICS_CENTER.lat, LOGISTICS_CENTER.lng]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <MapInitializer />

        {/* 물류센터 마커 */}
        <Marker
          position={[LOGISTICS_CENTER.lat, LOGISTICS_CENTER.lng]}
          icon={DEPOT_ICON}
        >
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

      {/* 지도 위 오버레이 정보 */}
      <div className="absolute top-3 left-3 z-[1000] space-y-2 pointer-events-none">
        {/* 모드 배지 */}
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
          isWeekendMode
            ? 'bg-orange-500 text-white'
            : 'bg-teal-600 text-white'
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
          <div className="bg-slate-900/90 text-white px-3 py-1.5 rounded-lg text-xs shadow-lg backdrop-blur-sm">
            <span className="text-amber-400 font-bold">{selectedStoreIds.size}개</span> 선택됨 ·{' '}
            <span className={`font-bold ${loadRate > 100 ? 'text-red-400' : loadRate >= 90 ? 'text-green-400' : 'text-slate-300'}`}>
              {formatMoney(totalAmount)}
            </span>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="absolute bottom-6 left-3 z-[1000] bg-slate-900/90 backdrop-blur-sm rounded-xl p-3 shadow-xl text-xs">
        <div className="font-semibold text-white mb-2">범례</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-teal-500 border-2 border-white flex-shrink-0" />
            <span className="text-slate-300">일반 매장</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white flex-shrink-0" />
            <span className="text-slate-300">피크 매장 (주말 +30%↑)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white flex-shrink-0" />
            <span className="text-slate-300">피크 매장 (주말 모드)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-teal-500 flex-shrink-0" />
            <span className="text-slate-300">선택된 매장</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">🏭</span>
            <span className="text-slate-300">물류센터 (화성)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">🚚</span>
            <span className="text-slate-300">기사 차고지</span>
          </div>
          {confirmedCourses.length > 0 && (
            <>
              <div className="border-t border-slate-700 my-1" />
              {confirmedCourses.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white flex-shrink-0"
                    style={{ background: c.color }} />
                  <span className="text-slate-300">코스 {c.courseNo} · {c.driverName}</span>
                </div>
              ))}
              {confirmedCourses.length > 4 && (
                <div className="text-slate-500">+{confirmedCourses.length - 4}개 코스</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
