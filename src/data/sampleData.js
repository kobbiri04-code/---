/**
 * 데모용 샘플 데이터
 * 실제 파일 업로드 전 즉시 테스트 가능한 경기도 화성 인근 매장/기사 데이터
 */

export const SAMPLE_STORES = [
  { id: 's1',  name: '동탄점',    address: '경기도 화성시 동탄',    avgDailySales: 1_800_000, saturdaySales: 2_800_000, lat: 37.2042, lng: 127.0756 },
  { id: 's2',  name: '향남점',    address: '경기도 화성시 향남읍',  avgDailySales: 950_000,  saturdaySales: 1_050_000, lat: 37.0726, lng: 126.9678 },
  { id: 's3',  name: '병점점',    address: '경기도 화성시 병점동',  avgDailySales: 1_200_000, saturdaySales: 1_850_000, lat: 37.1983, lng: 126.9998 },
  { id: 's4',  name: '오산점',    address: '경기도 오산시 오산동',  avgDailySales: 1_100_000, saturdaySales: 1_250_000, lat: 37.1498, lng: 127.0774 },
  { id: 's5',  name: '수원영통점', address: '경기도 수원시 영통구', avgDailySales: 2_100_000, saturdaySales: 2_900_000, lat: 37.2499, lng: 127.0612 },
  { id: 's6',  name: '수원인계점', address: '경기도 수원시 인계동', avgDailySales: 1_650_000, saturdaySales: 1_720_000, lat: 37.2636, lng: 127.0286 },
  { id: 's7',  name: '안산고잔점', address: '경기도 안산시 단원구', avgDailySales: 1_380_000, saturdaySales: 2_100_000, lat: 37.3215, lng: 126.8309 },
  { id: 's8',  name: '시흥정왕점', address: '경기도 시흥시 정왕동', avgDailySales: 880_000,  saturdaySales: 920_000,  lat: 37.3459, lng: 126.7336 },
  { id: 's9',  name: '평택점',    address: '경기도 평택시 평택동',  avgDailySales: 1_500_000, saturdaySales: 1_750_000, lat: 36.9921, lng: 127.1128 },
  { id: 's10', name: '평택고덕점', address: '경기도 평택시 고덕면',  avgDailySales: 750_000,  saturdaySales: 950_000,  lat: 37.0651, lng: 127.1243 },
  { id: 's11', name: '안성점',    address: '경기도 안성시 안성동',  avgDailySales: 620_000,  saturdaySales: 680_000,  lat: 37.0080, lng: 127.2800 },
  { id: 's12', name: '군포점',    address: '경기도 군포시 산본동',  avgDailySales: 1_100_000, saturdaySales: 1_700_000, lat: 37.3613, lng: 126.9350 },
  { id: 's13', name: '의왕점',    address: '경기도 의왕시 내손동',  avgDailySales: 890_000,  saturdaySales: 980_000,  lat: 37.3449, lng: 126.9686 },
  { id: 's14', name: '용인기흥점', address: '경기도 용인시 기흥구', avgDailySales: 2_200_000, saturdaySales: 3_100_000, lat: 37.2748, lng: 127.1138 },
  { id: 's15', name: '용인수지점', address: '경기도 용인시 수지구', avgDailySales: 1_850_000, saturdaySales: 2_450_000, lat: 37.3232, lng: 127.0950 },
  { id: 's16', name: '성남분당점', address: '경기도 성남시 분당구', avgDailySales: 2_500_000, saturdaySales: 3_200_000, lat: 37.3849, lng: 127.1233 },
  { id: 's17', name: '하남점',    address: '경기도 하남시 신장동',  avgDailySales: 1_200_000, saturdaySales: 1_550_000, lat: 37.5391, lng: 127.2149 },
  { id: 's18', name: '이천점',    address: '경기도 이천시 이천동',  avgDailySales: 780_000,  saturdaySales: 850_000,  lat: 37.2723, lng: 127.4347 },
  { id: 's19', name: '안산상록점', address: '경기도 안산시 상록구', avgDailySales: 1_050_000, saturdaySales: 1_580_000, lat: 37.3003, lng: 126.8309 },
  { id: 's20', name: '화성봉담점', address: '경기도 화성시 봉담읍', avgDailySales: 720_000,  saturdaySales: 780_000,  lat: 37.2130, lng: 126.9234 },
];

// isPeak 자동 계산 적용
SAMPLE_STORES.forEach((s) => {
  s.isPeak = s.saturdaySales > 0 && s.saturdaySales / s.avgDailySales >= 1.3;
});

export const SAMPLE_DRIVERS = [
  { id: 'd1', name: '김철수', garage: '경기도 화성시 동탄',  vehicleTon: '2.5톤', lat: 37.2042, lng: 127.0756 },
  { id: 'd2', name: '이영희', garage: '경기도 수원시 팔달구', vehicleTon: '1톤',   lat: 37.2636, lng: 127.0286 },
  { id: 'd3', name: '박민준', garage: '경기도 평택시 비전동', vehicleTon: '3.5톤', lat: 36.9921, lng: 127.1128 },
  { id: 'd4', name: '최지수', garage: '경기도 안산시 단원구', vehicleTon: '2.5톤', lat: 37.3215, lng: 126.8309 },
  { id: 'd5', name: '정하준', garage: '경기도 용인시 기흥구', vehicleTon: '1톤',   lat: 37.2748, lng: 127.1138 },
  { id: 'd6', name: '한소희', garage: '경기도 화성시 향남읍', vehicleTon: '5톤',   lat: 37.0726, lng: 126.9678 },
];
