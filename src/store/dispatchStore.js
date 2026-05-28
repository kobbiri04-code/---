import { create } from 'zustand';

/**
 * 전역 배차 상태 관리 스토어 (Zustand)
 * - 매장 마스터 데이터
 * - 기사 마스터 데이터
 * - 선택된 매장 집합
 * - 확정된 배차 코스
 * - 평일/주말 모드
 */
const useDispatchStore = create((set, get) => ({
  // ─── 원본 마스터 데이터 ─────────────────────────────
  stores: [],        // 매장 목록 (geocoded)
  drivers: [],       // 기사 목록

  // ─── 선택 상태 ─────────────────────────────────────
  selectedStoreIds: new Set(),  // 현재 올가미로 선택된 매장 ID Set

  // ─── 배차 확정 코스 ──────────────────────────────────
  confirmedCourses: [],  // [{ id, stores, driverId, totalAmount, createdAt }]

  // ─── 모드 ─────────────────────────────────────────
  isWeekendMode: false,  // false=평일, true=주말(토요일)
  isLassoMode: false,    // 올가미 툴 활성화 여부

  // ─── 로딩 상태 ─────────────────────────────────────
  geocodingProgress: 0,  // 0~100
  isGeocoding: false,

  // ─── Actions ─────────────────────────────────────

  /** 매장 데이터 설정 */
  setStores: (stores) => set({ stores }),

  /** 기사 데이터 설정 */
  setDrivers: (drivers) => set({ drivers }),

  /** 매장 선택 토글 (단일) */
  toggleStoreSelection: (storeId) => {
    const prev = get().selectedStoreIds;
    const next = new Set(prev);
    if (next.has(storeId)) {
      next.delete(storeId);
    } else {
      next.add(storeId);
    }
    set({ selectedStoreIds: next });
  },

  /** 올가미로 선택된 매장들 일괄 설정 */
  setSelectedStoreIds: (ids) => set({ selectedStoreIds: new Set(ids) }),

  /** 선택 초기화 */
  clearSelection: () => set({ selectedStoreIds: new Set() }),

  /** 평일/주말 모드 토글 */
  toggleWeekendMode: () => set((s) => ({ isWeekendMode: !s.isWeekendMode })),

  /** 올가미 툴 토글 */
  toggleLassoMode: () => set((s) => ({ isLassoMode: !s.isLassoMode })),

  /** 지오코딩 진행률 */
  setGeocodingProgress: (progress) => set({ geocodingProgress: progress }),
  setIsGeocoding: (v) => set({ isGeocoding: v }),

  /**
   * 배차 확정 저장
   * @param {string} driverId
   */
  confirmDispatch: (driverId) => {
    const { stores, selectedStoreIds, isWeekendMode, confirmedCourses, drivers } = get();
    const selectedStores = stores.filter((s) => selectedStoreIds.has(s.id));
    if (selectedStores.length === 0) return;

    const totalAmount = selectedStores.reduce(
      (sum, s) => sum + (isWeekendMode ? s.saturdaySales : s.avgDailySales),
      0
    );

    const driver = drivers.find((d) => d.id === driverId);

    const newCourse = {
      id: `COURSE-${Date.now()}`,
      courseNo: confirmedCourses.length + 1,
      stores: selectedStores,
      driverId,
      driverName: driver?.name || '미배정',
      totalAmount,
      isWeekendMode,
      createdAt: new Date().toLocaleString('ko-KR'),
      color: COURSE_COLORS[confirmedCourses.length % COURSE_COLORS.length],
    };

    set((s) => ({
      confirmedCourses: [...s.confirmedCourses, newCourse],
      selectedStoreIds: new Set(),
    }));

    return newCourse;
  },

  /** 확정 코스 삭제 */
  removeCourse: (courseId) =>
    set((s) => ({
      confirmedCourses: s.confirmedCourses.filter((c) => c.id !== courseId),
    })),

  /** 전체 초기화 */
  resetAll: () =>
    set({
      stores: [],
      drivers: [],
      selectedStoreIds: new Set(),
      confirmedCourses: [],
      isWeekendMode: false,
      isLassoMode: false,
    }),
}));

/** 코스별 색상 팔레트 */
export const COURSE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#a855f7',
  '#ef4444', '#22c55e', '#eab308', '#6366f1',
];

/** 배차 한도 상수 */
export const MAX_LOAD_AMOUNT = 12_000_000;

/** 피크타임 기준 비율 */
export const PEAK_RATIO_THRESHOLD = 1.3; // 30% 이상 폭증

export default useDispatchStore;
