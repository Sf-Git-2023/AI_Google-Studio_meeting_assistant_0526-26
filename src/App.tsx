import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  Languages,
  FileText,
  ClipboardCopy,
  Check,
  Trash2,
  Send,
  RefreshCw,
  Sliders,
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  HelpCircle,
  ArrowRight,
  Info,
  BookOpen
} from "lucide-react";
import { SAMPLE_TRANSCRIPTS } from "./samples";
import { SummarizeResponse } from "./types";

export default function App() {
  // State for inputs
  const [transcript, setTranscript] = useState<string>("");
  const [focusNotes, setFocusNotes] = useState<string>("");
  const [translationType, setTranslationType] = useState<string>("bilingual");

  // State for processing
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProgressStr, setLoadingProgressStr] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // State for result
  const [aiResult, setAiResult] = useState<string>("");
  const [modelUsed, setModelUsed] = useState<string>("gemini-3.5-flash");
  const [copied, setCopied] = useState<boolean>(false);

  // Timer reference for rolling funny messages
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to result or focus refs
  const resultRef = useRef<HTMLDivElement>(null);

  // Array of helpful processing messages to entertain users while waiting for the AI response
  const loadingMessages = [
    "正在解析發言者角色與對談脈絡...",
    "正在過濾口語贅詞與無意義閒聊...",
    "正在提煉核心討論議題與雙方共識...",
    "正在彙整具體分工與決議待辦事項...",
    "正在將核心結論精心撰寫成商用英文...",
    "正在進行 Markdown 格式排版與表格最佳化...",
    "最後微調，高質感會議記錄即將出爐..."
  ];

  // Rotate loading messages
  useEffect(() => {
    if (loading) {
      let index = 0;
      setLoadingProgressStr(loadingMessages[0]);
      loadingIntervalRef.current = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        setLoadingProgressStr(loadingMessages[index]);
      }, 2500);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [loading]);

  // Load a sample transcript
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_TRANSCRIPTS.find((s) => s.id === sampleId);
    if (sample) {
      setTranscript(sample.transcript);
      setFocusNotes(sample.focusNotes || "");
      setErrorMsg(null);
    }
  };

  // Run the AI Summarization
  const handleGenerateMinutes = async () => {
    if (!transcript || transcript.trim().length === 0) {
      setErrorMsg("請在左側輸入框中貼上會議逐字稿或筆記內容再進行生成！");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setAiResult("");

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript,
          focusNotes,
          translationType: 
            translationType === "bilingual" 
              ? "英中雙語對照摘要" 
              : translationType === "to_english" 
              ? "純商用英文重點摘要與記錄" 
              : "純繁體中文會議紀錄，加強翻譯"
        }),
      });

      const data: SummarizeResponse = await response.json();

      if (response.ok && data.success && data.result) {
        setAiResult(data.result);
        if (data.modelUsed) {
          setModelUsed(data.modelUsed);
        }
        // Smooth scroll to results
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        setErrorMsg(data.message || "AI 處理時發生系統錯誤，請確認網路或 API 設定。");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("無法連接至後端伺服器，請稍後再試。原因：" + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Copy result to clipboard
  const handleCopyToClipboard = async () => {
    if (!aiResult) return;
    try {
      await navigator.clipboard.writeText(aiResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("無法複製文本：", err);
    }
  };

  // Calculate stats
  const charCount = transcript.length;
  // Estimate conversation duration (avg speaking rate is roughly 250 characters per minute)
  const estimatedMins = Math.max(1, Math.round(charCount / 220));

  return (
    <div id="app-container" className="geometric-grid min-h-screen text-slate-800 flex flex-col antialiased">
      {/* 頂部導航欄 (配合 Geometric Balance 極簡現代精緻設計) */}
      <nav className="h-16 border-b bg-white flex items-center justify-between px-6 sm:px-8 z-10 shadow-xs sticky top-0">
        <div className="flex items-center gap-3">
          {/* 創意 45 度旋轉幾何 Logo 元件 */}
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
            <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1">
              AI 智慧會議助理 
              <span className="text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-0.5 rounded-md ml-1.5 hidden sm:inline-block">
                v2.0 Professional
              </span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-semibold tracking-wider">
            繁體中文模式
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-xs text-blue-600 shadow-xs">
            A
          </div>
        </div>
      </nav>

      {/* 主體內容區 (Geometric Balance 佈局空間與無縫銜接) */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* 引導與快速加載區 */}
        <section className="glass-card rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-blue-600 rounded-xs"></span>
              快速體驗說明
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              貼上會議錄音逐字稿，AI 將自動轉換成精緻的待辦與摘要表格。
              無現成稿件嗎？請點擊右側按鈕直接體驗由 AI 結構化整理的<strong>「真實逐字稿預設範例」</strong>。
            </p>
          </div>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 shrink-0">
            {SAMPLE_TRANSCRIPTS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleLoadSample(sample.id)}
                className="bg-white hover:bg-slate-50 active:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                {sample.title.split("（")[0]}
              </button>
            ))}
          </div>
        </section>

        {/* 錯誤橫幅 */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 px-5 py-4 rounded-xl shadow-xs flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm">輸入有誤</h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{errorMsg}</p>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="text-slate-400 hover:text-rose-600 transition p-1"
              aria-label="關閉錯誤提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 核心雙欄幾何對比佈局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* 左欄：原始逐字稿輸入 + System Instructions (1/3 寬度) */}
          <section className="lg:col-span-5 flex flex-col gap-5">
            
            {/* 逐字稿輸入玻璃卡片 */}
            <div className="glass-card rounded-xl p-5 flex flex-col flex-grow gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  原始會議逐字稿輸入
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-mono">
                    字數: {charCount.toLocaleString()}
                  </span>
                  {transcript && (
                    <button
                      onClick={() => {
                        setTranscript("");
                        setFocusNotes("");
                        setErrorMsg(null);
                      }}
                      disabled={loading}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" />
                      清除
                    </button>
                  )}
                </div>
              </div>

              {/* 大文字輸入框 */}
              <div className="flex flex-col gap-1.5 flex-grow">
                <textarea
                  id="transcript-input"
                  name="transcript-input"
                  rows={13}
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="請在此貼上完整的會議口語逐字稿，點擊按鈕即可進行深度淬煉整理。"
                  className="w-full flex-grow text-xs sm:text-sm font-sans text-slate-600 bg-slate-50/50 border border-slate-200 rounded-lg p-4 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none leading-relaxed min-h-[320px]"
                />
                
                {/* 預估時程細節 */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 mt-0.5 font-mono">
                  <span>預估發言: {estimatedMins} 分鐘</span>
                  <span>字數統計: {charCount} 字符</span>
                </div>
              </div>

              {/* 關注方向 input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="focus-notes" className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  提煉特別指示 (選填)
                </label>
                <input
                  id="focus-notes"
                  name="focus-notes"
                  type="text"
                  value={focusNotes}
                  onChange={(e) => setFocusNotes(e.target.value)}
                  placeholder="例如：請強調專案卡關時程、忽略開場閒暄聊"
                  className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              {/* 翻譯傾向選擇 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-blue-500" />
                  翻譯與摘要輸出方向
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "bilingual", label: "雙語對照", desc: "英中雙對" },
                    { id: "chinese", label: "繁體中文", desc: "精緻整理" },
                    { id: "english", label: "商務英文", desc: "純商用英" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setTranslationType(option.id)}
                      className={`py-2 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col justify-center items-center ${
                        translationType === option.id
                          ? "bg-blue-50/70 border-blue-500 text-blue-700 font-bold"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className="text-[11px]">{option.label}</span>
                      <span className="text-[9px] opacity-65 scale-90 leading-none">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 完美的生成按鈕，增加硬朗幾何微動效 */}
              <div className="mt-2 text-center">
                <button
                  onClick={handleGenerateMinutes}
                  disabled={loading || !transcript.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在分析發言重點中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>生成會議記錄與翻譯</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* System Instructions 專業盒子 (Geometric Balance 精髓還原) */}
            <div className="glass-card rounded-xl p-4 bg-slate-900 text-slate-300">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  System Instructions 系統層提示設定
                </h3>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-sm font-mono leading-none">
                  ROLE: SUMMARIZER & TRANSLATOR
                </span>
              </div>
              <div className="system-prompt-box opacity-80 text-[11px] leading-relaxed max-h-32 overflow-y-auto pr-1">
                You are a professional meeting assistant.<br />
                1. 提煉高精緻 Executive Summary。<br />
                2. 條列核心爭議、關鍵討論並追蹤其後續 Resolution 與時程計畫。<br />
                3. 提供精美 Markdown 文字並對待辦規劃輸出雙語對照表格。
              </div>
            </div>

          </section>

          {/* 右欄：AI 生成結果呈現區 (2/3 寬度) */}
          <section 
            ref={resultRef}
            className="lg:col-span-7 flex flex-col"
          >
            <div className="glass-card rounded-xl flex flex-col flex-grow overflow-hidden min-h-[580px]">
              
              {/* 卡片標題與操控區 */}
              <div className="bg-white border-b p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : aiResult ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></div>
                  <h2 className="font-bold text-slate-700 text-sm sm:text-base">AI 處理結果：會議摘要與翻譯</h2>
                </div>

                {/* 控制按鈕 */}
                {aiResult && !loading && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 rounded-md text-xs font-bold transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>已複製</span>
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="w-3.5 h-3.5" />
                          <span>一鍵複製內容</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setAiResult("")}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                      title="重置"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 輸出內容區 */}
              <div className="flex-grow p-5 sm:p-8 bg-white overflow-y-auto flex flex-col justify-start">
                
                {/* 1. 空狀態體驗 */}
                {!loading && !aiResult && (
                  <div className="my-auto mx-auto max-w-sm text-center py-16 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">等待點擊生成會議記錄</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        請在左方貼上會議文字材料並點擊按鈕，Gemini 大腦會自動依照您的自訂提煉指示與輸出傾向整理出含基本資訊、Executive Summary、議題討論與分工待辦表等板塊。
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. 載入中骨架 */}
                {loading && (
                  <div className="flex flex-col gap-6 animate-pulse">
                    <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-lg flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-500 font-semibold tracking-wide">
                        {loadingProgressStr || "AI 會議大腦正在高速運轉中..."}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="h-6 w-1/3 rounded bg-slate-200"></div>
                      <div className="h-4 w-full rounded bg-slate-150"></div>
                      <div className="h-4 w-5/6 rounded bg-slate-150"></div>
                      
                      <div className="h-6 w-1/4 rounded bg-slate-200 pt-3"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-full rounded bg-slate-100"></div>
                        <div className="h-4 w-11/12 rounded bg-slate-100"></div>
                        <div className="h-4 w-4/5 rounded bg-slate-100"></div>
                      </div>

                      <div className="h-20 w-full rounded bg-slate-100 border border-slate-50 mt-4"></div>
                    </div>
                  </div>
                )}

                {/* 3. 完美 Markdown 呈現 */}
                {!loading && aiResult && (
                  <div className="markdown-content select-text animate-fadeIn">
                    <ReactMarkdown>{aiResult}</ReactMarkdown>
                    
                    {/* 幾何簽名結尾段落 */}
                    <div className="pt-6 border-t border-slate-100 mt-8 font-serif italic text-slate-400 text-xs flex justify-between items-center">
                      <span>AI Generated Analysis • Model: {modelUsed}</span>
                      <span className="bg-slate-50 px-2 py-0.5 rounded font-mono text-[10px] text-slate-400">CONFIDENCE: 99%</span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </section>

        </div>
      </main>

      {/* 底部 Footer */}
      <footer className="h-12 bg-slate-100 border-t flex items-center justify-between px-6 sm:px-8 text-[10px] text-slate-400 uppercase tracking-widest mt-12 shrink-0">
        <div>© 2026 INTELLIGENT MEETING SOLUTIONS</div>
        <div className="flex items-center gap-1.5 font-bold">
          API Status: <span className="text-emerald-600 font-bold">CONNECTED</span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
        </div>
      </footer>
    </div>
  );
}
