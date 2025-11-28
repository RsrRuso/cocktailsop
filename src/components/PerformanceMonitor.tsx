import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Database, Zap } from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiCallCount: number;
  cacheHitRate: number;
  memoryUsage: number;
  fps: number;
}

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    apiCallCount: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    fps: 60,
  });

  useEffect(() => {
    // Measure page load time
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      setMetrics(prev => ({
        ...prev,
        pageLoadTime: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
      }));
    }

    // Monitor API calls
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const apiCalls = entries.filter(entry => 
        entry.name.includes('supabase.co') || 
        entry.name.includes('/rest/v1') ||
        entry.name.includes('/auth/v1')
      );
      
      setMetrics(prev => ({
        ...prev,
        apiCallCount: prev.apiCallCount + apiCalls.length,
      }));
    });

    observer.observe({ entryTypes: ['resource'] });

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usageMB = memory.usedJSHeapSize / 1048576;
      setMetrics(prev => ({ ...prev, memoryUsage: Math.round(usageMB) }));
    }

    // Monitor FPS
    let lastTime = performance.now();
    let frames = 0;
    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      if (currentTime >= lastTime + 1000) {
        setMetrics(prev => ({ ...prev, fps: Math.round((frames * 1000) / (currentTime - lastTime)) }));
        frames = 0;
        lastTime = currentTime;
      }
      requestAnimationFrame(measureFPS);
    };
    requestAnimationFrame(measureFPS);

    // Calculate cache hit rate from React Query
    const cacheHits = sessionStorage.getItem('cache_hits') || '0';
    const cacheMisses = sessionStorage.getItem('cache_misses') || '0';
    const hits = parseInt(cacheHits);
    const misses = parseInt(cacheMisses);
    const total = hits + misses;
    if (total > 0) {
      setMetrics(prev => ({ ...prev, cacheHitRate: Math.round((hits / total) * 100) }));
    }

    return () => observer.disconnect();
  }, []);

  const getPerformanceColor = (value: number, thresholds: { good: number; ok: number }): "default" | "secondary" | "destructive" | "outline" => {
    if (value <= thresholds.good) return 'default';
    if (value <= thresholds.ok) return 'secondary';
    return 'destructive';
  };

  const getFPSColor = (fps: number): "default" | "secondary" | "destructive" | "outline" => {
    if (fps >= 55) return 'default';
    if (fps >= 30) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Monitor
        </CardTitle>
        <CardDescription>Real-time app performance metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Page Load</div>
              <div className="text-2xl font-bold">{isNaN(metrics.pageLoadTime) ? '0.00' : (metrics.pageLoadTime / 1000).toFixed(2)}s</div>
              <Badge variant={getPerformanceColor(metrics.pageLoadTime, { good: 1000, ok: 3000 })}>
                {metrics.pageLoadTime < 1000 ? 'Excellent' : metrics.pageLoadTime < 3000 ? 'Good' : 'Slow'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">API Calls</div>
              <div className="text-2xl font-bold">{isNaN(metrics.apiCallCount) ? 0 : metrics.apiCallCount}</div>
              <Badge variant={getPerformanceColor(metrics.apiCallCount, { good: 5, ok: 10 })}>
                {metrics.apiCallCount <= 5 ? 'Optimal' : metrics.apiCallCount <= 10 ? 'Good' : 'High'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
              <div className="text-2xl font-bold">{isNaN(metrics.cacheHitRate) ? 0 : metrics.cacheHitRate}%</div>
              <Badge variant={metrics.cacheHitRate >= 70 ? 'default' : metrics.cacheHitRate >= 40 ? 'secondary' : 'destructive'}>
                {metrics.cacheHitRate >= 70 ? 'Excellent' : metrics.cacheHitRate >= 40 ? 'Good' : 'Poor'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">FPS</div>
              <div className="text-2xl font-bold">{isNaN(metrics.fps) ? 0 : metrics.fps}</div>
              <Badge variant={getFPSColor(metrics.fps)}>
                {metrics.fps >= 55 ? 'Smooth' : metrics.fps >= 30 ? 'Acceptable' : 'Laggy'}
              </Badge>
            </div>
          </div>
        </div>

        {metrics.memoryUsage > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Memory Usage</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics.memoryUsage}</span>
              <span className="text-sm text-muted-foreground">MB</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Target: &lt;1s page load, &lt;5 API calls, &gt;70% cache hits, 60 FPS
        </div>
      </CardContent>
    </Card>
  );
};
