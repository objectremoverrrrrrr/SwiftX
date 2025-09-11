// Advanced Web Worker Management System for Lightning Fast Processing
// Handles parallel processing, load balancing, and worker lifecycle

interface WorkerTask {
  id: string;
  type: 'decode' | 'analyze' | 'chunk-process';
  data: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number;
}

interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  taskCount: number;
  lastUsed: number;
}

class WorkerManager {
  private workers: WorkerInstance[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private maxWorkers: number;
  private workerScript: string;

  constructor(maxWorkers = 4) {
    this.maxWorkers = Math.min(maxWorkers, navigator.hardwareConcurrency || 4);
    this.workerScript = '/src/workers/decode-worker.ts';
    this.initializeWorkers();
  }

  private initializeWorkers() {
    // Start with 2 workers, scale up as needed
    for (let i = 0; i < Math.min(2, this.maxWorkers); i++) {
      this.createWorker();
    }
  }

  private createWorker(): WorkerInstance {
    const worker = new Worker(this.workerScript, { type: 'module' });
    const instance: WorkerInstance = {
      worker,
      busy: false,
      taskCount: 0,
      lastUsed: Date.now()
    };

    worker.onmessage = (event) => {
      this.handleWorkerMessage(instance, event);
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      this.handleWorkerError(instance, error);
    };

    this.workers.push(instance);
    return instance;
  }

  private handleWorkerMessage(workerInstance: WorkerInstance, event: MessageEvent) {
    const { id, type, data } = event.data;
    const task = this.activeTasks.get(id);

    if (!task) return;

    switch (type) {
      case 'result':
        task.resolve(data);
        this.completeTask(workerInstance, id);
        break;
      case 'progress':
        // Handle progress updates (could emit events)
        break;
      case 'error':
        task.reject(new Error(data.error));
        this.completeTask(workerInstance, id);
        break;
    }
  }

  private handleWorkerError(workerInstance: WorkerInstance, error: any) {
    // Handle worker errors and restart if necessary
    const index = this.workers.indexOf(workerInstance);
    if (index !== -1) {
      workerInstance.worker.terminate();
      this.workers.splice(index, 1);
      
      // Create a new worker to replace the failed one
      if (this.workers.length < this.maxWorkers) {
        this.createWorker();
      }
    }
  }

  private completeTask(workerInstance: WorkerInstance, taskId: string) {
    workerInstance.busy = false;
    workerInstance.lastUsed = Date.now();
    this.activeTasks.delete(taskId);
    
    // Process next task in queue
    this.processQueue();
  }

  private getAvailableWorker(): WorkerInstance | null {
    // Find idle worker
    let availableWorker = this.workers.find(w => !w.busy);
    
    if (!availableWorker && this.workers.length < this.maxWorkers) {
      // Create new worker if under limit
      availableWorker = this.createWorker();
    }

    return availableWorker || null;
  }

  private processQueue() {
    if (this.taskQueue.length === 0) return;

    const worker = this.getAvailableWorker();
    if (!worker) return;

    // Sort by priority and get highest priority task
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    const task = this.taskQueue.shift()!;

    this.executeTask(worker, task);
  }

  private executeTask(workerInstance: WorkerInstance, task: WorkerTask) {
    workerInstance.busy = true;
    workerInstance.taskCount++;
    this.activeTasks.set(task.id, task);

    workerInstance.worker.postMessage({
      id: task.id,
      type: task.type,
      data: task.data
    });
  }

  // Public API
  async processText(input: string, patterns?: string[], priority = 5): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `decode_${Date.now()}_${Math.random()}`,
        type: 'decode',
        data: { input, patterns },
        resolve,
        reject,
        priority
      };

      const worker = this.getAvailableWorker();
      if (worker) {
        this.executeTask(worker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  async analyzeText(input: string, priority = 3): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `analyze_${Date.now()}_${Math.random()}`,
        type: 'analyze',
        data: { input },
        resolve,
        reject,
        priority
      };

      const worker = this.getAvailableWorker();
      if (worker) {
        this.executeTask(worker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  async processChunk(input: string, chunkIndex: number, totalChunks: number, priority = 4): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `chunk_${chunkIndex}_${Date.now()}`,
        type: 'chunk-process',
        data: { input, chunkIndex, totalChunks },
        resolve,
        reject,
        priority
      };

      const worker = this.getAvailableWorker();
      if (worker) {
        this.executeTask(worker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  // Utility methods
  getStats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      maxWorkers: this.maxWorkers
    };
  }

  terminate() {
    this.workers.forEach(w => w.worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
  }
}

// Global worker manager instance
export const workerManager = new WorkerManager();

// High-level API functions
export async function processTextParallel(input: string, patterns?: string[]): Promise<any> {
  return workerManager.processText(input, patterns, 10); // High priority
}

export async function analyzeTextParallel(input: string): Promise<any> {
  return workerManager.analyzeText(input, 5); // Medium priority
}

export async function processLargeTextParallel(input: string, chunkSize = 1024 * 1024): Promise<any> {
  const chunks = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    chunks.push(input.substring(i, i + chunkSize));
  }

  const totalChunks = chunks.length;
  const promises = chunks.map((chunk, index) => 
    workerManager.processChunk(chunk, index, totalChunks, 7) // High priority for chunks
  );

  const results = await Promise.all(promises);
  
  // Combine chunk results
  const combinedResults = {
    chunks: results,
    totalChunks,
    bestMatches: results.map(r => r.chunkResults).flat().slice(0, 10),
    processingTime: Date.now()
  };

  return combinedResults;
}