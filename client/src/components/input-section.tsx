import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw, Loader2, Database, Sparkles, Settings } from 'lucide-react';
import { withPerformanceOptimization } from '@/lib/performance';
import { useResponsive, getResponsiveClass, RESPONSIVE_BUTTONS, RESPONSIVE_INPUTS } from '@/lib/responsive';
import { getAllEncodingTypes } from '@/lib/encoder';

interface InputSectionProps {
  inputText: string;
  setInputText: (text: string) => void;
  onAnalyze: (forceFormat?: string) => void;
  isLoading: boolean;
  progress?: number;
  progressStatus?: string;
  mode?: 'decoder' | 'pro';
}

export function InputSection({ inputText, setInputText, onAnalyze, isLoading, progress = 0, progressStatus = '', mode = 'decoder' }: InputSectionProps) {
  const { deviceType, isMobile, isTablet } = useResponsive();
  const [selectedFormat, setSelectedFormat] = useState<string>("Auto-Detect");
  
  // Get all available encoding formats
  const encodingCategories = getAllEncodingTypes();
  const allFormats = Object.values(encodingCategories).flat();
  
  const handleClear = () => {
    setInputText('');
  };

  const handleAnalyze = () => {
    if (inputText.trim()) {
      const formatToUse = selectedFormat === "Auto-Detect" ? undefined : selectedFormat;
      onAnalyze(formatToUse);
    }
  };

  // Enhanced decoder-specific examples with comprehensive validation and variety
  const decoderExamples = [
    {
      name: "Base64 Message",
      data: "SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBzYW1wbGUgQmFzZTY0IGVuY29kZWQgbWVzc2FnZS4=",
      description: "Classic Base64 encoded text",
      expectedResult: "Hello World! This is a sample Base64 encoded message.",
      difficulty: "Beginner",
      category: "Base Encodings",
      tips: "Look for padding characters (=) and Base64 alphabet"
    },
    {
      name: "Hex Encoded Message", 
      data: "48656c6c6f20576f726c6421205468697320697320612073616d706c652048657861646563696d616c20656e636f646564206d6573736167652e",
      description: "Hexadecimal encoded message with ASCII text",
      expectedResult: "Hello World! This is a sample Hexadecimal encoded message.",
      difficulty: "Beginner",
      category: "Base Encodings",
      tips: "Only uses characters 0-9 and A-F, pairs represent ASCII values"
    },
    {
      name: "URL Encoded Data",
      data: "Hello%20World%21%20This%20is%20a%20sample%20URL%20encoded%20message%20with%20special%20characters%3A%20%26%2C%20%3D%2C%20%3F",
      description: "URL encoded with special characters and spaces",
      expectedResult: "Hello World! This is a sample URL encoded message with special characters: &, =, ?",
      difficulty: "Beginner",
      category: "Web Encodings",
      tips: "Look for % followed by hex digits representing special characters"
    },
    {
      name: "Caesar Cipher (Shift 3)",
      data: "Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj",
      description: "Caesar cipher with classic shift of 3",
      expectedResult: "The quick brown fox jumps over the lazy dog",
      difficulty: "Intermediate",
      category: "Classical Ciphers",
      tips: "Each letter shifted by 3 positions in alphabet (A→D, B→E, etc.)"
    },
    {
      name: "Binary Text",
      data: "01001000 01100101 01101100 01101100 01101111 00100000 01010111 01101111 01110010 01101100 01100100",
      description: "8-bit binary representation of ASCII text",
      expectedResult: "Hello World",
      difficulty: "Intermediate",
      category: "Numeric Encodings",
      tips: "Groups of 8 bits represent ASCII character codes"
    },
    {
      name: "Morse Code Message",
      data: ".... . .-.. .-.. --- / .-- --- .-. .-.. -..",
      description: "International Morse code with proper spacing",
      expectedResult: "HELLO WORLD",
      difficulty: "Intermediate",
      category: "Classical Encodings",
      tips: "Dots (.), dashes (-), spaces between letters, / between words"
    },
    {
      name: "Base32 Encoded",
      data: "JBSWY3DPEBLW64TMMQQQ====",
      description: "Base32 encoding with padding",
      expectedResult: "Hello World",
      difficulty: "Intermediate",
      category: "Base Encodings",
      tips: "Uses A-Z and 2-7, padding with = characters"
    },
    {
      name: "HTML Entities",
      data: "&lt;script&gt;alert(&quot;Hello World&quot;);&lt;/script&gt;",
      description: "HTML entity encoded JavaScript",
      expectedResult: "<script>alert(\"Hello World\");</script>",
      difficulty: "Beginner",
      category: "Web Encodings",
      tips: "Named entities (&lt;, &gt;, &quot;) represent special HTML characters"
    },
    {
      name: "ROT13 Text",
      data: "Uryyb Jbeyq! Guvf vf n grfg bs EBG13 rapelcgvba.",
      description: "ROT13 cipher (rotate by 13)",
      expectedResult: "Hello World! This is a test of ROT13 encryption.",
      difficulty: "Beginner",
      category: "Classical Ciphers",
      tips: "Each letter rotated 13 positions (A→N, B→O, etc.)"
    },
    {
      name: "Unicode Escapes",
      data: "\\u0048\\u0065\\u006c\\u006c\\u006f\\u0020\\u0057\\u006f\\u0072\\u006c\\u0064",
      description: "Unicode escape sequences for ASCII text",
      expectedResult: "Hello World",
      difficulty: "Intermediate",
      category: "Unicode Encodings",
      tips: "\\u followed by 4 hex digits representing Unicode code points"
    },
    {
      name: "JSON Escaped String",
      data: "\\\"Hello World!\\\" \\n\\tThis is a \\\\test\\\\ with \\\"quotes\\\" and \\/ slashes.",
      description: "JSON string with escaped special characters",
      expectedResult: "\"Hello World!\" \n\tThis is a \\test\\ with \"quotes\" and / slashes.",
      difficulty: "Intermediate",
      category: "Web Encodings",
      tips: "Backslash escapes for quotes, newlines, tabs, and special chars"
    },
    {
      name: "Atbash Cipher",
      data: "Svool Dliow",
      description: "Hebrew Atbash cipher (A↔Z, B↔Y, etc.)",
      expectedResult: "Hello World",
      difficulty: "Advanced",
      category: "Classical Ciphers",
      tips: "Each letter maps to its opposite in alphabet (A→Z, B→Y, C→X)"
    }
  ];

  // Enhanced Pro mode examples - complex scenarios requiring advanced cross-check analysis
  const proModeExamples = [
    {
      name: "Multi-Layer Base64",
      data: "U0dWc2JHOGdWMjl5YkdRaElGUm9hWE1nYVhNZ1lTQnRkV3gwYVMxc1lYbGxjaUJsYm1OdlpHVmtJRzFsYzNOaFoyVXU=",
      description: "Base64 encoded multiple times (3 layers deep)",
      expectedResult: "Hello World! This is a multi-layer encoded message.",
      difficulty: "Expert",
      category: "Multi-Layer Analysis",
      tips: "Pro Mode will detect and decode all layers automatically",
      analysisHints: "Look for decreasing entropy at each layer, consensus between strategies"
    },
    {
      name: "Ambiguous Hex/ASCII",
      data: "41424344454647484950",
      description: "Could be hex (ASCII: ABCDEFGHIP) or other format",
      expectedResult: "ABCDEFGHIP",
      difficulty: "Advanced",
      category: "Format Ambiguity",
      tips: "Cross-check engine resolves between hex and ASCII interpretations",
      analysisHints: "Multiple strategies will provide different confidence scores"
    },
    {
      name: "Nested ROT13 + Base64",
      data: "VWJxcSBKYmVxcSEgR3V2ZiBmdiBuIGdyZmcgYnMgWEJHMTMgZW5wZWxjZ3ZiYS4=",
      description: "Base64 containing ROT13 encoded text",
      expectedResult: "Hello World! This is a test of ROT13 encryption.",
      difficulty: "Expert", 
      category: "Nested Ciphers",
      tips: "Multi-layer analysis will find ROT13 after Base64 decoding",
      analysisHints: "First layer: Base64, Second layer: ROT13 pattern detection"
    },
    {
      name: "Unsigned JWT Token",
      data: "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.",
      description: "JWT with 'none' algorithm (no signature)",
      expectedResult: "Header: {\"alg\":\"none\",\"typ\":\"JWT\"} Payload: {\"sub\":\"1234567890\",\"name\":\"John Doe\",\"iat\":1516239022}",
      difficulty: "Advanced",
      category: "Structured Data",
      tips: "JWT structure: header.payload.signature (signature empty for 'none' alg)",
      analysisHints: "Two Base64 segments separated by dots, JSON content detection"
    },
    {
      name: "Mixed Unicode + Hex",
      data: "\\u0048656c6c6f\\u0020576f726c64",
      description: "Unicode escapes mixed with hex encoding",
      expectedResult: "Hello World",
      difficulty: "Advanced",
      category: "Mixed Encodings",
      tips: "Contains both \\u escapes and hex sequences requiring multi-strategy analysis",
      analysisHints: "Pattern recognition for mixed encoding signatures"
    },
    {
      name: "Unpadded Base64",
      data: "SGVsbG8gV29ybGQ",
      description: "Base64 without padding (missing = characters)",
      expectedResult: "Hello World",
      difficulty: "Intermediate",
      category: "Edge Cases",
      tips: "Smart detection handles missing padding in Base64",
      analysisHints: "Entropy analysis and character distribution patterns"
    },
    {
      name: "Caesar + URL Encoding",
      data: "Wkh%20txlfn%20eurzq%20ira%20mxpsv%20ryhu%20wkh%20odcb%20grj",
      description: "Caesar cipher (shift 3) with URL encoded spaces",
      expectedResult: "The quick brown fox jumps over the lazy dog",
      difficulty: "Expert",
      category: "Compound Ciphers",
      tips: "First decode URL encoding, then apply Caesar cipher analysis",
      analysisHints: "Sequential decoding with multiple format detection"
    },
    {
      name: "Binary + Base64",
      data: "MDEwMDEwMDAgMDExMDAxMDEgMDExMDExMDAgMDExMDExMDAgMDExMDExMTE=",
      description: "Binary data encoded as Base64",
      expectedResult: "Hello",
      difficulty: "Expert",
      category: "Multi-Layer Analysis", 
      tips: "Base64 contains binary representation of ASCII text",
      analysisHints: "Layer 1: Base64, Layer 2: Binary-to-ASCII conversion"
    },
    {
      name: "HTML + Caesar Cipher",
      data: "&lt;vqj&gt;Wklv lv d vdpsoh phvvdjh&lt;/vqj&gt;",
      description: "HTML entities containing Caesar-encoded content",
      expectedResult: "<tag>This is a sample message</tag>",
      difficulty: "Expert",
      category: "Nested Encodings",
      tips: "Decode HTML entities first, then detect Caesar cipher pattern",
      analysisHints: "HTML structure with encrypted content requiring cipher analysis"
    },
    {
      name: "Obfuscated Hex",
      data: "48:65:6c:6c:6f:20:57:6f:72:6c:64",
      description: "Hex with colon separators (MAC address style)",
      expectedResult: "Hello World",
      difficulty: "Intermediate",
      category: "Format Variations",
      tips: "Hex encoding with non-standard delimiters",
      analysisHints: "Pattern recognition for formatted hex with separators"
    }
  ];

  const currentExamples = mode === 'pro' ? proModeExamples : decoderExamples;

  const handleQuickExample = () => {
    const randomExample = currentExamples[Math.floor(Math.random() * currentExamples.length)];
    setInputText(randomExample.data);
  };

  // Calculate input size and show warnings
  const inputSizeKB = Math.floor(inputText.length / 1024);
  const inputSizeMB = Math.floor(inputText.length / (1024 * 1024));
  const isLargeInput = inputText.length > 10000; // 10KB
  const isVeryLargeInput = inputText.length > 100000; // 100KB  
  const isExtremelyLarge = inputText.length > 100 * 1024 * 1024; // 100MB - practical browser limit
  const isNearBrowserLimit = inputText.length > 500 * 1024 * 1024; // 500MB - approaching 1GB limit
  
  return (
    <Card className="shadow-lg border-2 border-yellow-400/20 mb-8 animate-fade-in-240hz glow-yellow card-240hz gpu-accelerated">
      <CardContent className={`smooth-transition-240hz ${isMobile ? 'p-5' : isTablet ? 'p-6' : 'p-8'}`}>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <label htmlFor="input-text" className="text-sm font-medium text-yellow-200">
              📝 Paste your encoded text here
            </label>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {inputText.length > 0 && (
                <>
                  <Database className="h-3 w-3" />
                  <span className={
                    isNearBrowserLimit ? 'text-red-400 font-bold' : 
                    isExtremelyLarge ? 'text-orange-300 font-semibold' : 
                    inputSizeKB > 500 ? 'text-orange-300' : 
                    inputSizeKB > 100 ? 'text-yellow-200' : 
                    'text-green-300'
                  }>
                    {inputSizeMB > 0 ? `${inputSizeMB}MB` : inputSizeKB > 0 ? `${inputSizeKB}KB` : `${inputText.length} chars`}
                  </span>
                  {isNearBrowserLimit && <span className="text-red-400 font-bold">🚨 Near limit</span>}
                  {isExtremelyLarge && !isNearBrowserLimit && <span className="text-orange-400 font-semibold">⚠️ Very large</span>}
                  {isVeryLargeInput && !isExtremelyLarge && <span className="text-yellow-400 font-medium">⚡ Large input</span>}
                </>
              )}
            </div>
          </div>
          
          {/* Format Selection Dropdown */}
          {/* Format Detection - Only show in regular decoder mode, not in Pro Mode */}
          {mode !== 'pro' && (
            <div className="mb-4">
              <label className="text-xs font-medium text-yellow-200 mb-2 flex items-center space-x-2">
                <Settings className="h-3 w-3" />
                <span>Format Detection</span>
              </label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger className="w-full bg-gray-800/50 border-yellow-400/30 text-yellow-100 focus:border-yellow-300 focus:ring-yellow-300/20 hover:bg-gray-800/70 transition-colors">
                  <SelectValue placeholder="Choose format detection method" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-yellow-400/30 text-yellow-100 max-h-60">
                  <SelectItem value="Auto-Detect" className="focus:bg-yellow-400/20 focus:text-yellow-100">
                    🤖 Auto-Detect (Recommended)
                  </SelectItem>
                  {Object.entries(encodingCategories).map(([category, formats]) => (
                    formats.map((format) => (
                      <SelectItem 
                        key={format} 
                        value={format}
                        className="focus:bg-yellow-400/20 focus:text-yellow-100"
                      >
                        {format}
                      </SelectItem>
                    ))
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFormat === "Auto-Detect" 
                  ? "Automatically detects the most likely encoding format" 
                  : `Manually decode as ${selectedFormat}`
                }
              </p>
            </div>
          )}
          
          <Textarea
            id="input-text"
            data-testid="input-textarea"
            placeholder="🚀 Paste any encoded text here - supports 25+ formats including Base64, Hex, Binary, JWT tokens, hashes, and classical ciphers. Now supports up to 1GB of data with lightning-fast processing!"
            className={`w-full font-mono resize-none bg-gray-800/50 border-yellow-400/30 text-yellow-100 placeholder:text-gray-400 focus:border-yellow-300 focus:ring-yellow-300/20 rounded-lg input-240hz gpu-accelerated text-crisp ultra-smooth-scroll ${isMobile ? 'text-base min-h-40 p-6' : isTablet ? 'text-base min-h-36 p-5' : 'text-sm min-h-48 p-6'} ${isVeryLargeInput ? 'border-orange-400/50' : ''}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {isLargeInput && (
            <div className="mt-2 space-y-2">
              {isNearBrowserLimit && (
                <div className="text-xs text-red-300 flex items-center space-x-1 p-2 bg-red-900/20 border border-red-400/30 rounded">
                  <span>🚨</span>
                  <span><strong>Warning:</strong> Approaching browser memory limit (1GB). Consider breaking into smaller chunks for better performance.</span>
                </div>
              )}
              {isExtremelyLarge && !isNearBrowserLimit && (
                <div className="text-xs text-orange-200 flex items-center space-x-1 p-2 bg-orange-900/20 border border-orange-400/30 rounded">
                  <span>⚠️</span>
                  <span><strong>Large Input (100MB+):</strong> Processing may take longer. Browser optimizations and chunking will be applied automatically.</span>
                </div>
              )}
              {isVeryLargeInput && !isExtremelyLarge && (
                <div className="text-xs text-amber-200 flex items-center space-x-1">
                  <span>⚡</span>
                  <span>Large input detected - enhanced chunking and performance optimizations will be applied</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={`flex gap-3 ${isMobile ? 'flex-col mt-8' : 'flex-col sm:flex-row mt-8'}`}>
          <Button
            data-testid="button-analyze"
            onClick={handleAnalyze}
            disabled={!inputText.trim() || isLoading}
            className={`flex-1 flex items-center justify-center space-x-2 bg-yellow-400 text-black hover:bg-yellow-500 hover:shadow-xl hover:shadow-yellow-400/50 hover:scale-105 disabled:bg-gray-600 disabled:text-gray-400 transition-all duration-300 ease-out transform-gpu hover:translate-y-[-2px] active:scale-95 active:translate-y-0 ${getResponsiveClass(RESPONSIVE_BUTTONS, 'medium', deviceType)}`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>
              {isLoading 
                ? (progress > 0 ? <span className="bg-gradient-to-r from-yellow-400 to-black bg-clip-text text-transparent font-semibold animate-pulse">Analyzing {progress}%</span> : <span className="bg-gradient-to-r from-black to-yellow-400 bg-clip-text text-transparent animate-shimmer">Analyzing...</span>) 
                : (isLargeInput ? <span className="font-semibold">Analyze <span className="text-yellow-300">(Enhanced)</span></span> : 'Analyze')
              }
            </span>
          </Button>
          
          <Button
            data-testid="button-quick-example"
            variant="outline"
            onClick={handleQuickExample}
            disabled={isLoading}
            className={`flex items-center justify-center space-x-2 border-purple-300/40 text-purple-200 hover:bg-purple-400/20 hover:border-purple-300 hover:scale-105 hover:shadow-md hover:shadow-purple-300/30 transition-all duration-300 ease-out transform-gpu hover:translate-y-[-1px] active:scale-95 active:translate-y-0 ${getResponsiveClass(RESPONSIVE_BUTTONS, isMobile ? 'medium' : 'small', deviceType)}`}
          >
            <Sparkles className="h-4 w-4" />
            <span className={isMobile ? 'inline' : 'hidden sm:inline'}>Quick Example</span>
          </Button>
          
          <Button
            data-testid="button-clear"
            variant="outline"
            onClick={handleClear}
            disabled={isLoading}
            className={`flex items-center justify-center space-x-2 border-yellow-300/40 text-yellow-200 hover:bg-yellow-400/20 hover:border-yellow-300 hover:scale-105 hover:shadow-md hover:shadow-yellow-300/30 transition-all duration-300 ease-out transform-gpu hover:translate-y-[-1px] active:scale-95 active:translate-y-0 ${getResponsiveClass(RESPONSIVE_BUTTONS, isMobile ? 'medium' : 'small', deviceType)}`}
          >
            <RotateCcw className="h-4 w-4" />
            <span className={isMobile ? 'inline' : 'hidden sm:inline'}>Clear</span>
          </Button>
        </div>
        
        {isLoading && (
          <div className="mt-4 space-y-3">
            {progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="bg-gradient-to-r from-yellow-400 via-black to-yellow-400 bg-clip-text text-transparent animate-shimmer">{progressStatus || 'Processing...'}</span>
                  </span>
                  <span className="text-yellow-200 font-mono font-bold animate-pulse bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">{progress}%</span>
                </div>
                <Progress 
                  value={progress} 
                  className="w-full h-2 bg-gray-800"
                />
              </div>
            )}
            {progress === 0 && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm bg-gradient-to-r from-gray-400 via-yellow-400 to-gray-400 bg-clip-text text-transparent animate-shimmer">Initializing enhanced analysis engine...</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
