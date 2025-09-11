import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  HelpCircle,
  GripVertical,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  FileText,
  Layers,
  Target,
  Database,
  Cpu,
  BarChart3,
  BookTemplate,
  Workflow
} from 'lucide-react';
import { encodeText, getAllEncodingTypes, getEncodingInfo, encodingPatterns, getEncodingRecommendations } from '@/lib/encoder';
import { analyzeText } from '@/lib/decoder';
import { copyToClipboard } from '@/lib/decoder';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PipelineStep {
  id: string;
  type: 'encode' | 'decode' | 'transform' | 'conditional' | 'validation';
  algorithm: string;
  name: string;
  description?: string;
  options?: {
    condition?: string;
    parameter?: string;
    value?: any;
  };
  enabled?: boolean;
  executionTime?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: string;
  error?: string;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  author: string;
  created: Date;
  lastModified?: Date;
  category?: string;
  tags?: string[];
  isTemplate?: boolean;
  executionHistory?: PipelineExecution[];
}

interface PipelineExecution {
  id: string;
  timestamp: Date;
  inputSize: number;
  totalTime: number;
  stepsCompleted: number;
  stepsTotal: number;
  success: boolean;
  error?: string;
}

interface DebugState {
  stepIndex: number;
  stepResults: { [stepId: string]: string };
  isDebugging: boolean;
  breakpoints: Set<string>;
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
    created: new Date(),
    lastModified: new Date(),
    category: 'Custom',
    tags: [],
    executionHistory: []
  });
  
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [savedPipelines, setSavedPipelines] = useState<Pipeline[]>([]);
  const [pipelineTemplates, setPipelineTemplates] = useState<Pipeline[]>([]);
  const [debugState, setDebugState] = useState<DebugState>({
    stepIndex: -1,
    stepResults: {},
    isDebugging: false,
    breakpoints: new Set()
  });
  const [bulkInputs, setBulkInputs] = useState<string[]>(['']);
  const [bulkResults, setBulkResults] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('builder');
  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const [showVisualization, setShowVisualization] = useState(false);
  const [autoValidate, setAutoValidate] = useState(true);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const { toast } = useToast();

  // Get all available encoding types and organize them
  const encodingTypes = useMemo(() => getAllEncodingTypes(), []);
  const allAlgorithms = useMemo(() => Object.keys(encodingPatterns), []);
  
  // Categorized algorithms for advanced interface
  const categorizedAlgorithms = useMemo(() => {
    const categories: { [key: string]: string[] } = {};
    Object.entries(encodingPatterns).forEach(([name, pattern]) => {
      const category = pattern.category || 'Other';
      if (!categories[category]) categories[category] = [];
      categories[category].push(name);
    });
    return categories;
  }, []);

  // Popular algorithms by category for quick access
  const popularAlgorithms = useMemo(() => ({
    'Base Encodings': ['Base64', 'Base91', 'Base32', 'Hexadecimal', 'Binary'],
    'Web Encodings': ['URL Encoding', 'HTML Entities', 'JSON String', 'XML Entities'],
    'Cryptographic': ['ROT13', 'Caesar Cipher', 'Atbash Cipher', 'Vigenère Cipher'],
    'Advanced': ['JWT Token (Basic)', 'TOTP Code (6-digit)', 'Digital Signature (Simulated)', 'Steganographic Text'],
    'Scientific': ['DNA Sequence (ATCG)', 'Amino Acid Codes', 'Chemical Formula']
  }), []);
  
  // Transform and validation step types
  const transformSteps = [
    'Uppercase', 'Lowercase', 'Reverse', 'Remove Spaces', 'Add Prefix', 'Add Suffix',
    'Split Lines', 'Join Lines', 'Extract Numbers', 'Extract Letters'
  ];
  
  const validationSteps = [
    'Check Length', 'Validate Format', 'Check Encoding', 'Verify Checksum'
  ];

  // Get smart recommendations based on input
  const smartRecommendations = useMemo(() => {
    if (!inputText.trim()) return { recommended: [], reasons: {} };
    return getEncodingRecommendations(inputText);
  }, [inputText]);

  // Helper functions for advanced pipeline operations
  const generateStepName = (type: string, algorithm: string): string => {
    const typeMap = {
      'encode': 'Encode',
      'decode': 'Decode', 
      'transform': 'Transform',
      'conditional': 'If',
      'validation': 'Validate'
    };
    return `${typeMap[type as keyof typeof typeMap] || type} with ${algorithm}`;
  };
  
  const executeDecodeStep = async (input: string, algorithm: string): Promise<string> => {
    const symmetricCiphers = ['ROT13', 'Atbash Cipher', 'Caesar Cipher (+3)'];
    
    if (symmetricCiphers.includes(algorithm)) {
      const encodingResult = encodeText(input, algorithm);
      return encodingResult.result;
    } else {
      const analysis = analyzeText(input, { maxSize: 50000 });
      const matchingResult = analysis.alternatives.find(alt => 
        alt.type.toLowerCase().includes(algorithm.toLowerCase())
      ) || analysis.bestMatch;
      return matchingResult.result;
    }
  };
  
  const executeTransformStep = (input: string, algorithm: string, options: any = {}): string => {
    switch (algorithm) {
      case 'Uppercase': return input.toUpperCase();
      case 'Lowercase': return input.toLowerCase();
      case 'Reverse': return input.split('').reverse().join('');
      case 'Remove Spaces': return input.replace(/\\s+/g, '');
      case 'Add Prefix': return (options.value || '') + input;
      case 'Add Suffix': return input + (options.value || '');
      case 'Split Lines': return input.split(/\\r?\\n/).join(' | ');
      case 'Join Lines': return input.replace(/ \\| /g, '\\n');
      case 'Extract Numbers': return input.replace(/[^0-9]/g, '');
      case 'Extract Letters': return input.replace(/[^a-zA-Z]/g, '');
      default: return input;
    }
  };
  
  const executeValidationStep = (input: string, algorithm: string, options: any = {}): boolean => {
    switch (algorithm) {
      case 'Check Length': 
        const expectedLength = options.value || 0;
        return input.length === expectedLength;
      case 'Validate Format':
        const pattern = options.value || '';
        return new RegExp(pattern).test(input);
      case 'Check Encoding':
        return analyzeText(input).bestMatch.confidence > 80;
      case 'Verify Checksum':
        // Simplified checksum validation
        return input.length > 0;
      default: 
        return true;
    }
  };
  
  const evaluateCondition = (input: string, condition: string): boolean => {
    try {
      // Simple condition evaluation (extend as needed)
      const length = input.length;
      const hasNumbers = /\\d/.test(input);
      const hasLetters = /[a-zA-Z]/.test(input);
      const confidence = analyzeText(input).bestMatch.confidence;
      
      // Replace placeholders with actual values
      const evaluableCondition = condition
        .replace(/\\blength\\b/g, length.toString())
        .replace(/\\bhasNumbers\\b/g, hasNumbers.toString())
        .replace(/\\bhasLetters\\b/g, hasLetters.toString())
        .replace(/\\bconfidence\\b/g, confidence.toString());
      
      return Function(`"use strict"; return (${evaluableCondition});`)();
    } catch {
      return true; // Default to true if condition can't be evaluated
    }
  };
  
  const validatePipeline = useCallback((steps: PipelineStep[]) => {
    const issues: string[] = [];
    const decodeAlgorithms = [...allAlgorithms, 'Auto-detect', 'Multi-layer'];
    
    steps.forEach((step, index) => {
      // Check for valid algorithms
      if (step.type === 'encode' || step.type === 'decode') {
        const validAlgorithms = step.type === 'decode' ? decodeAlgorithms : allAlgorithms;
        if (!validAlgorithms.includes(step.algorithm)) {
          issues.push(`Step ${index + 1}: Unknown algorithm '${step.algorithm}'`);
        }
      }
      
      // Check conditional steps
      if (step.type === 'conditional' && !step.options?.condition) {
        issues.push(`Step ${index + 1}: Conditional step missing condition`);
      }
      
      // Check validation steps
      if (step.type === 'validation' && !step.options?.value) {
        issues.push(`Step ${index + 1}: Validation step missing expected value`);
      }
    });
    
    if (issues.length > 0 && autoValidate) {
      toast({
        title: "Pipeline Validation Issues",
        description: `${issues.length} issue(s) detected`,
        variant: "destructive",
      });
    }
    
    return issues;
  }, [allAlgorithms, autoValidate, toast]);
  
  const getDefaultPipelineTemplates = (): Pipeline[] => [
    {
      id: 'template-ctf-basic',
      name: 'CTF Basic Decode',
      description: 'Common CTF challenge decoding sequence',
      steps: [
        { id: 'step-1', type: 'decode', algorithm: 'Base64', name: 'Decode Base64', enabled: true, status: 'pending' },
        { id: 'step-2', type: 'decode', algorithm: 'URL Encoding', name: 'Decode URL', enabled: true, status: 'pending' },
        { id: 'step-3', type: 'decode', algorithm: 'ROT13', name: 'Decode ROT13', enabled: true, status: 'pending' }
      ],
      author: 'SwiftX',
      created: new Date(),
      category: 'CTF',
      tags: ['ctf', 'decode', 'basic'],
      isTemplate: true
    },
    {
      id: 'template-data-cleanup',
      name: 'Data Cleanup Pipeline',
      description: 'Clean and normalize text data',
      steps: [
        { id: 'step-1', type: 'transform', algorithm: 'Remove Spaces', name: 'Remove Spaces', enabled: true, status: 'pending' },
        { id: 'step-2', type: 'transform', algorithm: 'Lowercase', name: 'Convert to Lowercase', enabled: true, status: 'pending' },
        { id: 'step-3', type: 'validation', algorithm: 'Check Length', name: 'Validate Length', enabled: true, status: 'pending', options: { value: 10 } }
      ],
      author: 'SwiftX',
      created: new Date(),
      category: 'Data Processing',
      tags: ['cleanup', 'normalize', 'validation'],
      isTemplate: true
    },
    {
      id: 'template-web-encoding',
      name: 'Web Encoding Chain',
      description: 'Common web encoding/decoding operations',
      steps: [
        { id: 'step-1', type: 'encode', algorithm: 'URL Encoding', name: 'URL Encode', enabled: true, status: 'pending' },
        { id: 'step-2', type: 'encode', algorithm: 'HTML Entities', name: 'HTML Entity Encode', enabled: true, status: 'pending' },
        { id: 'step-3', type: 'encode', algorithm: 'Base64', name: 'Base64 Encode', enabled: true, status: 'pending' }
      ],
      author: 'SwiftX',
      created: new Date(),
      category: 'Web Development',
      tags: ['web', 'encoding', 'security'],
      isTemplate: true
    }
  ];

  // Load saved pipelines and templates from localStorage on component mount
  useEffect(() => {
    try {
      // Load saved pipelines
      const saved = localStorage.getItem('swiftx-pipelines');
      if (saved) {
        const pipelines: Pipeline[] = JSON.parse(saved);
        const validPipelines = pipelines.map(pipeline => ({
          ...pipeline,
          created: new Date(pipeline.created),
          lastModified: pipeline.lastModified ? new Date(pipeline.lastModified) : new Date(pipeline.created),
          executionHistory: pipeline.executionHistory || []
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

      // Load/create default templates
      const templatesData = localStorage.getItem('swiftx-pipeline-templates');
      const defaultTemplates = getDefaultPipelineTemplates();
      
      if (!templatesData) {
        setPipelineTemplates(defaultTemplates);
        localStorage.setItem('swiftx-pipeline-templates', JSON.stringify(defaultTemplates));
      } else {
        const savedTemplates: Pipeline[] = JSON.parse(templatesData);
        // Merge with defaults, prioritizing saved templates
        const mergedTemplates = [...savedTemplates];
        defaultTemplates.forEach(defaultTemplate => {
          if (!savedTemplates.find(t => t.id === defaultTemplate.id)) {
            mergedTemplates.push(defaultTemplate);
          }
        });
        setPipelineTemplates(mergedTemplates);
      }
      
    } catch (error) {
      console.error('Error loading saved pipelines:', error);
      localStorage.removeItem('swiftx-pipelines');
      localStorage.removeItem('swiftx-pipeline-templates');
    }
  }, [toast]);

  const addStep = useCallback((type: 'encode' | 'decode' | 'transform' | 'conditional' | 'validation', algorithm: string, options?: any) => {
    const newStep: PipelineStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      algorithm,
      name: generateStepName(type, algorithm),
      description: getEncodingInfo(algorithm)?.description || `${type} operation`,
      enabled: true,
      status: 'pending',
      options: options || {}
    };
    
    setCurrentPipeline(prev => {
      const updated = {
        ...prev,
        steps: [...prev.steps, newStep],
        lastModified: new Date()
      };
      
      // Auto-validate if enabled
      if (autoValidate) {
        setTimeout(() => validatePipeline(updated.steps), 100);
      }
      
      return updated;
    });
    
    toast({
      title: "Step Added",
      description: `Added ${newStep.name} to pipeline`,
      variant: "default",
    });
  }, [autoValidate, toast, validatePipeline]);

  const removeStep = useCallback((stepId: string) => {
    setCurrentPipeline(prev => {
      const step = prev.steps.find(s => s.id === stepId);
      const updated = {
        ...prev,
        steps: prev.steps.filter(step => step.id !== stepId),
        lastModified: new Date()
      };
      
      // Remove from debug state
      setDebugState(prevDebug => ({
        ...prevDebug,
        breakpoints: new Set([...prevDebug.breakpoints].filter(id => id !== stepId)),
        stepResults: Object.fromEntries(
          Object.entries(prevDebug.stepResults).filter(([id]) => id !== stepId)
        )
      }));
      
      if (step) {
        toast({
          title: "Step Removed",
          description: `Removed ${step.name} from pipeline`,
          variant: "default",
        });
      }
      
      return updated;
    });
  }, [toast]);

  const moveStep = useCallback((stepId: string, direction: 'up' | 'down' | number) => {
    setCurrentPipeline(prev => {
      const steps = [...prev.steps];
      const currentIndex = steps.findIndex(step => step.id === stepId);
      
      let newIndex: number;
      if (typeof direction === 'number') {
        newIndex = Math.max(0, Math.min(direction, steps.length - 1));
      } else {
        newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        newIndex = Math.max(0, Math.min(newIndex, steps.length - 1));
      }
      
      if (currentIndex !== newIndex) {
        const [movedStep] = steps.splice(currentIndex, 1);
        steps.splice(newIndex, 0, movedStep);
      }
      
      return { 
        ...prev, 
        steps,
        lastModified: new Date()
      };
    });
  }, []);
  
  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, stepId: string) => {
    setDraggedStep(stepId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', stepId);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent, targetStepId: string) => {
    e.preventDefault();
    if (draggedStep && draggedStep !== targetStepId) {
      const targetIndex = currentPipeline.steps.findIndex(s => s.id === targetStepId);
      moveStep(draggedStep, targetIndex);
    }
    setDraggedStep(null);
  }, [draggedStep, currentPipeline.steps, moveStep]);

  const runPipeline = useCallback(async (inputs: string[] = [inputText], debugMode: boolean = false) => {
    if (!inputs[0]?.trim() || currentPipeline.steps.length === 0) {
      toast({
        title: "Invalid Input",
        description: "Please provide input text and at least one pipeline step",
        variant: "destructive",
      });
      return;
    }

    const startTime = Date.now();
    setIsRunning(true);
    setExecutionProgress(0);
    
    const results: string[] = [];
    const enabledSteps = currentPipeline.steps.filter(step => step.enabled !== false);
    let totalFailedSteps = 0;
    
    try {
      // Process each input through the pipeline
      for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
        let currentResult = inputs[inputIndex];
        const stepResults: { [stepId: string]: string } = {};
        let failedSteps = 0;
        
        // Execute each step in the pipeline
        for (let i = 0; i < enabledSteps.length; i++) {
          const step = enabledSteps[i];
          const stepStartTime = Date.now();
          
          // Update step status
          setCurrentPipeline(prev => ({
            ...prev,
            steps: prev.steps.map(s => 
              s.id === step.id ? { ...s, status: 'running' } : s
            )
          }));
          
          // Check for breakpoint in debug mode
          if (debugMode && debugState.breakpoints.has(step.id)) {
            setDebugState(prev => ({
              ...prev,
              stepIndex: i,
              stepResults: { ...prev.stepResults, [step.id]: currentResult }
            }));
            
            toast({
              title: "Breakpoint Hit",
              description: `Execution paused at step: ${step.name}`,
              variant: "default",
            });
            return;
          }
          
          try {
            // Execute step based on type
            switch (step.type) {
              case 'encode':
                const encodingResult = encodeText(currentResult, step.algorithm);
                currentResult = encodingResult.result;
                break;
                
              case 'decode':
                currentResult = await executeDecodeStep(currentResult, step.algorithm);
                break;
                
              case 'transform':
                currentResult = executeTransformStep(currentResult, step.algorithm, step.options);
                break;
                
              case 'conditional':
                const shouldExecute = evaluateCondition(currentResult, step.options?.condition || '');
                if (!shouldExecute) {
                  setCurrentPipeline(prev => ({
                    ...prev,
                    steps: prev.steps.map(s => 
                      s.id === step.id ? { ...s, status: 'skipped' } : s
                    )
                  }));
                  continue;
                }
                break;
                
              case 'validation':
                const isValid = executeValidationStep(currentResult, step.algorithm, step.options);
                if (!isValid) {
                  throw new Error(`Validation failed: ${step.algorithm}`);
                }
                break;
                
              default:
                throw new Error(`Unknown step type: ${step.type}`);
            }
            
            // Record step execution time
            const executionTime = Date.now() - stepStartTime;
            stepResults[step.id] = currentResult;
            
            // Update step status
            setCurrentPipeline(prev => ({
              ...prev,
              steps: prev.steps.map(s => 
                s.id === step.id ? { 
                  ...s, 
                  status: 'completed', 
                  result: currentResult.length > 100 ? currentResult.substr(0, 100) + '...' : currentResult,
                  executionTime 
                } : s
              )
            }));
            
          } catch (stepError) {
            failedSteps++;
            totalFailedSteps++;
            const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error';
            console.error(`Pipeline step ${i + 1} failed:`, stepError);
            
            // Update step status
            setCurrentPipeline(prev => ({
              ...prev,
              steps: prev.steps.map(s => 
                s.id === step.id ? { 
                  ...s, 
                  status: 'failed', 
                  error: errorMessage,
                  executionTime: Date.now() - stepStartTime
                } : s
              )
            }));
          }
          
          // Update progress
          setExecutionProgress(((i + 1) / enabledSteps.length) * 100);
        }
        
        results.push(currentResult);
        
        // Update debug state
        if (debugMode) {
          setDebugState(prev => ({
            ...prev,
            stepResults: { ...prev.stepResults, ...stepResults }
          }));
        }
      }
      
      // Set results
      if (inputs.length === 1) {
        setResult(results[0]);
      } else {
        setBulkResults(results);
      }
      
      // Record execution in history
      const totalTime = Date.now() - startTime;
      const executionRecord: PipelineExecution = {
        id: `exec-${Date.now()}`,
        timestamp: new Date(),
        inputSize: inputs.reduce((sum, input) => sum + input.length, 0),
        totalTime,
        stepsCompleted: enabledSteps.length * inputs.length - totalFailedSteps,
        stepsTotal: enabledSteps.length * inputs.length,
        success: totalFailedSteps === 0
      };
      
      setCurrentPipeline(prev => ({
        ...prev,
        executionHistory: [executionRecord, ...(prev.executionHistory || [])].slice(0, 10)
      }));
      
      // Show completion toast
      if (totalFailedSteps === 0) {
        toast({
          title: "Pipeline Executed Successfully",
          description: `Processed ${inputs.length} input(s) in ${totalTime}ms`,
          variant: "default",
        });
      } else {
        toast({
          title: "Pipeline Partially Completed",
          description: `${totalFailedSteps} of ${enabledSteps.length * inputs.length} steps failed`,
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
    } finally {
      setIsRunning(false);
      setExecutionProgress(0);
      
      // Reset step statuses
      setTimeout(() => {
        setCurrentPipeline(prev => ({
          ...prev,
          steps: prev.steps.map(step => ({ ...step, status: 'pending' }))
        }));
      }, 2000);
    }
  }, [inputText, currentPipeline.steps, debugState.breakpoints, toast, executeDecodeStep, executeTransformStep, executeValidationStep, evaluateCondition]);
  
  const exportPipeline = useCallback(async () => {
    const exportData = {
      ...currentPipeline,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    const jsonData = JSON.stringify(exportData, null, 2);
    
    try {
      await copyToClipboard(jsonData);
      toast({
        title: "Pipeline Exported",
        description: "Pipeline JSON copied to clipboard",
        variant: "default",
      });
    } catch {
      // Fallback: create downloadable file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentPipeline.name.replace(/\\s+/g, '-')}-pipeline.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Pipeline Downloaded",
        description: "Pipeline saved as JSON file",
        variant: "default",
      });
    }
  }, [currentPipeline, toast]);
  
  const toggleStepEnabled = useCallback((stepId: string) => {
    setCurrentPipeline(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, enabled: !step.enabled } : step
      ),
      lastModified: new Date()
    }));
  }, []);
  
  const toggleBreakpoint = useCallback((stepId: string) => {
    setDebugState(prev => {
      const newBreakpoints = new Set(prev.breakpoints);
      if (newBreakpoints.has(stepId)) {
        newBreakpoints.delete(stepId);
      } else {
        newBreakpoints.add(stepId);
      }
      return { ...prev, breakpoints: newBreakpoints };
    });
  }, []);
  
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
    const decodeAlgorithms = [...allAlgorithms, 'Auto-detect', 'Multi-layer'];
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

  // Real-time mode handler
  useEffect(() => {
    if (realTimeMode && inputText.trim() && currentPipeline.steps.length > 0 && !isRunning) {
      const debounceTimer = setTimeout(() => {
        runPipeline([inputText], false);
      }, 500);
      
      return () => clearTimeout(debounceTimer);
    }
  }, [inputText, currentPipeline.steps, realTimeMode, isRunning, runPipeline]);

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-6xl mx-auto bg-gradient-to-br from-gray-900 via-gray-800 to-black border-green-400/20">
      <CardHeader className="border-b border-green-400/30 bg-gradient-to-r from-green-400/10 to-blue-400/10">
        <CardTitle className="flex items-center justify-between text-green-400">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-400/20 rounded-lg">
              <Workflow className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <span className="text-lg font-bold">Pipeline Builder</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 ml-2 text-blue-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm p-3">
                    <div className="space-y-2">
                      <p className="font-semibold">Advanced Pipeline Features:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        <li>39+ encoding formats including JWT, TOTP, steganography</li>
                        <li>Drag-and-drop step reordering</li>
                        <li>Conditional and validation steps</li>
                        <li>Bulk processing and debugging tools</li>
                        <li>Pipeline templates and visualization</li>
                      </ul>
                      <p className="text-xs font-medium">Keyboard: Ctrl+S (Save), Ctrl+E (Export), Ctrl+Enter (Run)</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {currentPipeline.steps.filter(s => s.enabled !== false).length} Active Steps
            </Badge>
            {currentPipeline.executionHistory && currentPipeline.executionHistory.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {currentPipeline.executionHistory[0].success ? 'Last: Success' : 'Last: Failed'}
              </Badge>
            )}
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Professional-grade data processing pipelines with debugging, templates, and advanced transformations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch checked={realTimeMode} onCheckedChange={setRealTimeMode} data-testid="switch-realtime" />
              <Label htmlFor="real-time" className="text-xs">Real-time</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={autoValidate} onCheckedChange={setAutoValidate} data-testid="switch-autovalidate" />
              <Label htmlFor="auto-validate" className="text-xs">Auto-validate</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={showVisualization} onCheckedChange={setShowVisualization} data-testid="switch-visualization" />
              <Label htmlFor="visualization" className="text-xs">Flowchart</Label>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {smartRecommendations.recommended.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs cursor-help">
                      <Zap className="h-3 w-3 mr-1" />
                      {smartRecommendations.recommended.length} Smart Suggestions
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-sm">
                      <p className="font-semibold mb-2">Recommended for your input:</p>
                      <ul className="space-y-1">
                        {smartRecommendations.recommended.slice(0, 3).map(rec => (
                          <li key={rec} className="text-xs">
                            <strong>{rec}</strong>: {smartRecommendations.reasons[rec]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isRunning && (
              <div className="flex items-center space-x-2">
                <Progress value={executionProgress} className="w-20 h-2" />
                <Badge variant="secondary" className="text-xs animate-pulse">
                  {Math.round(executionProgress)}%
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Main Tabbed Interface */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="builder" className="text-xs" data-testid="tab-builder">
              <Settings2 className="h-3 w-3 mr-1" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs" data-testid="tab-templates">
              <BookTemplate className="h-3 w-3 mr-1" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="bulk" className="text-xs" data-testid="tab-bulk">
              <Database className="h-3 w-3 mr-1" />
              Bulk Process
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-xs" data-testid="tab-debug">
              <Eye className="h-3 w-3 mr-1" />
              Debug
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs" data-testid="tab-history">
              <Clock className="h-3 w-3 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger value="test" className="text-xs" data-testid="tab-test">
              <Target className="h-3 w-3 mr-1" />
              Test
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab - Main Pipeline Construction */}
          <TabsContent value="builder" className="space-y-4">
            {/* Pipeline Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-200">Pipeline Name</label>
                <Input
                  value={currentPipeline.name}
                  onChange={(e) => setCurrentPipeline(prev => ({ ...prev, name: e.target.value, lastModified: new Date() }))}
                  placeholder="e.g., Advanced CTF Solver"
                  className="bg-gray-800/50 border-green-300/40"
                  data-testid="pipeline-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-200">Category</label>
                <Select value={currentPipeline.category || ''} onValueChange={(value) => setCurrentPipeline(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="bg-gray-800/50 border-green-300/40" data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CTF">CTF & Security</SelectItem>
                    <SelectItem value="Data Processing">Data Processing</SelectItem>
                    <SelectItem value="Web Development">Web Development</SelectItem>
                    <SelectItem value="Forensics">Digital Forensics</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-green-200">Description</label>
              <Textarea
                value={currentPipeline.description}
                onChange={(e) => setCurrentPipeline(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this pipeline does and when to use it..."
                className="bg-gray-800/50 border-green-300/40 resize-none"
                rows={2}
                data-testid="pipeline-description"
              />
            </div>

            {/* Current Pipeline Steps - Enhanced with Drag & Drop */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-green-200">
                  Pipeline Steps ({currentPipeline.steps.length})
                </h3>
                <div className="flex items-center space-x-2">
                  <Button size="sm" onClick={savePipeline} variant="outline" data-testid="button-save">
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" onClick={exportPipeline} variant="outline" data-testid="button-export">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Current Steps */}
              <ScrollArea className="h-32 border rounded-md p-2" data-testid="scroll-steps">
                {currentPipeline.steps.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    No steps added yet. Add encoding/decoding steps below.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentPipeline.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center justify-between p-2 bg-muted/50 rounded border" data-testid={`step-${step.id}`}>
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
                            data-testid={`button-move-up-${step.id}`}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveStep(step.id, 'down')}
                            disabled={index === currentPipeline.steps.length - 1}
                            className="h-6 w-6 p-0"
                            data-testid={`button-move-down-${step.id}`}
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeStep(step.id)}
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            data-testid={`button-remove-${step.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Enhanced Step Categories - All 39+ Formats */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-green-200">Add Pipeline Steps</div>
                <Tabs defaultValue="encode" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="encode" className="text-xs">Encode</TabsTrigger>
                    <TabsTrigger value="decode" className="text-xs">Decode</TabsTrigger>
                    <TabsTrigger value="transform" className="text-xs">Transform</TabsTrigger>
                    <TabsTrigger value="validate" className="text-xs">Validate</TabsTrigger>
                    <TabsTrigger value="conditional" className="text-xs">Conditional</TabsTrigger>
                  </TabsList>
                  
                  {/* Encoding Steps */}
                  <TabsContent value="encode" className="space-y-3">
                    {Object.entries(categorizedAlgorithms).map(([category, algorithms]) => (
                      <div key={category} className="space-y-2">
                        <label className="text-xs font-medium text-blue-400">{category}</label>
                        <div className="flex flex-wrap gap-1">
                          {algorithms.slice(0, 8).map(algorithm => (
                            <Badge
                              key={algorithm}
                              variant="outline"
                              className="cursor-pointer hover:bg-blue-400/20 text-xs"
                              onClick={() => addStep('encode', algorithm)}
                              title={getEncodingInfo(algorithm)?.description}
                              data-testid={`badge-encode-${algorithm}`}
                            >
                              + {algorithm}
                            </Badge>
                          ))}
                          {algorithms.length > 8 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Badge variant="secondary" className="cursor-pointer text-xs">
                                  +{algorithms.length - 8} more...
                                </Badge>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{category} Encoders</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                                  {algorithms.map(algorithm => (
                                    <Button
                                      key={algorithm}
                                      variant="outline"
                                      className="text-xs justify-start h-auto p-2"
                                      onClick={() => {
                                        addStep('encode', algorithm);
                                        const openElement = document.querySelector('[data-state="open"]') as HTMLElement;
                                        openElement?.click();
                                      }}
                                    >
                                      <div className="text-left">
                                        <div className="font-medium">{algorithm}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                          {getEncodingInfo(algorithm)?.description}
                                        </div>
                                      </div>
                                    </Button>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  {/* Decoding Steps */}
                  <TabsContent value="decode" className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {allAlgorithms.slice(0, 16).map(algorithm => (
                        <Badge
                          key={algorithm}
                          variant="outline"
                          className="cursor-pointer hover:bg-purple-400/20 text-xs"
                          onClick={() => addStep('decode', algorithm)}
                          data-testid={`badge-decode-${algorithm}`}
                        >
                          + {algorithm}
                        </Badge>
                      ))}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Badge variant="secondary" className="cursor-pointer text-xs">
                            +{allAlgorithms.length - 16} more decoders...
                          </Badge>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>All Decoders ({allAlgorithms.length} available)</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                            {allAlgorithms.map(algorithm => (
                              <Button
                                key={algorithm}
                                variant="outline"
                                className="text-xs justify-start h-auto p-2"
                                onClick={() => {
                                  addStep('decode', algorithm);
                                  const openElement = document.querySelector('[data-state="open"]') as HTMLElement;
                                  openElement?.click();
                                }}
                              >
                                {algorithm}
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>
                  
                  {/* Transform Steps */}
                  <TabsContent value="transform" className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {transformSteps.map(transform => (
                        <Badge
                          key={transform}
                          variant="outline"
                          className="cursor-pointer hover:bg-orange-400/20 text-xs"
                          onClick={() => addStep('transform', transform)}
                          data-testid={`badge-transform-${transform}`}
                        >
                          + {transform}
                        </Badge>
                      ))}
                    </div>
                  </TabsContent>
                  
                  {/* Validation Steps */}
                  <TabsContent value="validate" className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {validationSteps.map(validation => (
                        <Badge
                          key={validation}
                          variant="outline"
                          className="cursor-pointer hover:bg-green-400/20 text-xs"
                          onClick={() => addStep('validation', validation)}
                          data-testid={`badge-validation-${validation}`}
                        >
                          + {validation}
                        </Badge>
                      ))}
                    </div>
                  </TabsContent>
                  
                  {/* Conditional Steps */}
                  <TabsContent value="conditional" className="space-y-2">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Add conditional execution based on data properties</p>
                      <div className="flex flex-wrap gap-1">
                        {['Length Check', 'Confidence Check', 'Format Check', 'Content Check'].map(condition => (
                          <Badge
                            key={condition}
                            variant="outline"
                            className="cursor-pointer hover:bg-yellow-400/20 text-xs"
                            onClick={() => addStep('conditional', condition)}
                            data-testid={`badge-conditional-${condition}`}
                          >
                            + If {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="text-sm font-medium text-green-200">Pipeline Templates</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pipelineTemplates.map(template => (
                <Card key={template.id} className="border-green-400/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{template.name}</span>
                      <Badge variant="outline" className="text-xs">{template.steps.length} steps</Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => loadPipeline(template)}
                      className="w-full"
                      data-testid={`button-load-template-${template.id}`}
                    >
                      Load Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="space-y-4">
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
                onClick={() => runPipeline()}
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
                  data-testid="button-copy-result"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Result
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Saved Pipelines Section */}
        {savedPipelines.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-green-200">Saved Pipelines ({savedPipelines.length})</h3>
              
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
                          data-testid={`button-load-${pipeline.id}`}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePipeline(pipeline.id)}
                          className="h-8 px-2 text-xs text-red-400 hover:text-red-300 hover:border-red-400/50"
                          data-testid={`button-delete-${pipeline.id}`}
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
      </CardContent>
    </Card>
  );
}