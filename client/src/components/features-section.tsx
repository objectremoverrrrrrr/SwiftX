import { Card, CardContent } from '@/components/ui/card';
import { Wand2, Layers, Shield, Zap, Lock, Database } from 'lucide-react';

export function FeaturesSection() {
  return (
    <Card className="mt-12 bg-gray-900/50 shadow-lg border border-yellow-400/20 animate-fade-in-up">
      <CardContent className="p-6">
        <h3 className="text-2xl font-bold text-yellow-400 mb-8 text-center bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">Why SwiftX is the Ultimate Decoder</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center group hover:scale-110 transition-all duration-300 p-4 rounded-lg hover:bg-yellow-400/5">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 text-yellow-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform duration-300">
              <Wand2 className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-yellow-400 mb-3 text-lg">Smart Auto-Detection</h4>
            <p className="text-sm text-gray-300 leading-relaxed">Instantly recognizes 25+ encoding formats including Base64, Hex, Binary, JWT, Hashes, and classical ciphers. No guesswork needed.</p>
          </div>
          
          <div className="text-center group hover:scale-110 transition-all duration-300 p-4 rounded-lg hover:bg-green-400/5">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400/30 to-green-600/20 text-green-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform duration-300">
              <Zap className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-green-400 mb-3 text-lg">Lightning Fast</h4>
            <p className="text-sm text-gray-300 leading-relaxed">Process up to 1MB of data instantly with optimized algorithms. Real-time analysis with progress tracking and performance metrics.</p>
          </div>
          
          <div className="text-center group hover:scale-110 transition-all duration-300 p-4 rounded-lg hover:bg-blue-400/5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400/30 to-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform duration-300">
              <Shield className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-blue-400 mb-3 text-lg">100% Private</h4>
            <p className="text-sm text-gray-300 leading-relaxed">Your data never leaves your browser. Complete client-side processing ensures maximum security and confidentiality.</p>
          </div>
          
          <div className="text-center group hover:scale-110 transition-all duration-300 p-4 rounded-lg hover:bg-purple-400/5">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400/30 to-purple-600/20 text-purple-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform duration-300">
              <Layers className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-purple-400 mb-3 text-lg">Multi-Layer Decoding</h4>
            <p className="text-sm text-gray-300 leading-relaxed">Handles nested encodings and complex transformations. Automatically detects encoding chains and processes them step-by-step.</p>
          </div>          
          
          <div className="text-center group hover:scale-110 transition-all duration-300 p-4 rounded-lg hover:bg-red-400/5">
            <div className="w-16 h-16 bg-gradient-to-br from-red-400/30 to-red-600/20 text-red-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform duration-300">
              <Lock className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-red-400 mb-3 text-lg">Cipher Breaking</h4>
            <p className="text-sm text-gray-300 leading-relaxed">Breaks classical ciphers like Caesar, ROT13, and Atbash. Advanced entropy analysis for detecting encryption patterns.</p>
          </div>
          
          <div className="text-center group hover:scale-110 transition-all duration-300 p-4 rounded-lg hover:bg-orange-400/5">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400/30 to-orange-600/20 text-orange-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform duration-300">
              <Database className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-orange-400 mb-3 text-lg">Hash Recognition</h4>
            <p className="text-sm text-gray-300 leading-relaxed">Identifies MD5, SHA-1, SHA-256, and other hash formats. Provides hash analysis and integrity verification tools.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
