import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { withPerformanceOptimization } from '@/lib/performance';
import { 
  Lock, 
  Copy, 
  RotateCcw, 
  Loader2, 
  Info, 
  Zap, 
  Database, 
  AlertTriangle,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { encodeText, getAllEncodingTypes, getEncodingInfo, EncodingResult } from '@/lib/encoder';
import { copyToClipboard } from '@/lib/decoder';
import { useToast } from '@/hooks/use-toast';

export function TextEncoder() {
  const [inputText, setInputText] = useState('');
  const [selectedEncoding, setSelectedEncoding] = useState('Base64');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [result, setResult] = useState<EncodingResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Base Encodings');
  
  // Enhanced encoder-specific examples with comprehensive validation and variety
  const encoderExamples = [
    {
      name: "Simple Text Message",
      data: "Hello World! This is a sample message to be encoded.",
      description: "Basic plain text suitable for all encoding types",
      difficulty: "Beginner",
      category: "Text Data",
      tips: "Good for testing Base64, Hex, URL encoding, and simple ciphers",
      encodingSuggestions: ["Base64", "Hexadecimal", "URL Encoding", "ROT13"]
    },
    {
      name: "Structured JSON Data",
      data: '{"user": "john_doe", "role": "admin", "timestamp": "2024-01-01T12:00:00Z", "permissions": ["read", "write", "delete"]}',
      description: "Well-formed JSON with various data types",
      difficulty: "Beginner",
      category: "Structured Data",
      tips: "Contains quotes and special chars - good for testing escape sequences",
      encodingSuggestions: ["JSON Escape", "URL Encoding", "Base64", "Unicode Escape"]
    },
    {
      name: "Special Characters Collection",
      data: "Symbols: !@#$%^&*()_+-=[]{}|;':\",./<>?`~ Math: ±×÷≠≤≥∞ Currency: $€£¥₹",
      description: "Comprehensive special character set",
      difficulty: "Intermediate", 
      category: "Special Characters",
      tips: "Tests encoding of ASCII symbols, math symbols, and currency",
      encodingSuggestions: ["URL Encoding", "HTML Entities", "Unicode Escape", "Base64"]
    },
    {
      name: "Multilingual Unicode Text",
      data: "🌍 Languages: English→Hello, Español→Hola, 中文→你好, العربية→مرحبا, Русский→Привет, 日本語→こんにちは, Français→Bonjour",
      description: "International text with emojis and various scripts",
      difficulty: "Advanced",
      category: "Unicode Data",
      tips: "Contains emojis, RTL text, and CJK characters - tests Unicode handling",
      encodingSuggestions: ["Unicode Escape", "Base64", "UTF-8 Hex", "Percent Encoding"]
    },
    {
      name: "Sensitive Data Format",
      data: "API_KEY=sk-1234567890abcdef1234567890abcdef12345678\nPASSWORD=MySecureP@ssw0rd!\nTOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      description: "Simulated configuration with secrets",
      difficulty: "Intermediate",
      category: "Sensitive Data",
      tips: "Multi-line format with credentials - good for obfuscation testing",
      encodingSuggestions: ["Base64", "Hexadecimal", "ROT13", "Caesar Cipher"]
    },
    {
      name: "Email with Headers",
      data: "From: sender@example.com\nTo: recipient@company.org\nSubject: 🚨 Urgent: Meeting Tomorrow\n\nHi team,\n\nWe have a meeting at 2 PM. Please confirm attendance.\n\nBest regards,\nProject Manager",
      description: "RFC-style email format with headers and body",
      difficulty: "Intermediate",
      category: "Formatted Text",
      tips: "Contains email headers, newlines, and mixed content",
      encodingSuggestions: ["Base64", "URL Encoding", "Quoted-Printable", "HTML Entities"]
    },
    {
      name: "Binary Data Representation",
      data: "Binary file content: \x00\x01\x02\x03\xFF\xFE\xFD\xFC Hello World!",
      description: "Mixed binary and text content",
      difficulty: "Advanced",
      category: "Binary Data",
      tips: "Contains null bytes and high-bit characters",
      encodingSuggestions: ["Base64", "Hexadecimal", "Base85", "UUEncoding"]
    },
    {
      name: "HTML Code Sample",
      data: '<!DOCTYPE html>\n<html>\n<head><title>Test</title></head>\n<body>\n<p>Hello "World" & welcome to <script>alert("XSS");</script></p>\n</body>\n</html>',
      description: "HTML document with potential XSS content",
      difficulty: "Intermediate",
      category: "Code/Markup",
      tips: "Contains HTML tags, quotes, and script elements",
      encodingSuggestions: ["HTML Entities", "URL Encoding", "Base64", "JavaScript Escape"]
    },
    {
      name: "SQL Query with Injection",
      data: "SELECT * FROM users WHERE username='admin' OR '1'='1'; DROP TABLE users; --",
      description: "SQL with potential injection patterns",
      difficulty: "Advanced",
      category: "Database Code",
      tips: "Contains SQL syntax and dangerous patterns",
      encodingSuggestions: ["SQL Escape", "Base64", "URL Encoding", "Hexadecimal"]
    },
    {
      name: "Command Line Arguments",
      data: 'curl -X POST "https://api.example.com/data" -H "Authorization: Bearer token123" -d \'{"action": "delete", "target": "*"}\' --user-agent "Mozilla/5.0"',
      description: "Shell command with arguments and embedded JSON",
      difficulty: "Advanced",
      category: "Command Line",
      tips: "Contains quotes, JSON, URLs, and shell syntax",
      encodingSuggestions: ["Shell Escape", "URL Encoding", "Base64", "JSON Escape"]
    },
    {
      name: "Regular Expression Pattern",
      data: "^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$",
      description: "Complex email validation regex pattern",
      difficulty: "Expert",
      category: "Regular Expression",
      tips: "Contains special regex characters and escape sequences",
      encodingSuggestions: ["JavaScript Escape", "URL Encoding", "Base64", "Regex Escape"]
    },
    {
      name: "Configuration File",
      data: "[database]\nhost = localhost:5432\nuser = admin\npassword = P@ssw0rd123!\nssl_mode = require\n\n[api]\nbase_url = https://api.example.com/v1\napi_key = ${API_KEY}\ntimeout = 30\ndebug = true",
      description: "INI-style configuration with sensitive data",
      difficulty: "Intermediate",
      category: "Configuration",
      tips: "Contains credentials, URLs, and configuration syntax",
      encodingSuggestions: ["Base64", "ROT13", "Caesar Cipher", "URL Encoding"]
    }
  ];
  
  // Enhanced category change handler to fix encoding selection bug
  const handleCategoryChange = (newCategory: string) => {
    setSelectedCategory(newCategory);
    // Auto-select first encoding from new category to prevent invalid selections
    const categoryEncodings = encodingCategories[newCategory];
    if (categoryEncodings && categoryEncodings.length > 0) {
      setSelectedEncoding(categoryEncodings[0]);
    }
  };
  const { toast } = useToast();

  const handleQuickExample = () => {
    const randomExample = encoderExamples[Math.floor(Math.random() * encoderExamples.length)];
    setInputText(randomExample.data);
  };

  const encodingCategories = getAllEncodingTypes();
  const categoryColors: { [key: string]: string } = {
    'Base Encodings': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Web Encodings': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Unicode Encodings': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Classical Ciphers': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'Numeric Encodings': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'Advanced Encodings': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
  };

  const inputSizeKB = Math.floor(inputText.length / 1024);
  const inputSizeMB = Math.floor(inputText.length / (1024 * 1024));
  const isLargeInput = inputText.length > 1024 * 1024; // 1MB
  const isVeryLargeInput = inputText.length > 10 * 1024 * 1024; // 10MB
  const isGigabyteInput = inputText.length > 100 * 1024 * 1024; // 100MB+

  const handleEncode = async () => {
    if (!inputText.trim() || !selectedEncoding) return;

    setIsLoading(true);
    setProgress(0);
    setProgressStatus('Starting encoding...');

    try {
      const encodingResult = encodeText(inputText, selectedEncoding, {
        maxSize: 1024 * 1024 * 1024, // 1GB limit (1000% increase)
        enableParallelProcessing: inputText.length > 1024 * 1024, // Use parallel processing for large inputs
        progressCallback: (progressPercent: number, status: string) => {
          setProgress(progressPercent);
          setProgressStatus(status);
        }
      });

      setResult(encodingResult);

      if (inputText.length > 10000) {
        toast({
          title: "Large Input Encoded",
          description: `Successfully encoded ${inputSizeKB}KB with ${selectedEncoding}. Efficiency: ${encodingResult.efficiency}%`,
          variant: "default",
        });
      }

    } catch (error) {
      setProgress(0);
      setProgressStatus('');
      toast({
        title: "Encoding Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setProgress(0);
        setProgressStatus('');
      }, 2000);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    
    try {
      await copyToClipboard(result.result);
      toast({
        title: "Copied!",
        description: "Encoded text copied to clipboard",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
    setProgress(0);
    setProgressStatus('');
  };

  const encodingInfo = getEncodingInfo(selectedEncoding);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <h2 className="text-3xl font-bold text-primary mb-2 flex items-center justify-center space-x-2">
          <Lock className="h-8 w-8 text-yellow-400" />
          <span className="bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
            Text Encoder
          </span>
        </h2>
        <p className="text-muted-foreground">
          Convert your text into 25+ different encoding formats with real-time efficiency tracking
        </p>
      </div>

      {/* Input Section */}
      <Card className="shadow-lg border-2 border-yellow-400/20 animate-fade-in-240hz glow-yellow card-240hz gpu-accelerated">
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="encoder-input" className="text-sm font-medium text-yellow-200">
                ✏️ Enter text to encode
              </label>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {inputText.length > 0 && (
                  <>
                    <Database className="h-3 w-3" />
                    <span className={isGigabyteInput ? 'text-red-400' : isVeryLargeInput ? 'text-orange-400' : isLargeInput ? 'text-yellow-400' : 'text-green-400'}>
                      {inputSizeMB > 0 ? `${inputSizeMB}MB` : inputSizeKB > 0 ? `${inputSizeKB}KB` : `${inputText.length} chars`}
                    </span>
                    {isGigabyteInput && <span className="text-red-400 font-semibold">🚀 MASSIVE INPUT</span>}
                    {isVeryLargeInput && !isGigabyteInput && <span className="text-orange-400 font-semibold">⚡ Very large input</span>}
                  </>
                )}
              </div>
            </div>
            
            <Textarea
              id="encoder-input"
              placeholder="🚀 Enter any text here to encode... Now supports up to 1GB with lightning-fast parallel processing!"
              className={`w-full h-32 font-mono text-sm resize-none bg-gray-800/50 border-yellow-400/30 text-yellow-200 placeholder:text-gray-500 focus:border-yellow-400 focus:ring-yellow-400/20 transition-all duration-300 ${isVeryLargeInput ? 'border-orange-400/50' : ''}`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            
            {isLargeInput && (
              <div className="mt-2 text-xs text-amber-400 flex items-center space-x-1">
                <span>⚡</span>
                <span>
                  {isGigabyteInput ? 
                    'MASSIVE input detected - using advanced parallel processing for optimal performance' :
                    isVeryLargeInput ?
                    'Very large input detected - using enhanced chunked processing for speed' :
                    'Large input detected - using optimized processing algorithms'
                  }
                </span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Encoding Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-yellow-200">Encoding Type</label>
              <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
                <TabsList className="grid w-full grid-cols-3 h-auto text-xs">
                  <TabsTrigger value="Base Encodings" className="p-2">Base</TabsTrigger>
                  <TabsTrigger value="Web Encodings" className="p-2">Web</TabsTrigger>
                  <TabsTrigger value="Unicode Encodings" className="p-2">Unicode</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-3 h-auto text-xs mt-1">
                  <TabsTrigger value="Classical Ciphers" className="p-2">Ciphers</TabsTrigger>
                  <TabsTrigger value="Numeric Encodings" className="p-2">Numeric</TabsTrigger>
                  <TabsTrigger value="Advanced Encodings" className="p-2">Advanced</TabsTrigger>
                </TabsList>
                
                {Object.entries(encodingCategories).map(([category, types]) => (
                  <TabsContent key={category} value={category}>
                    <Select value={selectedEncoding} onValueChange={setSelectedEncoding}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map(type => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={`text-xs ${categoryColors[category]}`}>
                                {category.split(' ')[0]}
                              </Badge>
                              <span>{type}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Encoding Info */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-yellow-200">Encoding Info</label>
              {encodingInfo && (
                <div className="p-3 bg-gray-800/50 rounded-lg border border-yellow-300/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">
                      {encodingInfo.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {encodingInfo.description}
                  </p>
                  <div className="flex items-center space-x-2 text-xs">
                    <TrendingUp className="h-3 w-3 text-green-400" />
                    <span className="text-green-400">
                      Max size increase: {encodingInfo.maxEfficiency - 100}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={handleEncode}
              disabled={!inputText.trim() || !selectedEncoding || isLoading}
              className="flex-1 flex items-center justify-center space-x-2 bg-yellow-400 text-black hover:bg-yellow-500 disabled:bg-gray-600 disabled:text-gray-400 transition-all duration-300 glow-yellow font-semibold"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              <span>
                {isLoading 
                  ? (progress > 0 ? `Encoding ${progress}%` : 'Encoding...') 
                  : `Encode with ${selectedEncoding.split(' ')[0]}`
                }
              </span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleQuickExample}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 border-purple-300/40 text-purple-200 hover:bg-purple-400/20 transition-all duration-300"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Example</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 border-yellow-300/40 text-yellow-200 hover:bg-yellow-400/10 transition-all duration-300"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>

          {/* Progress Bar */}
          {isLoading && (
            <div className="mt-4 space-y-3">
              {progress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{progressStatus || 'Processing...'}</span>
                    </span>
                    <span className="text-yellow-200 font-mono">{progress}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="w-full h-2 bg-gray-800"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <Card className="shadow-lg border-2 border-green-400/20 animate-fade-in-up glow-green">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-green-400" />
                <span className="text-green-400">Encoding Result</span>
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {result.type}
                </Badge>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="flex items-center space-x-1 border-green-400/30 text-green-400 hover:bg-green-400/10"
              >
                <Copy className="h-3 w-3" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Original</div>
                <div className="text-lg font-mono text-blue-400">{result.originalSize}</div>
                <div className="text-xs text-muted-foreground">chars</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Encoded</div>
                <div className="text-lg font-mono text-green-400">{result.encodedSize}</div>
                <div className="text-xs text-muted-foreground">chars</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Efficiency</div>
                <div className={`text-lg font-mono ${result.efficiency > 150 ? 'text-red-300' : result.efficiency > 110 ? 'text-yellow-200' : 'text-green-300'}`}>
                  {result.efficiency}%
                </div>
                <div className="text-xs text-muted-foreground">size ratio</div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <Alert className="mb-4 border-orange-400/20 bg-orange-400/10">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <AlertDescription className="text-orange-200">
                  <ul className="list-disc list-inside space-y-1">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Result Output */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-green-400">Encoded Output</label>
              <ScrollArea className="h-32">
                <Textarea
                  readOnly
                  value={result.result}
                  className="w-full font-mono text-sm bg-gray-900/50 border-green-400/30 text-green-200 cursor-text"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}