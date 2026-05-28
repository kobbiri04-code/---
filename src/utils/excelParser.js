import * as XLSX from 'xlsx';

/**
 * XLSX/CSV 파일을 읽어 JSON 배열로 변환
 * @param {File} file
 * @returns {Promise<Array<Object>>}
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: '',
        });
        resolve(json);
      } catch (err) {
        reject(new Error(`파일 파싱 오류: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 매장 데이터 행을 표준 포맷으로 정규화
 * 컬럼명이 다양할 수 있어 유사한 키명을 탐지
 * @param {Array<Object>} rows
 * @returns {Array<Object>}
 */
export function normalizeStoreData(rows) {
  return rows
    .map((row, idx) => {
      // 키를 소문자+공백제거로 정규화하여 유연하게 매핑
      const normalizedRow = {};
      for (const [k, v] of Object.entries(row)) {
        normalizedRow[k.toLowerCase().replace(/\s+/g, '')] = v;
      }

      const name =
        findValue(normalizedRow, ['행레이블', '매장명', 'store', 'name', '상호명', '점포명']) ||
        `매장-${idx + 1}`;
      const address =
        findValue(normalizedRow, ['매장주소', '주소', 'address', '소재지', '위치']) || '';
      const avgDailySales = toNumber(
        findValue(normalizedRow, ['일평균매출', '평일매출', '일매출', '평균매출', 'daily', 'weekday'])
      );
      const saturdaySales = toNumber(
        findValue(normalizedRow, ['토요일', '토요일매출', '주말매출', '토', 'saturday', 'weekend', 'sat'])
      );

      return {
        id: `store-${idx}-${Date.now()}`,
        name,
        address,
        avgDailySales,
        saturdaySales,
        isPeak: saturdaySales > 0 && saturdaySales / avgDailySales >= 1.3,
      };
    })
    .filter((s) => s.name); // 이름 없는 행 제거
}

/**
 * 기사 데이터 행을 표준 포맷으로 정규화
 * @param {Array<Object>} rows
 * @returns {Array<Object>}
 */
export function normalizeDriverData(rows) {
  return rows
    .map((row, idx) => {
      const normalizedRow = {};
      for (const [k, v] of Object.entries(row)) {
        normalizedRow[k.toLowerCase().replace(/\s+/g, '')] = v;
      }

      const name =
        findValue(normalizedRow, ['기사명', '이름', 'name', '성명', '드라이버', 'driver']) ||
        `기사-${idx + 1}`;
      const garage =
        findValue(normalizedRow, ['차고지', '거주지', '주소', 'garage', 'home', '출발지']) || '';
      const vehicleTon =
        findValue(normalizedRow, ['차량톤수', '톤수', '차량', 'ton', 'vehicle', '트럭']) || '1톤';

      return {
        id: `driver-${idx}-${Date.now()}`,
        name,
        garage,
        vehicleTon,
      };
    })
    .filter((d) => d.name);
}

/** 유사한 키 중 첫 번째 값을 찾는 헬퍼 */
function findValue(obj, keys) {
  for (const key of keys) {
    const k = key.toLowerCase().replace(/\s+/g, '');
    if (obj[k] !== undefined && obj[k] !== '') return obj[k];
    // 부분 매칭
    const partial = Object.keys(obj).find((ok) => ok.includes(k) || k.includes(ok));
    if (partial && obj[partial] !== '') return obj[partial];
  }
  return undefined;
}

/** 문자열 또는 숫자를 숫자로 변환 */
function toNumber(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.round(val);
  return Math.round(Number(String(val).replace(/[^0-9.-]/g, '')) || 0);
}
