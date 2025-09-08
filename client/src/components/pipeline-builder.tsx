import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Copy, 
  ArrowRight, 
  Settings2,
  Download,
  Upload,
  HelpCircle
} from 'lucide-react';
import { encodeText, getAllEncodingTypes } from '@/lib/encoder';
import { analyzeText } from '@/lib/decoder';
import { copyToClipboard } from '@/lib/decoder';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PipelineStep {
  id: string;
  type: 'encode' | 'decode';
  algorithm: string;
  name: string;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  author: string;
  created: Date;
}

interface PipelineBuilderProps {
  isVisible: boolean;
}

export function PipelineBuilder({ isVisible }: PipelineBuilderProps) {
  const [currentPipeline, setCurrentPipeline] = useState<Pipeline>({
    id: 'temp',
    name: 'Custom Pipeline',
    description: 'My custom encode/decode pipeline',
    steps: [],
    author: 'User',
    created: new Date()
  });
  
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [savedPipelines, setSavedPipelines] = useState<Pipeline[]>([]);
  const { toast } = useToast();

  // Load saved pipelines from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('swiftx-pipelines');
      if (saved) {
        const pipelines: Pipeline[] = JSON.parse(saved);
        // Validate pipeline structure and convert dates
        const validPipelines = pipelines.map(pipeline => ({
          ...pipeline,
          created: new Date(pipeline.created)
        })).filter(pipeline => 
          pipeline.id && 
          pipeline.name && 
          Array.isArray(pipeline.steps)
        );
        setSavedPipelines(validPipelines);
        
        if (validPipelines.length > 0) {
          toast({
            title: "Pipelines Loaded",
            description: `Found ${validPipelines.length} saved pipeline${validPipelines.length > 1 ? 's' : ''}`,
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error('Error loading saved pipelines:', error);
      // Clear corrupted data
      localStorage.removeItem('swiftx-pipelines');
    }
  }, [toast]);

  const encodingTypes = getAllEncodingTypes();
  const allAlgorithms = Object.values(encodingTypes).flat();
  
  // Popular encoding algorithms for quick access
  const popularEncodeAlgorithms = [
    'Base64', 'Hexadecimal', 'URL Encoding', 'Binary', 'ROT13',
    'Base32', 'HTML Entities', 'ASCII Codes'
  ];
  
  // Common decode algorithms
  const decodeAlgorithms = [
    'Base64', 'Hexadecimal', 'URL Encoding', 'Binary', 'ROT13', 
    'Caesar Cipher', 'Atbash Cipher', 'Morse Code', 'HTML Entities'
  ];

  const addStep = (type: 'encode' | 'decode', algorithm: string) => {
    const newStep: PipelineStep = {
      id: `step-${Date.now()}`,
      type,
      algorithm,
      name: `${type === 'encode' ? 'Encode' : 'Decode'} with ${algorithm}`
    };
    
    setCurrentPipeline(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const removeStep = (stepId: string) => {
    setCurrentPipeline(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    setCurrentPipeline(prev => {
      const steps = [...prev.steps];
      const index = steps.findIndex(step => step.id === stepId);
      
      if (direction === 'up' && index > 0) {
        [steps[index], steps[index - 1]] = [steps[index - 1], steps[index]];
      } else if (direction === 'down' && index < steps.length - 1) {
        [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
      }
      
      return { ...prev, steps };
    });
  };

  const runPipeline = async () => {
    if (!inputText.trim() || currentPipeline.steps.length === 0) {
      toast({
        title: "Invalid Input",
        description: "Please provide input text and at least one pipeline step",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    let currentResult = inputText;
    const executionLog: string[] = [];
    let failedSteps = 0;

    try {
      for (let i = 0; i < currentPipeline.steps.length; i++) {
        const step = currentPipeline.steps[i];
        
        try {
          if (step.type === 'encode') {
            const encodingResult = encodeText(currentResult, step.algorithm);
            currentResult = encodingResult.result;
            executionLog.push(`✓ Step ${i + 1}: ${step.algorithm} Encode: ${currentResult.length} chars`);
            
            // Add warnings if present
            if (encodingResult.warnings && encodingResult.warnings.length > 0) {
              executionLog.push(`  ⚠ Warning: ${encodingResult.warnings[0]}`);
            }
          } else {
            // Decode step - handle symmetric ciphers and general decoding
            const symmetricCiphers = ['ROT13', 'Atbash Cipher', 'Caesar Cipher (+3)'];
            
            if (symmetricCiphers.includes(step.algorithm)) {
              // For symmetric ciphers, encoding = decoding
              const encodingResult = encodeText(currentResult, step.algorithm);
              currentResult = encodingResult.result;
              executionLog.push(`✓ Step ${i + 1}: ${step.algorithm} Decode: Direct transformation`);
            } else {
              // Use analyzer to find best match for other algorithms
              const analysis = analyzeText(currentResult, { maxSize: 50000 });
              
              // Try to find matching decoder or use best match
              const matchingResult = analysis.alternatives.find(alt => 
                alt.type.toLowerCase().includes(step.algorithm.toLowerCase())
              ) || analysis.bestMatch;
              
              if (matchingResult.confidence < 50) {
                executionLog.push(`⚠ Step ${i + 1}: ${step.algorithm} Decode: Low confidence (${matchingResult.confidence}%)`);
              } else {
                executionLog.push(`✓ Step ${i + 1}: ${step.algorithm} Decode: ${matchingResult.confidence}% confidence`);
              }
              
              currentResult = matchingResult.result;
            }
          }
        } catch (stepError) {
          failedSteps++;
          const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error';
          executionLog.push(`✗ Step ${i + 1}: ${step.algorithm} ${step.type} FAILED: ${errorMessage}`);
          console.error(`Pipeline step ${i + 1} failed:`, stepError);
          
          // Continue with original input for this step if it fails
          // This allows pipeline to continue rather than stopping completely
          executionLog.push(`  → Continuing with previous result...`);
        }
      }

      setResult(currentResult);
      
      // Show appropriate toast based on success/failure rate
      if (failedSteps === 0) {
        toast({
          title: "Pipeline Executed Successfully",
          description: `Completed all ${currentPipeline.steps.length} steps successfully`,
          variant: "default",
        });
      } else if (failedSteps < currentPipeline.steps.length) {
        toast({
          title: "Pipeline Partially Completed",
          description: `${failedSteps} of ${currentPipeline.steps.length} steps failed, but pipeline continued`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pipeline Failed",
          description: "All pipeline steps failed to execute",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Pipeline execution error:', error);
      toast({
        title: "Pipeline Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setResult('Pipeline execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const savePipeline = () => {
    // Enhanced pipeline validation
    if (!currentPipeline.name.trim()) {
      toast({
        title: "Cannot Save",
        description: "Pipeline needs a valid name",
        variant: "destructive",
      });
      return;
    }
    
    if (currentPipeline.steps.length === 0) {
      toast({
        title: "Cannot Save",
        description: "Pipeline needs at least one step",
        variant: "destructive",
      });
      return;
    }
    
    // Validate all steps have valid algorithms
    const invalidSteps = currentPipeline.steps.filter(step => 
      !step.algorithm || 
      (!allAlgorithms.includes(step.algorithm) && !decodeAlgorithms.includes(step.algorithm))
    );
    
    if (invalidSteps.length > 0) {
      toast({
        title: "Cannot Save",
        description: `Pipeline contains ${invalidSteps.length} invalid step(s)`,
        variant: "destructive",
      });
      return;
    }

    const savedPipeline: Pipeline = {
      ...currentPipeline,
      id: `pipeline-${Date.now()}`,
      created: new Date()
    };

    setSavedPipelines(prev => [savedPipeline, ...prev]);
    
    // Save to localStorage with error handling
    try {
      localStorage.setItem('swiftx-pipelines', JSON.stringify([savedPipeline, ...savedPipelines]));
    } catch (error) {
      console.error('Error saving pipeline to localStorage:', error);
      toast({
        title: "Save Failed",
        description: "Unable to save pipeline. Storage may be full.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Pipeline Saved",
      description: `"${savedPipeline.name}" saved to your collection`,
      variant: "default",
    });
  };

  const loadPipeline = (pipeline: Pipeline) => {
    setCurrentPipeline(pipeline);
    toast({
      title: "Pipeline Loaded",
      description: `Loaded "${pipeline.name}" with ${pipeline.steps.length} steps`,
      variant: "default",
    });
  };

  const deletePipeline = (pipelineId: string) => {
    const updatedPipelines = savedPipelines.filter(p => p.id !== pipelineId);
    setSavedPipelines(updatedPipelines);
    
    // Update localStorage with error handling
    try {
      localStorage.setItem('swiftx-pipelines', JSON.stringify(updatedPipelines));
    } catch (error) {
      console.error('Error updating pipelines in localStorage:', error);
      toast({
        title: "Update Failed",
        description: "Unable to update saved pipelines. Storage may be full.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Pipeline Deleted",
      description: "Pipeline has been removed from your collection",
      variant: "default",
    });
  };

  const exportPipeline = async () => {
    const exportData = JSON.stringify(currentPipeline, null, 2);
    try {
      await copyToClipboard(exportData);
      toast({
        title: "Pipeline Exported",
        description: "Pipeline JSON copied to clipboard",
        variant: "default",
      });
    } catch {
      // Fallback: create downloadable file
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentPipeline.name.replace(/\s+/g, '-')}-pipeline.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="shadow-lg border-2 border-green-300/30 bg-card/80 backdrop-blur-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Settings2 className="h-5 w-5 text-green-300" />
          <span className="text-green-200">Custom Pipeline Builder</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-green-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Chain multiple encoding/decoding operations together in sequence. Perfect for complex transformations, CTF challenges, or creating reusable workflows like CyberChef recipes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create reusable encode/decode workflows - like mini CyberChef recipes
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-green-200">Pipeline Name</label>
            <Input
              value={currentPipeline.name}
              onChange={(e) => setCurrentPipeline(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., CTF Challenge Solver"
              className="bg-gray-800/50 border-green-300/40"
              data-testid="pipeline-name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-green-200">Description</label>
            <Input
              value={currentPipeline.description}
              onChange={(e) => setCurrentPipeline(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this pipeline does"
              className="bg-gray-800/50 border-green-300/40"
            />
          </div>
        </div>

        <Separator />

        {/* Pipeline Steps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-green-200">
              Pipeline Steps ({currentPipeline.steps.length})
            </h3>
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={savePipeline} variant="outline">
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" onClick={exportPipeline} variant="outline">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Current Steps */}
          <ScrollArea className="h-32 border rounded-md p-2">
            {currentPipeline.steps.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                No steps added yet. Add encoding/decoding steps below.
              </div>
            ) : (
              <div className="space-y-2">
                {currentPipeline.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                    <div className="flex items-center space-x-2">
                      <Badge variant={step.type === 'encode' ? 'default' : 'secondary'}>
                        {index + 1}
                      </Badge>
                      <span className="text-sm font-medium">{step.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStep(step.id, 'up')}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStep(step.id, 'down')}
                        disabled={index === currentPipeline.steps.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStep(step.id)}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-400">➕ Add Encoding Step</label>
              <div className="flex flex-wrap gap-1">
                {popularEncodeAlgorithms.map(algorithm => (
                  <Badge
                    key={algorithm}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-400/20 text-xs"
                    onClick={() => addStep('encode', algorithm)}
                  >
                    + {algorithm}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-400">➖ Add Decoding Step</label>
              <div className="flex flex-wrap gap-1">
                {decodeAlgorithms.slice(0, 8).map(algorithm => (
                  <Badge
                    key={algorithm}
                    variant="outline"
                    className="cursor-pointer hover:bg-purple-400/20 text-xs"
                    onClick={() => addStep('decode', algorithm)}
                  >
                    + {algorithm}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Saved Pipelines Section */}
        {savedPipelines.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-green-200">💾 Saved Pipelines ({savedPipelines.length})</h3>
              
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {savedPipelines.map(pipeline => (
                    <div key={pipeline.id} className="flex items-center justify-between p-2 bg-gray-800/50 border border-green-400/20 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-green-200 truncate">{pipeline.name}</span>
                          <Badge variant="outline" className="text-xs">{pipeline.steps.length} steps</Badge>
                        </div>
                        {pipeline.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">{pipeline.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Created: {pipeline.created.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadPipeline(pipeline)}
                          className="h-8 px-2 text-xs"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePipeline(pipeline.id)}
                          className="h-8 px-2 text-xs text-red-400 hover:text-red-300 hover:border-red-400/50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        <Separator />

        {/* Test Pipeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-green-400">🧪 Test Pipeline</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Input</label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter test input here..."
                className="h-24 font-mono bg-gray-800/50 border-green-400/30"
                data-testid="pipeline-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Output</label>
              <Textarea
                value={result}
                readOnly
                placeholder="Pipeline output will appear here..."
                className="h-24 font-mono bg-gray-900/50 border-green-400/30 text-green-200"
                data-testid="pipeline-output"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={runPipeline}
              disabled={!inputText.trim() || currentPipeline.steps.length === 0 || isRunning}
              className="flex items-center space-x-2 bg-green-400 text-black hover:bg-green-500"
              data-testid="run-pipeline"
            >
              {isRunning ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>{isRunning ? 'Running...' : 'Run Pipeline'}</span>
            </Button>

            {result && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(result)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Result
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}