import { useState } from 'react';
import { Calendar, Clock, DollarSign, Target, ChevronRight, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CampaignScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: number;
  predictedReach: number;
  strategy?: string;
}

export const CampaignScheduleDialog = ({
  open,
  onOpenChange,
  budget,
  predictedReach,
  strategy = 'Lookalike Audience',
}: CampaignScheduleDialogProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState([7]);
  const [targetAudience, setTargetAudience] = useState('all');

  const totalCost = budget * duration[0];

  const handleNext = () => {
    if (step === 1 && !campaignName) {
      toast.error('Please enter a campaign name');
      return;
    }
    if (step === 2 && !startDate) {
      toast.error('Please select a start date');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePayment = () => {
    // Store campaign data in sessionStorage for payment page
    sessionStorage.setItem('campaign_data', JSON.stringify({
      name: campaignName,
      startDate,
      duration: duration[0],
      budget,
      totalCost,
      strategy,
      targetAudience,
      predictedReach,
    }));
    
    onOpenChange(false);
    toast.success('Redirecting to payment...');
    navigate('/campaign-payment');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Campaign Name</Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="My Awesome Campaign"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Target Audience</Label>
              <div className="grid grid-cols-2 gap-2">
                {['all', 'followers', 'lookalike', 'custom'].map((audience) => (
                  <button
                    key={audience}
                    onClick={() => setTargetAudience(audience)}
                    className={`p-3 rounded-lg text-sm capitalize transition-all ${
                      targetAudience === audience
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {audience === 'all' ? 'Everyone' : audience}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Target className="w-4 h-4" />
                <span>Strategy: {strategy}</span>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white">Duration</Label>
                <span className="text-primary font-semibold">{duration[0]} days</span>
              </div>
              <Slider
                value={duration}
                onValueChange={setDuration}
                min={1}
                max={30}
                step={1}
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>1 day</span>
                <span>30 days</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                  <Calendar className="w-3 h-3" />
                  <span>End Date</span>
                </div>
                <div className="text-white font-medium text-sm">
                  {startDate ? new Date(new Date(startDate).getTime() + duration[0] * 24 * 60 * 60 * 1000).toLocaleDateString() : '-'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                  <Clock className="w-3 h-3" />
                  <span>Est. Reach</span>
                </div>
                <div className="text-white font-medium text-sm">
                  {(predictedReach * duration[0] / 7).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-pink-500/20 border border-white/10">
              <h4 className="text-white font-semibold mb-3">Campaign Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Name</span>
                  <span className="text-white">{campaignName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Strategy</span>
                  <span className="text-white">{strategy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Audience</span>
                  <span className="text-white capitalize">{targetAudience === 'all' ? 'Everyone' : targetAudience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Start</span>
                  <span className="text-white">{new Date(startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Duration</span>
                  <span className="text-white">{duration[0]} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Daily Budget</span>
                  <span className="text-white">${budget}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="text-white font-semibold">Total Cost</span>
                </div>
                <span className="text-2xl font-bold text-green-500">${totalCost}</span>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 z-50">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  s <= step ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/40'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 ${s < step ? 'bg-primary' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Title */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">
              {step === 1 && 'Campaign Setup'}
              {step === 2 && 'Schedule'}
              {step === 3 && 'Review & Pay'}
            </h3>
            <p className="text-sm text-white/60">
              {step === 1 && 'Configure your campaign details'}
              {step === 2 && 'Choose when to run your campaign'}
              {step === 3 && 'Review and proceed to payment'}
            </p>
          </div>

          {/* Content */}
          {renderStep()}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handlePayment}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay ${totalCost}
              </Button>
            )}
          </div>

          <DialogPrimitive.Close className="absolute top-4 right-4 text-white/60 hover:text-white">
            ✕
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};