import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, RefreshCw, Grid3X3, Zap, Plus, Trash2, Settings, BarChart3, Clock, Database, HelpCircle } from 'lucide-react';
import { encodeText, getAllEncodingTypes } from '@/lib/encoder';
import { copyToClipboard } from '@/lib/decoder';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/lib/responsive';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EncodingComparisonProps {
  isVisible: boolean;
}

export function EncodingComparison({ isVisible }: EncodingComparisonProps) {
  const [inputText, setInputText] = useState('');
  const [selectedEncodings, setSelectedEncodings] = useState<string[]>([
    'Base64', 'Hexadecimal', 'URL Encoding', 'Binary', 'Base32', 'ROT13'
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [enableParallelProcessing, setEnableParallelProcessing] = useState(true);
  const [enableRealTimeAnalysis, setEnableRealTimeAnalysis] = useState(true);
  const [maxEncodings] = useState(50); // Support up to 50 encodings simultaneously
  const { toast } = useToast();
  const { isMobile, isTablet } = useResponsive();

  const encodingCategories = getAllEncodingTypes();
  // Expanded popular encodings to support up to 50 encodings
  const popularEncodings = [
    'Base64', 'Hexadecimal', 'URL Encoding', 'Binary', 'Base32', 'ROT13',
    'HTML Entities', 'ASCII Codes', 'Morse Code', 'Base58 (Bitcoin)',
    'Base91', 'Base64 URL-Safe', 'Octal', 'UUEncode', 'yEnc', 'Quoted-Printable',
    'Data URL', 'PEM Format', 'JSON', 'XML', 'YAML', 'CSV', 'UTF-16',
    'JSON String', 'Unicode Escapes (\\u)', 'Unicode Escapes (\\x)', 'UTF-8 Bytes',
    'Caesar Cipher (+3)', 'Atbash Cipher', 'A1Z26 (A=1, B=2...)', 'Phone Keypad (T9)',
    'Quoted-Printable MIME', 'UUEncoding', 'Yenc Encoding', 'Hexadecimal (Spaced)',
    'Hexadecimal (Colon-separated)'
  ];

  // Define getEncodingCategory before it's used in useMemo
  const getEncodingCategory = (encoding: string): string => {
    if (!encodingCategories || Object.keys(encodingCategories).length === 0) {
      return 'Unknown';
    }
    for (const [category, encodings] of Object.entries(encodingCategories)) {
      if (encodings.includes(encoding)) return category;
    }
    return 'Unknown';
  };

  const comparisonResults = useMemo(() => {
    if (!inputText.trim()) return [];
    
    const results = selectedEncodings.map((encodingType, index) => {
      try {
        const result = encodeText(inputText, encodingType, { 
          maxSize: 1024 * 1024 * 1024, // 1GB support
          enableParallelProcessing: enableParallelProcessing && inputText.length > 10000,
          enableAdvancedOptimization: true
        });
        return {
          type: encodingType,
          result: result.result,
          efficiency: result.efficiency,
          size: result.encodedSize,
          originalSize: result.originalSize,
          warnings: result.warnings,
          processingTime: 0, // Default value since not available in EncodingResult
          compressionRatio: result.encodedSize / result.originalSize,
          category: getEncodingCategory(encodingType)
        };
      } catch (error) {
        console.error(`Encoding comparison failed for ${encodingType}:`, error);
        return {
          type: encodingType,
          result: 'Encoding failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          efficiency: 0,
          size: 0,
          originalSize: inputText.length,
          warnings: [`${encodingType} encoding error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          processingTime: 0,
          compressionRatio: 0,
          category: 'Error'
        };
      }
    });
    
    // Sort results by efficiency (most efficient first)
    return results.sort((a, b) => a.efficiency - b.efficiency);
  }, [inputText, selectedEncodings, enableParallelProcessing]);

  // Handle processing state with real-time feedback
  React.useEffect(() => {
    if (inputText.trim() && selectedEncodings.length > 0 && enableRealTimeAnalysis) {
      setIsProcessing(true);
      setProcessingProgress(0);
      
      // Optimized progress calculation - much faster for real-time processing
      const baseDelay = Math.min(inputText.length / 10000, 50); // Faster base calculation
      const encodingDelay = selectedEncodings.length * 2; // Reduced per-encoding delay
      const totalDelay = Math.max(100, baseDelay + encodingDelay); // Faster minimum delay
      
      const progressIncrement = 90 / (totalDelay / 50);
      const progressTimer = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + progressIncrement, 90));
      }, 50);
      
      const completeTimer = setTimeout(() => {
        clearInterval(progressTimer);
        setProcessingProgress(100);
        setTimeout(() => setIsProcessing(false), 100);
      }, totalDelay);
      
      return () => {
        clearInterval(progressTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [inputText, selectedEncodings, enableRealTimeAnalysis]);

  const handleCopy = async (text: string, type: string) => {
    try {
      await copyToClipboard(text);
      toast({
        title: "Copied!",
        description: `${type} encoding copied to clipboard`,
        variant: "default",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const addEncoding = (encoding: string) => {
    if (!selectedEncodings.includes(encoding) && selectedEncodings.length < maxEncodings) {
      setSelectedEncodings([...selectedEncodings, encoding]);
    }
  };

  const addAllPopularEncodings = () => {
    const newEncodings = popularEncodings.filter(enc => !selectedEncodings.includes(enc));
    const availableSlots = maxEncodings - selectedEncodings.length;
    const toAdd = newEncodings.slice(0, availableSlots);
    setSelectedEncodings([...selectedEncodings, ...toAdd]);
  };

  const addAllFromCategory = (category: string) => {
    const categoryEncodings = encodingCategories[category] || [];
    const newEncodings = categoryEncodings.filter(enc => !selectedEncodings.includes(enc));
    const availableSlots = maxEncodings - selectedEncodings.length;
    const toAdd = newEncodings.slice(0, availableSlots);
    setSelectedEncodings([...selectedEncodings, ...toAdd]);
  };


  const clearAllEncodings = () => {
    setSelectedEncodings([]);
  };

  const resetToDefaults = () => {
    setSelectedEncodings(['Base64', 'Hexadecimal', 'URL Encoding', 'Binary', 'Base32', 'ROT13']);
  };

  const removeEncoding = (encoding: string) => {
    setSelectedEncodings(selectedEncodings.filter(e => e !== encoding));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="shadow-lg border-2 border-purple-300/30 bg-card/80 backdrop-blur-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Grid3X3 className="h-5 w-5 text-purple-300" />
          <span className="text-purple-200">Encoding Comparison</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-purple-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Compare how your text looks in multiple encoding formats simultaneously. Perfect for finding the right encoding or comparing efficiency across different formats.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how your text looks in multiple encodings side-by-side
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-purple-200">Input Text</label>
          <Textarea
            placeholder="Enter text to compare across different encodings..."
            className={`font-mono bg-gray-800/50 border-purple-300/40 text-purple-100 placeholder:text-gray-400 focus:border-purple-300 focus:ring-purple-300/20 ${isMobile ? 'h-20' : 'h-16'}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            data-testid="comparison-input"
          />
        </div>

        {/* Encoding Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-purple-200">
              Selected Encodings ({selectedEncodings.length}/{maxEncodings})
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={resetToDefaults}
              className="text-xs"
              data-testid="reset-encodings"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset to Default
            </Button>
          </div>
          
          {/* Current selections */}
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedEncodings.map(encoding => (
              <Badge
                key={encoding}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/20"
                onClick={() => removeEncoding(encoding)}
              >
                {encoding} ✕
              </Badge>
            ))}
          </div>
          
          {/* Available encodings with categories */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">Popular Encodings:</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={addAllPopularEncodings}
                  className="text-xs h-6 px-2"
                  data-testid="add-all-popular"
                >
                  Add All Popular
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {popularEncodings.slice(0, 15).map(encoding => (
                  <Badge
                    key={encoding}
                    variant={selectedEncodings.includes(encoding) ? "default" : "outline"}
                    className={`text-xs cursor-pointer transition-all ${
                      selectedEncodings.includes(encoding) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-purple-400/20'
                    }`}
                    onClick={() => !selectedEncodings.includes(encoding) && selectedEncodings.length < maxEncodings && addEncoding(encoding)}
                  >
                    {encoding}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Encoding Categories */}
            {Object.entries(encodingCategories).map(([category, encodings]) => (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">{category}:</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addAllFromCategory(category)}
                    className="text-xs h-5 px-1"
                    data-testid={`add-all-${category}`}
                  >
                    Add All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {encodings.slice(0, 8).map(encoding => (
                    <Badge
                      key={encoding}
                      variant={selectedEncodings.includes(encoding) ? "default" : "outline"}
                      className={`text-xs cursor-pointer transition-all ${
                        selectedEncodings.includes(encoding) 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-purple-400/20'
                      }`}
                      onClick={() => !selectedEncodings.includes(encoding) && selectedEncodings.length < maxEncodings && addEncoding(encoding)}
                    >
                      {encoding}
                    </Badge>
                  ))}
                  {encodings.length > 8 && (
                    <Badge variant="outline" className="text-xs opacity-50">
                      +{encodings.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            
            {selectedEncodings.length >= maxEncodings && (
              <div className="text-xs text-amber-600 bg-amber-600/10 p-2 rounded flex items-center">
                <span className="mr-1">⚠</span>
                Maximum {maxEncodings} encodings reached. Remove some to add others.
              </div>
            )}
          </div>
        </div>

        {/* Comparison Results */}
        {inputText.trim() && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-purple-400 flex items-center space-x-2">
                <Grid3X3 className="h-4 w-4" />
                <span>Comparison Results</span>
                <Badge variant="outline" className="text-xs">
                  {comparisonResults.length} formats
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Input: {inputText.length} chars | {(new TextEncoder().encode(inputText).length)} bytes
              </div>
            </div>
            
            {/* Processing indicator */}
            {isProcessing && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                  <div className="flex-1">
                    <div className="text-sm text-purple-400">Processing {selectedEncodings.length} encodings...</div>
                    <div className="text-xs text-muted-foreground">{processingProgress.toFixed(0)}% complete</div>
                  </div>
                  <div className="text-xs text-purple-400 font-mono">{processingProgress.toFixed(0)}%</div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-purple-400 h-1.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            <ScrollArea className={isMobile ? "h-96" : "h-80"}>
              <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
                {comparisonResults.map((result, index) => (
                  <Card
                    key={result.type}
                    className="border border-border hover:border-purple-400/40 transition-all duration-200"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{result.type}</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(result.result, result.type)}
                          className="h-6 w-6 p-0"
                          data-testid={`copy-comparison-${index}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <Badge 
                          variant="outline" 
                          className={`${
                            result.efficiency > 300 ? 'text-red-600 border-red-600' :
                            result.efficiency > 150 ? 'text-yellow-600 border-yellow-600' :
                            result.efficiency === 100 ? 'text-blue-600 border-blue-600' :
                            'text-green-600 border-green-600'
                          }`}
                        >
                          {result.efficiency === 100 ? 'Same size' : 
                           result.efficiency < 100 ? `${(100 - result.efficiency).toFixed(0)}% smaller` :
                           `+${(result.efficiency - 100).toFixed(0)}% larger`}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {result.category}
                        </Badge>
                        <span className="text-muted-foreground">
                          {result.size} chars
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="bg-muted/50 p-2 rounded font-mono text-xs break-all max-h-24 overflow-y-auto">
                        {result.result}
                      </div>
                      {result.warnings && result.warnings.length > 0 && (
                        <div className="mt-1 text-xs text-amber-600 flex items-center">
                          <span className="mr-1">⚠</span>
                          {result.warnings[0]}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {!inputText.trim() && (
          <div className="text-center py-8 text-muted-foreground">
            <Grid3X3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Enter text above to see encoding comparisons</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}