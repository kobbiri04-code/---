/**
 * 지오코딩 유틸리티
 * - 실제 프로덕션에서는 카카오/네이버/Google Maps API를 사용
 * - 여기서는 경기도 화성 인근 좌표를 기반으로 한 Mock 함수 제공
 * - 주소 키워드를 파싱하여 대략적인 좌표를 반환
 */

// 경기도 화성시 물류센터 기준 좌표
export const LOGISTICS_CENTER = {
  lat: 37.1895,
  lng: 126.8310,
  name: '경기도 화성시 물류센터',
};

// 지역별 대략 좌표 사전 (Mock 데이터)
const REGION_COORDS = {
  // 경기도
  '화성': { lat: 37.1895, lng: 126.8310 },
  '수원': { lat: 37.2636, lng: 127.0286 },
  '오산': { lat: 37.1498, lng: 127.0774 },
  '평택': { lat: 36.9921, lng: 127.1128 },
  '안산': { lat: 37.3215, lng: 126.8309 },
  '시흥': { lat: 37.3800, lng: 126.8031 },
  '군포': { lat: 37.3613, lng: 126.9350 },
  '의왕': { lat: 37.3449, lng: 126.9686 },
  '용인': { lat: 37.2411, lng: 127.1775 },
  '성남': { lat: 37.4200, lng: 127.1270 },
  '광주': { lat: 37.4292, lng: 127.2559 },
  '하남': { lat: 37.5391, lng: 127.2149 },
  '이천': { lat: 37.2723, lng: 127.4347 },
  '여주': { lat: 37.2987, lng: 127.6375 },
  '안성': { lat: 37.0080, lng: 127.2800 },
  '동탄': { lat: 37.2042, lng: 127.0756 },
  '향남': { lat: 37.0726, lng: 126.9678 },
  // 서울
  '서울': { lat: 37.5665, lng: 126.9780 },
  '강남': { lat: 37.5172, lng: 127.0473 },
  '마포': { lat: 37.5663, lng: 126.9010 },
  '송파': { lat: 37.5145, lng: 127.1059 },
  // 인천
  '인천': { lat: 37.4563, lng: 126.7052 },
  '부천': { lat: 37.5034, lng: 126.7660 },
};

/**
 * 주소 문자열에서 지역 키워드를 찾아 대략적인 좌표 반환
 * @param {string} address
 * @returns {{ lat: number, lng: number }}
 */
function parseCoordFromAddress(address) {
  if (!address) return null;

  for (const [keyword, coord] of Object.entries(REGION_COORDS)) {
    if (address.includes(keyword)) {
      // 같은 지역 내에서도 약간의 랜덤 오프셋으로 분산 배치
      return {
        lat: coord.lat + (Math.random() - 0.5) * 0.08,
        lng: coord.lng + (Math.random() - 0.5) * 0.08,
      };
    }
  }

  // 기본값: 화성 인근 랜덤
  return {
    lat: LOGISTICS_CENTER.lat + (Math.random() - 0.5) * 0.5,
    lng: LOGISTICS_CENTER.lng + (Math.random() - 0.5) * 0.5,
  };
}

/**
 * Mock 지오코딩 함수 (비동기)
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export async function geocodeAddress(address) {
  // 실제 API 호출 시뮬레이션용 딜레이 (10~30ms)
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 + 10));
  const coord = parseCoordFromAddress(address);
  return coord || { lat: LOGISTICS_CENTER.lat, lng: LOGISTICS_CENTER.lng };
}

/**
 * 배열의 매장/기사 목록을 일괄 지오코딩
 * @param {Array} items
 * @param {string} addressKey - 주소 필드명
 * @param {Function} onProgress - 진행률 콜백 (0~100)
 * @returns {Promise<Array>}
 */
export async function batchGeocode(items, addressKey, onProgress) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const coord = await geocodeAddress(item[addressKey]);
    results.push({ ...item, lat: coord.lat, lng: coord.lng });
    onProgress && onProgress(Math.round(((i + 1) / items.length) * 100));
  }
  return results;
}

/**
 * 점이 다각형 내부에 있는지 판별 (Ray Casting Algorithm)
 * @param {{ lat: number, lng: number }} point
 * @param {Array<[number, number]>} polygon - [[lat,lng], ...]
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) {
  const { lat: py, lng: px } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
