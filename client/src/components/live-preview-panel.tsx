import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, Eye, Zap } from 'lucide-react';
import { analyzeText } from '@/lib/decoder';
import { copyToClipboard } from '@/lib/decoder';
import { useToast } from '@/hooks/use-toast';
import { AnalysisResult, DecodingResult } from '@/types/analysis';
import { useDebounce } from '../hooks/use-debounce';

interface LivePreviewPanelProps {
  inputText: string;
  isVisible: boolean;
}

export function LivePreviewPanel({ inputText, isVisible }: LivePreviewPanelProps) {
  const [liveResults, setLiveResults] = useState<DecodingResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  
  // Debounce input to avoid excessive API calls
  const debouncedInput = useDebounce(inputText, 500);

  useEffect(() => {
    if (!debouncedInput.trim() || debouncedInput.length < 4) {
      setLiveResults([]);
      return;
    }

    // Skip very large inputs for live preview
    if (debouncedInput.length > 10000) {
      setLiveResults([{
        type: 'Large Input',
        result: 'Input too large for live preview (>10KB). Use main analyze button.',
        confidence: 0,
        isValid: false,
        steps: ['Live preview disabled'],
        warnings: ['Use main analyzer for large inputs']
      }]);
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Fast analysis for live preview - limited scope
      const result = analyzeText(debouncedInput, {
        maxSize: 10000,
        useCache: true,
        enableChunking: false,
        progressCallback: undefined // No progress for live preview
      });

      // Get top 3 results for live preview
      const topResults = [result.bestMatch, ...result.alternatives.slice(0, 2)]
        .filter(r => r.confidence > 30) // Only show decent confidence results
        .map(r => ({
          ...r,
          result: r.result.length > 200 ? r.result.substring(0, 200) + '...' : r.result
        }));

      setLiveResults(topResults);
    } catch (error) {
      setLiveResults([{
        type: 'Error',
        result: 'Live preview failed - use main analyzer',
        confidence: 0,
        isValid: false,
        steps: ['Error'],
        warnings: ['Analysis error occurred']
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [debouncedInput]);

  const handleCopy = async (text: string, type: string) => {
    try {
      await copyToClipboard(text);
      toast({
        title: "Copied!",
        description: `${type} result copied to clipboard`,
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

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="border border-blue-400/20 bg-card/80 backdrop-blur-sm animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Eye className="h-4 w-4 text-blue-400" />
          <span className="text-blue-400">Live Preview</span>
          {isAnalyzing && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">analyzing...</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {liveResults.length === 0 && !isAnalyzing ? (
          <div className="text-xs text-muted-foreground text-center py-8 px-4">
            {inputText.trim() ? (
              <div className="space-y-2">
                <Eye className="h-6 w-6 mx-auto text-muted-foreground/50" />
                <p>Analyzing input...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Zap className="h-6 w-6 mx-auto text-muted-foreground/50" />
                <p>Start typing to see live decode previews</p>
                <p className="text-xs opacity-75">Results appear instantly as you type</p>
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {liveResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border transition-all duration-200 hover:border-blue-400/40 ${
                    index === 0 
                      ? 'border-blue-400/30 bg-blue-400/5' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={index === 0 ? "default" : "secondary"}
                        className={`text-xs ${
                          result.confidence > 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          result.confidence > 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {result.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(result.confidence)}%
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(result.result, result.type)}
                      className="h-6 w-6 p-0"
                      data-testid={`copy-live-preview-${index}`}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="text-xs font-mono bg-muted/50 p-2 rounded border break-all">
                    {result.result}
                  </div>
                  
                  {result.steps.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {result.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-center text-xs">
                          <span className="bg-muted px-1 rounded text-muted-foreground">
                            {step}
                          </span>
                          {stepIndex < result.steps.length - 1 && (
                            <span className="mx-1 text-muted-foreground">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="mt-1 text-xs text-amber-600 flex items-center">
                      <span className="mr-1">⚠</span>
                      {result.warnings[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}