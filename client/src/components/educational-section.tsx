import { Card, CardContent } from '@/components/ui/card';
import { Code, Lock, Fingerprint } from 'lucide-react';

export function EducationalSection() {
  return (
    <div className="mt-12 space-y-8">
      {/* Core Concepts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg border border-yellow-300/30 hover:border-yellow-300/50 transition-all duration-300 animate-fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-300/20 text-yellow-300 rounded-lg flex items-center justify-center animate-pulse-slow">
                <Code className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-yellow-200">Encoding</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              Converts data into a different format for transmission or storage. Reversible without keys.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><strong>Examples:</strong> Base64, Hex, URL encoding, Binary, Unicode escapes</div>
              <div><strong>Use Cases:</strong> Data transmission, web APIs, file storage, email attachments</div>
              <div><strong>Reversible:</strong> ✅ Always (no key required)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border border-yellow-300/30 hover:border-yellow-300/50 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-300/20 text-yellow-300 rounded-lg flex items-center justify-center animate-pulse-slow">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-yellow-200">Encryption</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              Transforms data using keys to prevent unauthorized access. Requires correct key to reverse.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><strong>Examples:</strong> Caesar cipher, ROT13, Atbash, Vigenère, substitution ciphers</div>
              <div><strong>Use Cases:</strong> Message protection, puzzles, historical communications</div>
              <div><strong>Reversible:</strong> ⚠️ Requires correct key/method</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border border-yellow-300/30 hover:border-yellow-300/50 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-300/20 text-yellow-300 rounded-lg flex items-center justify-center animate-pulse-slow">
                <Fingerprint className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-yellow-200">Hashing</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              One-way function that produces a fixed-size output. Cannot be reversed to original data.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><strong>Examples:</strong> MD5, SHA-1, SHA-256, SHA-512, bcrypt, Argon2</div>
              <div><strong>Use Cases:</strong> Password storage, data integrity, digital signatures, blockchain</div>
              <div><strong>Reversible:</strong> ❌ One-way function (analysis only)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Features Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-yellow-200 text-center">Latest Features & Improvements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border border-green-300/30 hover:border-green-300/50 transition-all duration-300 animate-fade-in-up">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-300/20 text-green-300 rounded-lg flex items-center justify-center animate-pulse-slow">
                  <Code className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-green-200">Smart Format Selection</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                Choose between auto-detection or manual format selection for precise decoding control.
              </p>
              <div className="text-xs text-muted-foreground">
                <strong>Benefit:</strong> Override auto-detection for edge cases and specific requirements
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-purple-300/30 hover:border-purple-300/50 transition-all duration-300 animate-fade-in-up">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-300/20 text-purple-300 rounded-lg flex items-center justify-center animate-pulse-slow">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-purple-200">Mode-Specific Examples</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                Tailored example datasets for Decoder, Encoder, and Pro modes to showcase each tool's capabilities.
              </p>
              <div className="text-xs text-muted-foreground">
                <strong>Includes:</strong> Complex multi-layer encodings, ambiguous formats, and edge cases
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-red-300/30 hover:border-red-300/50 transition-all duration-300 animate-fade-in-up">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-300/20 text-red-300 rounded-lg flex items-center justify-center animate-pulse-slow">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-red-200">Cross-Check Pro Mode</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                Advanced analysis using multiple detection strategies for maximum accuracy and confidence.
              </p>
              <div className="text-xs text-muted-foreground">
                <strong>Strategies:</strong> Regex patterns, entropy analysis, signature detection, language scoring
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-blue-300/30 hover:border-blue-300/50 transition-all duration-300 animate-fade-in-up">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-300/20 text-blue-300 rounded-lg flex items-center justify-center animate-pulse-slow">
                  <Code className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-blue-200">Enhanced UI & Performance</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                Improved visual design, better logo display, and optimized performance for large data processing.
              </p>
              <div className="text-xs text-muted-foreground">
                <strong>Supports:</strong> Up to 1GB data processing with real-time progress tracking
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
