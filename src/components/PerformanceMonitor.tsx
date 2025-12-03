import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Database, Zap, Wifi, WifiOff, Signal } from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiCallCount: number;
  cacheHitRate: number;
  memoryUsage: number;
  fps: number;
  networkSpeed: number; // Mbps
  networkType: string;
  effectiveType: string;
  latency: number; // ms
}

const REQUIRED_SPEEDS = {
  minimum: 1, // 1 Mbps minimum
  recommended: 5, // 5 Mbps recommended
  optimal: 25, // 25 Mbps for best experience
};

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    apiCallCount: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    fps: 60,
    networkSpeed: 0,
    networkType: 'unknown',
    effectiveType: 'unknown',
    latency: 0,
  });
  const [isTestingSpeed, setIsTestingSpeed] = useState(false);

  // Test actual download speed
  const testNetworkSpeed = async () => {
    setIsTestingSpeed(true);
    try {
      // Use a small image to test download speed
      const testUrl = 'https://www.google.com/images/phd/px.gif?' + Date.now();
      const startTime = performance.now();
      
      const response = await fetch(testUrl, { 
        method: 'GET',
        cache: 'no-store',
        mode: 'no-cors'
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // Also test with a larger request to Supabase
      const supabaseStart = performance.now();
      await fetch('https://cbfqwaqwliehgxsdueem.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZnF3YXF3bGllaGd4c2R1ZWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI0MDEsImV4cCI6MjA3NTU4ODQwMX0.Ab-UKNlcFFLexH5ABkPaH362niXQo7tJxrjuojaFs0Y'
        }
      });
      const supabaseLatency = performance.now() - supabaseStart;
      
      // Estimate speed based on latency (rough estimate)
      // Lower latency generally means faster connection
      let estimatedSpeed = 0;
      if (latency < 50) estimatedSpeed = 100;
      else if (latency < 100) estimatedSpeed = 50;
      else if (latency < 200) estimatedSpeed = 25;
      else if (latency < 500) estimatedSpeed = 10;
      else if (latency < 1000) estimatedSpeed = 5;
      else estimatedSpeed = 1;
      
      setMetrics(prev => ({
        ...prev,
        latency: Math.round(supabaseLatency),
        networkSpeed: estimatedSpeed,
      }));
    } catch (error) {
      console.error('Speed test failed:', error);
    }
    setIsTestingSpeed(false);
  };

  useEffect(() => {
    // Measure page load time
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      setMetrics(prev => ({
        ...prev,
        pageLoadTime: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
      }));
    }

    // Get network information if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const updateNetworkInfo = () => {
        setMetrics(prev => ({
          ...prev,
          networkType: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          networkSpeed: connection.downlink || 0, // Mbps
        }));
      };
      
      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
    }

    // Initial speed test
    testNetworkSpeed();

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

    return () => {
      observer.disconnect();
      if (connection) {
        connection.removeEventListener('change', () => {});
      }
    };
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

  const getSpeedColor = (speed: number): "default" | "secondary" | "destructive" | "outline" => {
    if (speed >= REQUIRED_SPEEDS.optimal) return 'default';
    if (speed >= REQUIRED_SPEEDS.recommended) return 'secondary';
    return 'destructive';
  };

  const getLatencyColor = (latency: number): "default" | "secondary" | "destructive" | "outline" => {
    if (latency <= 100) return 'default';
    if (latency <= 300) return 'secondary';
    return 'destructive';
  };

  const getSpeedStatus = (speed: number): string => {
    if (speed >= REQUIRED_SPEEDS.optimal) return 'Excellent';
    if (speed >= REQUIRED_SPEEDS.recommended) return 'Good';
    if (speed >= REQUIRED_SPEEDS.minimum) return 'Slow';
    return 'Poor';
  };

  const getEffectiveTypeLabel = (type: string): string => {
    switch (type) {
      case '4g': return '4G/LTE';
      case '3g': return '3G';
      case '2g': return '2G';
      case 'slow-2g': return 'Slow 2G';
      default: return type.toUpperCase();
    }
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
        {/* Network Speed Section */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              <span className="font-semibold">Network Speed</span>
            </div>
            <button 
              onClick={testNetworkSpeed}
              disabled={isTestingSpeed}
              className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
            >
              {isTestingSpeed ? 'Testing...' : 'Retest'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Your Speed</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{metrics.networkSpeed || '—'}</span>
                <span className="text-sm text-muted-foreground">Mbps</span>
              </div>
              <Badge variant={getSpeedColor(metrics.networkSpeed)}>
                {getSpeedStatus(metrics.networkSpeed)}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Latency</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{metrics.latency || '—'}</span>
                <span className="text-sm text-muted-foreground">ms</span>
              </div>
              <Badge variant={getLatencyColor(metrics.latency)}>
                {metrics.latency <= 100 ? 'Fast' : metrics.latency <= 300 ? 'OK' : 'Slow'}
              </Badge>
            </div>
          </div>

          {metrics.effectiveType !== 'unknown' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Signal className="h-4 w-4" />
              <span>Connection: {getEffectiveTypeLabel(metrics.effectiveType)}</span>
            </div>
          )}

          {/* Required Speed Info */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Required Speeds:</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col items-center p-2 bg-destructive/10 rounded">
                <span className="font-semibold text-destructive">{REQUIRED_SPEEDS.minimum} Mbps</span>
                <span className="text-muted-foreground">Minimum</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-yellow-500/10 rounded">
                <span className="font-semibold text-yellow-600">{REQUIRED_SPEEDS.recommended} Mbps</span>
                <span className="text-muted-foreground">Recommended</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-green-500/10 rounded">
                <span className="font-semibold text-green-600">{REQUIRED_SPEEDS.optimal} Mbps</span>
                <span className="text-muted-foreground">Optimal</span>
              </div>
            </div>
          </div>

          {/* Speed Warning */}
          {metrics.networkSpeed > 0 && metrics.networkSpeed < REQUIRED_SPEEDS.recommended && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded text-sm">
              <WifiOff className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span className="text-destructive">
                Your internet speed ({metrics.networkSpeed} Mbps) is below recommended ({REQUIRED_SPEEDS.recommended} Mbps). 
                This may cause slow loading times.
              </span>
            </div>
          )}
        </div>

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
          Target: &lt;1s page load, &lt;5 API calls, &gt;70% cache hits, 60 FPS, &lt;100ms latency
        </div>
      </CardContent>
    </Card>
  );
};
