import React, { useCallback, useState } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Loader2, Trash2, RefreshCw, X,
} from 'lucide-react';
import { parseExcelFile, normalizeStoreData, normalizeDriverData } from '../utils/excelParser';
import { batchGeocode } from '../utils/geocoding';
import useDispatchStore from '../store/dispatchStore';
import { REAL_STORE_DATA } from '../data/storeData';
import { SAMPLE_DRIVERS } from '../data/sampleData';

/**
 * 파일 업로드 드롭존 컴포넌트
 */
function DropZone({ type, onFileParsed, onReset, disabled, count }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState(count > 0 ? 'success' : 'idle');
  const [message, setMessage] = useState(count > 0 ? `${count}개 항목 로드됨` : '');
  const [fileName, setFileName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const config = {
    store: {
      label: '매장별 매출 데이터',
      sublabel: '행레이블(매장명) · 매장주소 · 일평균매출 · 토요일매출',
      icon: '🏪',
      accept: '.xlsx,.xls,.csv',
      resetLabel: '매장 데이터 초기화',
      resetWarning: '매장 데이터 및 확정된 배차 코스가 모두 삭제됩니다.',
    },
    driver: {
      label: '배송 매니저 정보',
      sublabel: '기사명 · 차고지주소 · 차량톤수',
      icon: '🚚',
      accept: '.xlsx,.xls,.csv',
      resetLabel: '기사 데이터 초기화',
      resetWarning: '기사 목록이 삭제됩니다.',
    },
  }[type];

  // 외부에서 count 변경 시 status 동기화
  React.useEffect(() => {
    if (count > 0 && status === 'idle') {
      setStatus('success');
      setMessage(`${count}개 항목 로드됨`);
    }
  }, [count]);

  const processFile = useCallback(
    async (file) => {
      if (!file) return;
      setStatus('loading');
      setFileName(file.name);
      setMessage('파일 파싱 중...');
      try {
        const rows = await parseExcelFile(file);
        setMessage(`${rows.length}개 행 파싱 완료. 지오코딩 중...`);
        await onFileParsed(rows);
        setStatus('success');
        setMessage(`${rows.length}개 항목 로드 완료`);
      } catch (err) {
        setStatus('error');
        setMessage(err.message);
      }
    },
    [onFileParsed]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile]
  );

  // 초기화 확정 처리
  const handleConfirmReset = () => {
    onReset();
    setStatus('idle');
    setMessage('');
    setFileName('');
    setShowConfirm(false);
  };

  const borderColor = isDragOver
    ? 'border-blue-400 bg-blue-500/10'
    : status === 'success'
    ? 'border-teal-400 bg-teal-500/10'
    : status === 'error'
    ? 'border-red-400 bg-red-500/10'
    : 'border-slate-600 hover:border-slate-400 bg-slate-800/50';

  return (
    <div className="relative">
      {/* 드롭존 본체 */}
      <div
        className={`border-2 border-dashed rounded-xl p-3.5 cursor-pointer transition-all duration-200 ${borderColor} ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${type}`).click()}
      >
        <input
          id={`file-input-${type}`}
          type="file"
          accept={config.accept}
          className="hidden"
          onChange={handleChange}
        />

        <div className="flex items-center gap-3">
          <div className="text-2xl">{config.icon}</div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{config.label}</span>
              {status === 'success' && <CheckCircle size={13} className="text-teal-400 flex-shrink-0" />}
              {status === 'error'   && <AlertCircle size={13} className="text-red-400 flex-shrink-0" />}
              {status === 'loading' && <Loader2 size={13} className="text-blue-400 animate-spin flex-shrink-0" />}
              {/* 건수 배지 */}
              {count > 0 && (
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-full font-medium">
                  {count}개
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{config.sublabel}</div>
            {status !== 'idle' && (
              <div className={`text-xs mt-1 font-medium truncate ${
                status === 'success' ? 'text-teal-300'
                : status === 'error'  ? 'text-red-300'
                : 'text-blue-300'
              }`}>
                {fileName && <span className="text-slate-400 mr-1">{fileName}</span>}
                {message}
              </div>
            )}
            {status === 'idle' && (
              <div className="text-xs text-slate-500 mt-1">
                파일을 드래그하거나 클릭하여 업로드 (.xlsx · .csv)
              </div>
            )}
          </div>

          {/* 오른쪽: 업로드 아이콘 + 초기화 버튼 */}
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* 재업로드(새로고침) 아이콘 */}
            {status === 'success' && (
              <button
                title="다른 파일로 재업로드"
                onClick={() => document.getElementById(`file-input-${type}`).click()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
              >
                <RefreshCw size={14} />
              </button>
            )}
            {/* 초기화 버튼 */}
            {count > 0 && (
              <button
                title={config.resetLabel}
                onClick={() => setShowConfirm(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
            {status === 'idle' && <Upload size={16} className="text-slate-500" />}
          </div>
        </div>
      </div>

      {/* ── 초기화 확인 모달 ── */}
      {showConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl overflow-hidden">
          {/* 배경 블러 */}
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm rounded-xl" />
          <div className="relative z-10 text-center px-4 py-3 w-full">
            <div className="text-2xl mb-1.5">🗑️</div>
            <div className="text-sm font-bold text-white mb-1">{config.resetLabel}</div>
            <div className="text-xs text-slate-400 mb-3 leading-relaxed">{config.resetWarning}</div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-all"
              >
                <X size={11} /> 취소
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
              >
                <Trash2 size={11} /> 초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 전체 파일 업로더 영역
 */
export default function FileUploader() {
  const {
    setStores, setDrivers,
    resetStores, resetDrivers,
    setGeocodingProgress, setIsGeocoding,
    stores, drivers,
  } = useDispatchStore();

  // 매장 파일 파싱 완료
  const handleStoreParsed = useCallback(
    async (rows) => {
      setIsGeocoding(true);
      const normalized = normalizeStoreData(rows);
      const geocoded = await batchGeocode(normalized, 'address', (p) => {
        setGeocodingProgress(p);
      });
      setStores(geocoded);
      setIsGeocoding(false);
    },
    [setStores, setGeocodingProgress, setIsGeocoding]
  );

  // 기사 파일 파싱 완료
  const handleDriverParsed = useCallback(
    async (rows) => {
      setIsGeocoding(true);
      const normalized = normalizeDriverData(rows);
      const geocoded = await batchGeocode(normalized, 'garage', (p) => {
        setGeocodingProgress(p);
      });
      setDrivers(geocoded);
      setIsGeocoding(false);
    },
    [setDrivers, setGeocodingProgress, setIsGeocoding]
  );

  // 매장 초기화 → 기본 데이터 복원
  const handleStoreReset = useCallback(() => {
    resetStores();
  }, [resetStores]);

  // 기사 초기화 → 기본 기사 복원
  const handleDriverReset = useCallback(() => {
    resetDrivers();
  }, [resetDrivers]);

  return (
    <div className="bg-slate-900 border-b border-slate-700 px-4 py-3">
      <div className="max-w-screen-2xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-2.5">
          <FileSpreadsheet size={15} className="text-blue-400" />
          <h2 className="text-sm font-bold text-white">데이터 업로드</h2>
          <span className="text-[10px] text-slate-500">엑셀·CSV 드래그&드롭 또는 클릭 업로드</span>
        </div>

        {/* 드롭존 2개 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DropZone
            type="store"
            onFileParsed={handleStoreParsed}
            onReset={handleStoreReset}
            count={stores.length}
          />
          <DropZone
            type="driver"
            onFileParsed={handleDriverParsed}
            onReset={handleDriverReset}
            count={drivers.length}
          />
        </div>
      </div>
    </div>
  );
}
