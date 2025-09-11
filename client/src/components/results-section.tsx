import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ChevronDown, ChevronUp, Info, BarChart3, Languages, AlertTriangle } from 'lucide-react';
import { AnalysisResult, ConfidenceLevel } from '@/types/analysis';
import { getConfidenceLevel } from '@/lib/scoring';
import { copyToClipboard } from '@/lib/decoder';
import { useToast } from '@/hooks/use-toast';

interface ResultsSectionProps {
  results: AnalysisResult;
}

export function ResultsSection({ results }: ResultsSectionProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleCopy = async (text: string, id: string) => {
    try {
      await copyToClipboard(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      toast({
        title: "Copied to clipboard",
        description: "The decoded text has been copied to your clipboard.",
      });
      
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const getConfidenceBadgeVariant = (level: ConfidenceLevel) => {
    switch (level) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
    }
  };

  const getConfidenceBadgeClass = (level: ConfidenceLevel) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
      case 'medium': return 'bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
    }
  };

  const bestMatch = results.bestMatch;
  const confidenceLevel = getConfidenceLevel(bestMatch.confidence);

  return (
    <div className="space-y-6 animate-slide-in" data-testid="results-section">
      {/* Primary Result */}
      <Card className="shadow-lg border-2 border-yellow-300/40 glow-yellow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-yellow-200">🎯 Best Match</h3>
              <Badge 
                className={`${getConfidenceBadgeClass(confidenceLevel)} animate-pulse-slow`}
                data-testid="confidence-badge"
              >
                {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)} Confidence ({Math.round(bestMatch.confidence)}%)
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(bestMatch.result, 'primary')}
              data-testid="button-copy-primary"
            >
              {copiedStates.primary ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Decode Chain */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Decode Chain:</h4>
            <div className="flex flex-wrap items-center text-sm gap-2">
              {bestMatch.steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <Badge variant="secondary" className="px-2 py-1">
                    {step}
                  </Badge>
                  {index < bestMatch.steps.length - 1 && (
                    <span className="mx-2 text-muted-foreground">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Result */}
          <div className="bg-gray-800/50 border border-yellow-400/20 rounded-md p-4 mb-4 transition-all duration-300 hover:border-yellow-400/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-400">📤 Decoded Result:</span>
              {bestMatch.isValid && (
                <span className="text-xs text-green-400 flex items-center animate-pulse-slow">
                  <Check className="h-3 w-3 mr-1" />
                  Valid UTF-8
                </span>
              )}
            </div>
            <div 
              className="font-mono text-sm text-yellow-200 break-all animate-shimmer"
              data-testid="decoded-result"
            >
              {bestMatch.result}
            </div>
          </div>
          
          {/* Warnings */}
          {bestMatch.warnings && bestMatch.warnings.length > 0 && (
            <div className="mb-4">
              {bestMatch.warnings.map((warning, index) => (
                <div key={index} className="flex items-center text-sm text-amber-600 mb-1">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {warning}
                </div>
              ))}
            </div>
          )}
          
          {/* Analysis Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{bestMatch.type}</span>
            </div>
            {bestMatch.entropy !== undefined && (
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Entropy:</span>
                <span className="font-medium">{bestMatch.entropy.toFixed(1)} bits</span>
              </div>
            )}
            {bestMatch.languageScore !== undefined && (
              <div className="flex items-center space-x-2">
                <Languages className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Language:</span>
                <span className="font-medium">English ({Math.round(bestMatch.languageScore)}%)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alternative Results */}
      {results.alternatives.length > 0 && (
        <Card className="shadow-lg border border-yellow-400/20 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <CardContent className="p-6">
            <Button
              variant="ghost"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="flex items-center justify-between w-full text-left p-0 h-auto"
              data-testid="button-toggle-alternatives"
            >
              <h3 className="text-lg font-semibold text-foreground">Alternative Interpretations</h3>
              {showAlternatives ? (
                <ChevronUp className="h-5 w-5 transition-transform duration-200" />
              ) : (
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              )}
            </Button>
            
            {showAlternatives && (
              <div className="mt-4 space-y-4" data-testid="alternatives-content">
                {results.alternatives.map((alternative, index) => {
                  const altConfidenceLevel = getConfidenceLevel(alternative.confidence);
                  return (
                    <div key={index} className="border border-border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{alternative.type}</span>
                          <Badge 
                            className={getConfidenceBadgeClass(altConfidenceLevel)}
                            data-testid={`alternative-confidence-${index}`}
                          >
                            {altConfidenceLevel.charAt(0).toUpperCase() + altConfidenceLevel.slice(1)} ({Math.round(alternative.confidence)}%)
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(alternative.result, `alt-${index}`)}
                          data-testid={`button-copy-alternative-${index}`}
                        >
                          {copiedStates[`alt-${index}`] ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="bg-muted rounded p-2 font-mono text-sm text-muted-foreground mb-2">
                        {alternative.result}
                      </div>
                      {alternative.warnings && alternative.warnings.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <AlertTriangle className="inline h-3 w-3 mr-1" />
                          {alternative.warnings[0]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
