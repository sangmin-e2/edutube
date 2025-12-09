import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Search, FileText, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react';
import { AppStep, VideoRecommendation, AssessmentOption, VideoAnalysis } from './types';
import { searchVideos, analyzeVideoAndSuggest, generateLessonPlan } from './services/geminiService';
import { StepIndicator } from './components/StepIndicator';
import { VideoCard } from './components/VideoCard';
import { AssessmentCard } from './components/AssessmentCard';

declare global {
  interface Window {
    ClipboardItem: any;
  }
}

const App: React.FC = () => {
  // State
  const [step, setStep] = useState<AppStep>(AppStep.INPUT_TOPIC);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecommendation | null>(null);
  const [videoSummary, setVideoSummary] = useState<string>('');
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentOption | null>(null);
  const [lessonPlan, setLessonPlan] = useState<string>('');

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const markdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [step]);

  // Handlers
  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const results = await searchVideos(topic);
      if (results.length === 0) {
        setError("관련 영상을 찾을 수 없습니다. 다른 주제로 시도해보세요.");
      } else {
        setVideos(results);
        setStep(AppStep.SELECT_VIDEO);
      }
    } catch (err) {
        setError("비디오 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoSelect = async () => {
    if (!selectedVideo) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result: VideoAnalysis = await analyzeVideoAndSuggest(selectedVideo.title, selectedVideo.url);
      setVideoSummary(result.summary);
      setAssessments(result.assessments);
      setStep(AppStep.SELECT_ASSESSMENT);
    } catch (err) {
      setError("영상 분석에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssessmentSelect = async () => {
    if (!selectedAssessment || !selectedVideo) return;

    setIsLoading(true);
    setError(null);
    try {
      const plan = await generateLessonPlan(topic, selectedVideo.title, selectedAssessment.title);
      setLessonPlan(plan);
      setStep(AppStep.VIEW_PLAN);
    } catch (err) {
      setError("수업 지도안 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriteToGoogleDocs = async () => {
    if (!markdownRef.current) return;

    try {
        // Get the rendered HTML content
        let htmlContent = markdownRef.current.innerHTML;
        const textContent = markdownRef.current.innerText;

        // INJECT STYLES FOR GOOGLE DOCS
        // Google Docs often strips classes, so we must use inline styles.
        // 1. Force black borders on tables, th, td
        htmlContent = htmlContent.replace(/<table/g, '<table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid black;"');
        htmlContent = htmlContent.replace(/<th/g, '<th style="border: 1px solid black; padding: 8px; background-color: #f3f4f6;"');
        htmlContent = htmlContent.replace(/<td/g, '<td style="border: 1px solid black; padding: 8px;"');
        
        // 2. Wrap the whole thing in a div with font settings to ensure clean paste
        htmlContent = `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #000;">${htmlContent}</div>`;

        // Create Blob for rich text copy
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([textContent], { type: 'text/plain' });

        const data = [new window.ClipboardItem({
            ['text/html']: blobHtml,
            ['text/plain']: blobText,
        })];

        await navigator.clipboard.write(data);
        
        // Notify and Open
        alert("✨ 수업 지도안 내용이 복사되었습니다!\n\n잠시 후 열리는 구글 문서(Google Docs)에서\n[Ctrl + V] 또는 [붙여넣기]를 하면 표와 형식이 완벽하게 붙여넣어집니다.");
        
        window.open('https://docs.new', '_blank');
        
    } catch (err) {
        console.error("Clipboard export failed:", err);
        // Fallback for browsers with stricter security
        navigator.clipboard.writeText(lessonPlan);
        window.open('https://docs.new', '_blank');
        alert("텍스트가 복사되었습니다. 새 문서에 붙여넣기 해주세요.");
    }
  };

  const resetApp = () => {
    if (confirm("처음으로 돌아가시겠습니까? 현재 진행 상황은 저장되지 않습니다.")) {
        setStep(AppStep.INPUT_TOPIC);
        setTopic('');
        setVideos([]);
        setSelectedVideo(null);
        setAssessments([]);
        setSelectedAssessment(null);
        setLessonPlan('');
        setError(null);
    }
  };

  const goBack = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="mt-4 text-lg font-medium text-slate-600">AI가 내용을 작성 중입니다...</p>
      <p className="text-sm text-slate-400">잠시만 기다려주세요.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <FileText size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">EduTube Planner</h1>
          </div>
          {step > AppStep.INPUT_TOPIC && (
             <button onClick={resetApp} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm font-medium">
                <RefreshCw size={14} /> 처음으로
             </button>
          )}
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto max-w-3xl">
          <StepIndicator currentStep={step} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto max-w-3xl p-4 sm:p-6 pb-32" ref={contentRef}>
        
        {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 border border-red-200 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-sm underline">닫기</button>
            </div>
        )}

        {isLoading ? renderLoading() : (
          <>
            {/* Step 0: Input Topic */}
            {step === AppStep.INPUT_TOPIC && (
              <div className="py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">어떤 수업을 준비하시나요?</h2>
                  <p className="text-slate-600">수업 주제를 입력하면 AI가 최적의 유튜브 영상과 수행평가 계획을 제안합니다.</p>
                </div>
                <form onSubmit={handleTopicSubmit} className="max-w-xl mx-auto">
                  <div className="relative">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="예: 조선 후기의 사회 변동, 뉴턴의 운동 법칙"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white p-5 pr-14 text-lg shadow-sm transition-colors focus:border-blue-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!topic.trim()}
                        className="absolute right-3 top-3 bottom-3 aspect-square rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Search size={24} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 1: Select Video */}
            {step === AppStep.SELECT_VIDEO && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">영상 선택하기</h2>
                    <p className="text-slate-600">수업에 활용하고 싶은 영상을 선택해주세요.</p>
                </div>
                
                <div className="grid gap-4">
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      isSelected={selectedVideo?.id === video.id}
                      onSelect={setSelectedVideo}
                    />
                  ))}
                </div>

                <div className="mt-8 flex justify-between sticky bottom-4 z-20">
                    <button onClick={goBack} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-medium shadow-sm hover:bg-slate-50">
                        <ChevronLeft size={18} /> 뒤로
                    </button>
                    <button
                        onClick={handleVideoSelect}
                        disabled={!selectedVideo}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        다음: 영상 분석 <ArrowRight size={18} />
                    </button>
                </div>
              </div>
            )}

            {/* Step 2: Select Assessment */}
            {step === AppStep.SELECT_ASSESSMENT && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 rounded-2xl bg-indigo-50 p-6 border border-indigo-100">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-indigo-500">선택한 영상 요약</h3>
                  <p className="text-lg text-indigo-900 leading-relaxed font-medium">{videoSummary}</p>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">수행평가 주제 선택</h2>
                <p className="text-slate-600 mb-6">원하는 수행평가를 선택하면 상세 지도안을 작성해드립니다.</p>

                <div className="grid gap-4">
                  {assessments.map((assessment) => (
                    <AssessmentCard
                      key={assessment.id}
                      assessment={assessment}
                      isSelected={selectedAssessment?.id === assessment.id}
                      onSelect={setSelectedAssessment}
                    />
                  ))}
                </div>

                <div className="mt-8 flex justify-between sticky bottom-4 z-20">
                    <button onClick={goBack} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-medium shadow-sm hover:bg-slate-50">
                        <ChevronLeft size={18} /> 뒤로
                    </button>
                    <button
                        onClick={handleAssessmentSelect}
                        disabled={!selectedAssessment}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        다음: 지도안 작성 <ArrowRight size={18} />
                    </button>
                </div>
              </div>
            )}

            {/* Step 3: View Plan & Export */}
            {step === AppStep.VIEW_PLAN && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">수업 지도안 생성 완료</h2>
                    <p className="text-slate-600">
                        아래 버튼을 누르면 지도안이 복사되고 <b>Google Docs</b>가 자동으로 열립니다.<br/>
                        열린 문서에서 <b>[붙여넣기]</b>만 하시면 됩니다.
                    </p>
                </div>

                {/* Primary Action Button */}
                <div className="flex justify-center mb-10">
                    <button
                        onClick={handleWriteToGoogleDocs}
                        className="group flex items-center gap-4 px-8 py-5 rounded-2xl bg-blue-600 text-white text-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all transform hover:-translate-y-1"
                    >
                        <div className="bg-white p-2 rounded-lg">
                            <img src="https://www.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png" alt="Docs" className="w-8 h-8" />
                        </div>
                        Google Docs로 자동 작성하기
                        <ArrowRight className="opacity-70 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Hidden Preview (Needed for clipboard copy source) */}
                <div className="relative opacity-50 hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 bg-slate-50/50 hover:bg-transparent pointer-events-none z-10 flex items-center justify-center">
                        <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100">미리보기</span>
                    </div>
                    {/* Render with remarkGfm for proper tables in the preview */}
                    <div ref={markdownRef} className="prose prose-blue max-w-none bg-white p-8 rounded-2xl border border-slate-200 shadow-sm blur-[1px] hover:blur-none transition-all">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonPlan}</ReactMarkdown>
                    </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;