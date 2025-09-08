import { useState, lazy, Suspense } from 'react';
import { Zap, Lock, Code, Grid3X3, Settings2, Target, HelpCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputSection } from '@/components/input-section';
import { ResultsSection } from '@/components/results-section';
import { LivePreviewPanel } from '@/components/live-preview-panel';

// Lazy load heavy components
const EducationalSection = lazy(() => import('@/components/educational-section').then(m => ({ default: m.EducationalSection })));
const FeaturesSection = lazy(() => import('@/components/features-section').then(m => ({ default: m.FeaturesSection })));
const TextEncoder = lazy(() => import('@/components/text-encoder').then(m => ({ default: m.TextEncoder })));
const EncodingComparison = lazy(() => import('@/components/encoding-comparison').then(m => ({ default: m.EncodingComparison })));
const PipelineBuilder = lazy(() => import('@/components/pipeline-builder').then(m => ({ default: m.PipelineBuilder })));

// Import analysis functions normally for now to avoid complexity
import { analyzeText } from '@/lib/decoder';
import { performCrossCheckAnalysis } from '@/lib/cross-check-engine';
import { validateAndBeautifyOutput } from '@/lib/output-validator';
import { AnalysisResult } from '@/types/analysis';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/lib/responsive';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { validateSecureRequest, sanitizeUserInput } from '@/lib/client-security';

export default function Home() {
  // Regular decoder state
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  
  // Pro mode state (separate from regular decoder)
  const [proInputText, setProInputText] = useState('');
  const [proIsLoading, setProIsLoading] = useState(false);
  const [proProgress, setProProgress] = useState(0);
  const [proProgressStatus, setProProgressStatus] = useState('');
  const [proResults, setProResults] = useState<AnalysisResult | null>(null);
  
  const [useCrossCheck, setUseCrossCheck] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const { toast } = useToast();
  const { isMobile, isTablet, deviceType } = useResponsive();

  const handleAnalyze = async (forceFormat?: string) => {
    if (!inputText.trim()) return;

    // Security validation
    if (!validateSecureRequest()) {
      toast({
        title: "Security Check Failed",
        description: "Request blocked for security reasons",
        variant: "destructive",
      });
      return;
    }

    // Sanitize input
    const sanitizedInput = sanitizeUserInput(inputText);
    if (sanitizedInput !== inputText) {
      setInputText(sanitizedInput);
      toast({
        title: "Input Sanitized",
        description: "Potentially unsafe content was removed from your input",
        variant: "default",
      });
    }

    setIsLoading(true);
    setProgress(0);
    setProgressStatus('Starting analysis...');
    
    try {
      let analysisResults: AnalysisResult;
      
      if (useCrossCheck) {
        setProgressStatus('Running cross-check analysis...');
        const crossCheckResults = performCrossCheckAnalysis(inputText);
        analysisResults = {
          bestMatch: crossCheckResults.bestMatch,
          alternatives: crossCheckResults.alternatives,
          inputAnalysis: crossCheckResults.inputAnalysis
        };
        
        toast({
          title: "Cross-Check Complete",
          description: `${crossCheckResults.strategiesUsed.length} strategies used, ${crossCheckResults.consensusStrength} consensus`,
          variant: "default",
        });
      } else {
        // Handle manual format selection
        if (forceFormat && forceFormat !== "Auto-Detect") {
          setProgress(10);
          setProgressStatus(`Loading ${forceFormat} decoder...`);
          
          try {
            const { detectionPatterns } = await import('@/lib/detectors');
            
            setProgress(30);
            setProgressStatus(`Finding ${forceFormat} pattern...`);
            
            // Find the matching detection pattern
            const pattern = detectionPatterns.find(p => p.name === forceFormat);
            if (!pattern) {
              throw new Error(`Format "${forceFormat}" is not supported for manual decoding`);
            }
            
            setProgress(50);
            setProgressStatus(`Decoding as ${forceFormat}...`);
            
            // Try to decode with the specific pattern
            const decoded = pattern.decoder(inputText);
            if (!decoded) {
              throw new Error(`Failed to decode text as ${forceFormat}. The input may not be valid ${forceFormat} format.`);
            }
            
            setProgress(80);
            setProgressStatus(`Validating decoded result...`);
            
            analysisResults = {
              bestMatch: {
                type: forceFormat,
                result: decoded,
                confidence: 95, // High confidence for manual selection
                entropy: 0,
                languageScore: 0,
                steps: [`Manual: ${forceFormat}`],
                isValid: true
              },
              alternatives: [],
              inputAnalysis: {
                length: inputText.length,
                entropy: 0,
                hasValidUtf8: true
              }
            };
            
            setProgress(100);
            setProgressStatus(`Manual decoding complete`);
            
          } catch (error) {
            setProgress(0);
            setProgressStatus('');
            toast({
              title: "Manual Decoding Failed",
              description: `Failed to decode as ${forceFormat}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        } else {
          // Auto-detect mode
          analysisResults = analyzeText(inputText, {
            maxSize: 1024 * 1024, // 1MB limit
            useCache: true,
            enableChunking: true,
            progressCallback: (progressPercent: number, status: string) => {
              setProgress(progressPercent);
              setProgressStatus(status);
            }
          });
        }
      }
      
      // Validate and beautify the output
      const validation = validateAndBeautifyOutput(analysisResults.bestMatch.result);
      if (validation.isValid && validation.formatted) {
        analysisResults.bestMatch.result = validation.formatted;
        analysisResults.bestMatch.steps.push(`Auto-formatted as ${validation.type.toUpperCase()}`);
        
        toast({
          title: "Output Enhanced",
          description: `Detected and formatted as ${validation.type.toUpperCase()}`,
          variant: "default",
        });
      }
      
      setResults(analysisResults);
      
      // Show success message for large inputs
      if (inputText.length > 10000) {
        toast({
          title: "Large Input Processed",
          description: `Successfully analyzed ${Math.floor(inputText.length / 1024)}KB of data with enhanced performance optimizations.`,
          variant: "default",
        });
      }
      
      // Scroll to results after a short delay
      setTimeout(() => {
        const resultsElement = document.querySelector('[data-testid="results-section"]');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } catch (error) {
      setProgress(0);
      setProgressStatus('');
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Keep progress visible briefly before clearing
      setTimeout(() => {
        setProgress(0);
        setProgressStatus('');
      }, 2000);
    }
  };

  // Separate handler for Pro Mode
  const handleProAnalyze = async (forceFormat?: string) => {
    if (!proInputText.trim()) return;

    setProIsLoading(true);
    setProProgress(0);
    setProProgressStatus('Starting pro analysis...');
    
    try {
      let analysisResults: AnalysisResult;
      
      if (useCrossCheck) {
        setProProgressStatus('Running cross-check analysis...');
        const crossCheckResults = performCrossCheckAnalysis(proInputText);
        analysisResults = {
          bestMatch: crossCheckResults.bestMatch,
          alternatives: crossCheckResults.alternatives,
          inputAnalysis: crossCheckResults.inputAnalysis
        };
        
        toast({
          title: "Cross-Check Complete",
          description: `${crossCheckResults.strategiesUsed.length} strategies used, ${crossCheckResults.consensusStrength} consensus`,
          variant: "default",
        });
      } else {
        // Handle manual format selection for pro mode
        if (forceFormat && forceFormat !== "Auto-Detect") {
          setProProgress(10);
          setProProgressStatus(`Loading ${forceFormat} decoder...`);
          
          try {
            const { detectionPatterns } = await import('@/lib/detectors');
            
            setProProgress(30);
            setProProgressStatus(`Finding ${forceFormat} pattern...`);
            
            const pattern = detectionPatterns.find(p => p.name === forceFormat);
            if (!pattern) {
              throw new Error(`Format "${forceFormat}" is not supported for manual decoding`);
            }
            
            setProProgress(50);
            setProProgressStatus(`Decoding as ${forceFormat}...`);
            
            const decoded = pattern.decoder(proInputText);
            if (!decoded) {
              throw new Error(`Failed to decode text as ${forceFormat}. The input may not be valid ${forceFormat} format.`);
            }
            
            setProProgress(80);
            setProProgressStatus(`Validating decoded result...`);
            
            analysisResults = {
              bestMatch: {
                type: forceFormat,
                result: decoded,
                confidence: 95,
                entropy: 0,
                languageScore: 0,
                steps: [`Manual: ${forceFormat}`],
                isValid: true
              },
              alternatives: [],
              inputAnalysis: {
                length: proInputText.length,
                entropy: 0,
                hasValidUtf8: true
              }
            };
            
            setProProgress(100);
            setProProgressStatus(`Manual decoding complete`);
            
          } catch (error) {
            setProProgress(0);
            setProProgressStatus('');
            toast({
              title: "Manual Decoding Failed",
              description: `Failed to decode as ${forceFormat}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              variant: "destructive",
            });
            setProIsLoading(false);
            return;
          }
        } else {
          // Auto-detect mode for pro
          analysisResults = analyzeText(proInputText, {
            maxSize: 1024 * 1024,
            useCache: true,
            enableChunking: true,
            progressCallback: (progressPercent: number, status: string) => {
              setProProgress(progressPercent);
              setProProgressStatus(status);
            }
          });
        }
      }
      
      // Validate and beautify the output
      const validation = validateAndBeautifyOutput(analysisResults.bestMatch.result);
      if (validation.isValid && validation.formatted) {
        analysisResults.bestMatch.result = validation.formatted;
        analysisResults.bestMatch.steps.push(`Auto-formatted as ${validation.type.toUpperCase()}`);
        
        toast({
          title: "Output Enhanced",
          description: `Detected and formatted as ${validation.type.toUpperCase()}`,
          variant: "default",
        });
      }
      
      setProResults(analysisResults);
      
      // Show success message for large inputs
      if (proInputText.length > 10000) {
        toast({
          title: "Large Input Processed",
          description: `Successfully analyzed ${Math.floor(proInputText.length / 1024)}KB of data with enhanced performance optimizations.`,
          variant: "default",
        });
      }
      
      // Scroll to results after a short delay
      setTimeout(() => {
        const resultsElement = document.querySelector('[data-testid="results-section"]');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } catch (error) {
      setProProgress(0);
      setProProgressStatus('');
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setProIsLoading(false);
      // Keep progress visible briefly before clearing
      setTimeout(() => {
        setProProgress(0);
        setProProgressStatus('');
      }, 2000);
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen bg-grid-pattern">
      {/* Header */}
      <header className="border-b border-yellow-400/20 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 animate-fade-in-up">
              {/* SwiftX Logo */}
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center animate-glow-pulse shadow-lg">
                <img 
                  src="/Assest/Logo.png" 
                  alt="SwiftX Logo" 
                  className="w-10 h-10 rounded-xl object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent animate-shimmer">
                  Swift<span className="text-orange-400 font-black">X</span>
                </h1>
                <span className="text-xs text-muted-foreground hidden sm:inline leading-tight">Advanced Text Decoder & Cryptography Tool</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-muted-foreground">
                Made By <span className="text-yellow-400 font-semibold">Emris</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto py-6 md:py-8 ${isMobile ? 'px-4' : isTablet ? 'px-6' : 'px-4 sm:px-6 lg:px-8'}`}>
        {/* Hero Section */}
        <div className={`text-center animate-fade-in-240hz gpu-accelerated ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <h2 className={`font-bold mb-3 md:mb-4 mx-auto text-center ${isMobile ? 'text-2xl' : isTablet ? 'text-3xl' : 'text-4xl'}`}>
            <span className="inline-block text-yellow-400">Decode</span> <span className="inline-block text-yellow-400 animate-pulse">Anything</span><span className="inline-block text-yellow-400">, </span><span className="inline-block text-yellow-400 font-extrabold">Instantly</span>
          </h2>
          <p className={`text-muted-foreground max-w-2xl mx-auto ${isMobile ? 'text-base px-2' : 'text-lg'}`}>
            Paste any encoded text to decode it instantly, or use our comprehensive encoder to convert your text into 25+ different formats with real-time efficiency tracking.
          </p>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="decoder" className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-5'} bg-card border border-yellow-400/20 ${isMobile ? 'mb-6' : 'mb-8'} ${isMobile ? 'h-12' : 'h-10'}`}>
            <TabsTrigger 
              value="decoder" 
              className="flex items-center space-x-2 data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400 hover:bg-yellow-400/10 hover:scale-105 transition-all duration-200 active:scale-95 active:bg-yellow-400/30"
              data-testid="tab-decoder"
            >
              <Code className="h-4 w-4" />
              <span>Decoder</span>
            </TabsTrigger>
            <TabsTrigger 
              value="encoder" 
              className="flex items-center space-x-2 data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400 hover:bg-yellow-400/10 hover:scale-105 transition-all duration-200 active:scale-95 active:bg-yellow-400/30"
              data-testid="tab-encoder"
            >
              <Lock className="h-4 w-4" />
              <span>Encoder</span>
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger 
                  value="comparison" 
                  className="flex items-center space-x-2 data-[state=active]:bg-purple-400/20 data-[state=active]:text-purple-400 hover:bg-purple-400/10 hover:scale-105 transition-all duration-200 active:scale-95 active:bg-purple-400/30"
                  data-testid="tab-comparison"
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span>Compare</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pipeline" 
                  className="flex items-center space-x-2 data-[state=active]:bg-green-400/20 data-[state=active]:text-green-400 hover:bg-green-400/10 hover:scale-105 transition-all duration-200 active:scale-95 active:bg-green-400/30"
                  data-testid="tab-pipeline"
                >
                  <Settings2 className="h-4 w-4" />
                  <span>Pipeline</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="crosscheck" 
                  className="flex items-center space-x-2 data-[state=active]:bg-red-400/20 data-[state=active]:text-red-400 hover:bg-red-400/10 hover:scale-105 transition-all duration-200 active:scale-95 active:bg-red-400/30"
                  data-testid="tab-crosscheck"
                >
                  <Target className="h-4 w-4" />
                  <span>Pro Mode</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
          
          <TabsContent value="decoder" className="space-y-6 animate-slide-in-240hz gpu-accelerated">
            <div className={`grid gap-6 ${showLivePreview && !isMobile ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
              <div className={showLivePreview && !isMobile ? 'lg:col-span-2' : 'col-span-1'}>
                {/* Input Section */}
                <InputSection
                  inputText={inputText}
                  setInputText={setInputText}
                  onAnalyze={handleAnalyze}
                  isLoading={isLoading}
                  progress={progress}
                  progressStatus={progressStatus}
                />

                {/* Results Section */}
                {results && <ResultsSection results={results} />}
              </div>
              
              {/* Live Preview Panel */}
              {!isMobile && (
                <div className="lg:col-span-1">
                  <LivePreviewPanel
                    inputText={inputText}
                    isVisible={showLivePreview}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="encoder" className="animate-slide-in-240hz gpu-accelerated">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <TextEncoder />
            </Suspense>
          </TabsContent>

          {!isMobile && (
            <>
              <TabsContent value="comparison" className="animate-slide-in-240hz gpu-accelerated">
                <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <EncodingComparison isVisible={true} />
                </Suspense>
              </TabsContent>

              <TabsContent value="pipeline" className="animate-slide-in-240hz gpu-accelerated">
                <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <PipelineBuilder isVisible={true} />
                </Suspense>
              </TabsContent>

              <TabsContent value="crosscheck" className="space-y-6 animate-slide-in-240hz gpu-accelerated">
                <div className="bg-gradient-to-r from-red-400/10 to-orange-400/10 border border-red-400/20 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Cross-Check Pro Mode</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-red-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Advanced analysis mode that combines multiple detection strategies for maximum accuracy. Uses regex patterns, entropy analysis, signature detection, and language scoring to provide consensus-based results.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ultra-accurate detection using multiple analysis strategies: regex patterns, entropy analysis, signature detection, and language scoring.
                  </p>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCrossCheck}
                        onChange={(e) => setUseCrossCheck(e.target.checked)}
                        className="w-4 h-4 text-red-400 rounded border-red-400/30 bg-gray-800"
                      />
                      <span className="text-sm text-red-400">Enable Cross-Check Analysis</span>
                    </label>
                  </div>
                </div>

                <InputSection
                  inputText={proInputText}
                  setInputText={setProInputText}
                  onAnalyze={handleProAnalyze}
                  isLoading={proIsLoading}
                  progress={proProgress}
                  progressStatus={proProgressStatus}
                  mode="pro"
                />

                {proResults && <ResultsSection results={proResults} />}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Educational Section */}
        <div className="animate-fade-in-up">
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <EducationalSection />
          </Suspense>
        </div>

        {/* Features Section */}
        <div className="animate-fade-in-up">
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <FeaturesSection />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-yellow-400/20 bg-gray-900/80 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3 animate-fade-in-up">
              <div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center animate-pulse-slow">
                <Zap className="h-3 w-3 text-black" />
              </div>
              <span className="text-sm text-muted-foreground">© 2025 SwiftX. Advanced decoding for cybersecurity professionals.</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a 
                href="/terms-of-service.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-yellow-400 transition-colors duration-200 underline decoration-dotted underline-offset-4 hover:decoration-yellow-400"
              >
                Terms of Service
              </a>
              <a 
                href="/privacy-policy.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-yellow-400 transition-colors duration-200 underline decoration-dotted underline-offset-4 hover:decoration-yellow-400"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
