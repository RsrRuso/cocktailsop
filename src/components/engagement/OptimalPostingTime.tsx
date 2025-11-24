import { Clock, TrendingUp, Users, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const OptimalPostingTime = () => {
  const timeSlots = [
    { time: '9:00 AM', score: 75, audience: 1200, day: 'Today' },
    { time: '12:00 PM', score: 92, audience: 2500, day: 'Today', recommended: true },
    { time: '6:00 PM', score: 88, audience: 3200, day: 'Today' },
    { time: '9:00 PM', score: 95, audience: 4100, day: 'Today', recommended: true },
    { time: '12:00 PM', score: 90, audience: 2800, day: 'Tomorrow' },
    { time: '7:00 PM', score: 93, audience: 3500, day: 'Tomorrow', recommended: true },
  ];

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-foreground">Best Times to Post</h3>
        <Badge variant="secondary" className="ml-auto">AI Prediction</Badge>
      </div>

      <div className="space-y-2">
        {timeSlots.map((slot, index) => (
          <motion.div
            key={`${slot.day}-${slot.time}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`p-3 ${
                slot.recommended
                  ? 'bg-primary/10 border-primary/50'
                  : 'bg-card/30'
              } transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-foreground">
                    {slot.day} at {slot.time}
                  </span>
                  {slot.recommended && (
                    <Badge variant="default" className="h-5 text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Best
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {slot.score}% Score
                </span>
              </div>

              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{slot.audience.toLocaleString()} active</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>High engagement</span>
                </div>
              </div>

              <Progress value={slot.score} className="h-1" />
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border/50">
        <p className="text-xs text-muted-foreground">
          💡 <span className="font-semibold text-foreground">Pro Tip:</span> Your audience is most active
          between 6 PM - 10 PM. Schedule posts during these peak hours for maximum reach.
        </p>
      </div>
    </Card>
  );
};
