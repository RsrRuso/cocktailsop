import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Database, Zap, Wifi, WifiOff } from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiCallCount: number;
  cacheHitRate: number;
  fps: number;
  networkSpeed: number;
  latency: number;
}

const REQUIRED_SPEEDS = {
  minimum: 1,
  recommended: 5,
  optimal: 25,
};

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    apiCallCount: 0,
    cacheHitRate: 0,
    fps: 60,
    networkSpeed: 0,
    latency: 0,
  });
  const [isTestingSpeed, setIsTestingSpeed] = useState(false);

  const testNetworkSpeed = async () => {
    setIsTestingSpeed(true);
    try {
      const testUrl = 'https://www.google.com/images/phd/px.gif?' + Date.now();
      const startTime = performance.now();
      
      await fetch(testUrl, { method: 'GET', cache: 'no-store', mode: 'no-cors' });
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      const supabaseStart = performance.now();
      await fetch('https://cbfqwaqwliehgxsdueem.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZnF3YXF3bGllaGd4c2R1ZWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTI0MDEsImV4cCI6MjA3NTU4ODQwMX0.Ab-UKNlcFFLexH5ABkPaH362niXQo7tJxrjuojaFs0Y'
        }
      });
      const supabaseLatency = performance.now() - supabaseStart;
      
      let estimatedSpeed = 0;
      if (latency < 50) estimatedSpeed = 100;
      else if (latency < 100) estimatedSpeed = 50;
      else if (latency < 200) estimatedSpeed = 25;
      else if (latency < 500) estimatedSpeed = 10;
      else if (latency < 1000) estimatedSpeed = 5;
      else estimatedSpeed = 1;
      
      setMetrics(prev => ({ ...prev, latency: Math.round(supabaseLatency), networkSpeed: estimatedSpeed }));
    } catch (error) {
      console.error('Speed test failed:', error);
    }
    setIsTestingSpeed(false);
  };

  useEffect(() => {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      setMetrics(prev => ({ ...prev, pageLoadTime: navigationTiming.loadEventEnd - navigationTiming.fetchStart }));
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      setMetrics(prev => ({ ...prev, networkSpeed: connection.downlink || 0 }));
    }

    testNetworkSpeed();

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const apiCalls = entries.filter(entry => 
        entry.name.includes('supabase.co') || entry.name.includes('/rest/v1') || entry.name.includes('/auth/v1')
      );
      setMetrics(prev => ({ ...prev, apiCallCount: prev.apiCallCount + apiCalls.length }));
    });
    observer.observe({ entryTypes: ['resource'] });

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

  const getSpeedColor = (speed: number): "default" | "secondary" | "destructive" => {
    if (speed >= REQUIRED_SPEEDS.optimal) return 'default';
    if (speed >= REQUIRED_SPEEDS.recommended) return 'secondary';
    return 'destructive';
  };

  const getLatencyColor = (latency: number): "default" | "secondary" | "destructive" => {
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

  return (
    <div className="space-y-2">
      {/* Network Speed - Compact */}
      <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Network</span>
          </div>
          <button 
            onClick={testNetworkSpeed}
            disabled={isTestingSpeed}
            className="text-[10px] px-1.5 py-0.5 bg-primary/10 hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
          >
            {isTestingSpeed ? '...' : 'Test'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold">{metrics.networkSpeed || '—'}</span>
              <span className="text-[10px] text-muted-foreground">Mbps</span>
            </div>
            <Badge variant={getSpeedColor(metrics.networkSpeed)} className="text-[9px] px-1 py-0 h-4">
              {getSpeedStatus(metrics.networkSpeed)}
            </Badge>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold">{metrics.latency || '—'}</span>
              <span className="text-[10px] text-muted-foreground">ms</span>
            </div>
            <Badge variant={getLatencyColor(metrics.latency)} className="text-[9px] px-1 py-0 h-4">
              {metrics.latency <= 100 ? 'Fast' : metrics.latency <= 300 ? 'OK' : 'Slow'}
            </Badge>
          </div>
        </div>

        {metrics.networkSpeed > 0 && metrics.networkSpeed < REQUIRED_SPEEDS.recommended && (
          <div className="flex items-center gap-1.5 mt-2 p-1.5 bg-destructive/10 rounded text-[10px] text-destructive">
            <WifiOff className="h-3 w-3 flex-shrink-0" />
            <span>Slow connection detected</span>
          </div>
        )}
      </div>

      {/* Metrics Grid - Compact */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="p-2 bg-muted/50 rounded-lg text-center">
          <Clock className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
          <div className="text-xs font-bold">{(metrics.pageLoadTime / 1000).toFixed(1)}s</div>
          <div className="text-[9px] text-muted-foreground">Load</div>
        </div>
        <div className="p-2 bg-muted/50 rounded-lg text-center">
          <Database className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
          <div className="text-xs font-bold">{metrics.apiCallCount}</div>
          <div className="text-[9px] text-muted-foreground">API</div>
        </div>
        <div className="p-2 bg-muted/50 rounded-lg text-center">
          <Zap className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
          <div className="text-xs font-bold">{metrics.cacheHitRate}%</div>
          <div className="text-[9px] text-muted-foreground">Cache</div>
        </div>
        <div className="p-2 bg-muted/50 rounded-lg text-center">
          <Activity className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
          <div className="text-xs font-bold">{metrics.fps}</div>
          <div className="text-[9px] text-muted-foreground">FPS</div>
        </div>
      </div>
    </div>
  );
};
