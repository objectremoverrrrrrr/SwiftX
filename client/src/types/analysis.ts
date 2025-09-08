export interface DecodingResult {
  type: string;
  result: string;
  confidence: number;
  isValid: boolean;
  entropy?: number;
  languageScore?: number;
  steps: string[];
  warnings?: string[];
  analysisMetrics?: {
    originalEntropy?: number;
    binaryQuality?: number;
    structuralCompliance?: number;
    [key: string]: any;
  };
  metadata?: {
    layers?: any[];
    contentType?: string;
    securityRisk?: string;
    optimizations?: any;
    errorDetails?: string;
    processingTime?: number;
  };
}

export interface AnalysisResult {
  bestMatch: DecodingResult;
  alternatives: DecodingResult[];
  inputAnalysis: {
    length: number;
    entropy: number;
    hasValidUtf8: boolean;
  };
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DetectionPattern {
  name: string;
  regex: RegExp;
  validator?: (text: string) => boolean;
  decoder: (text: string) => string | null;
}
