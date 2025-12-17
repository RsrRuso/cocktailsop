import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Shield, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface CampaignData {
  name: string;
  startDate: string;
  duration: number;
  budget: number;
  totalCost: number;
  strategy: string;
  targetAudience: string;
  predictedReach: number;
}

const CampaignPayment = () => {
  const navigate = useNavigate();
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const data = sessionStorage.getItem('campaign_data');
    if (data) {
      setCampaignData(JSON.parse(data));
    } else {
      toast.error('No campaign data found');
      navigate('/');
    }
  }, [navigate]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handlePayment = async () => {
    if (!cardNumber || !expiry || !cvv || !name) {
      toast.error('Please fill in all payment details');
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success('Payment successful! Campaign scheduled.');
    sessionStorage.removeItem('campaign_data');
    navigate('/');
    
    setIsProcessing(false);
  };

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Complete Payment</h1>
        </div>

        {/* Campaign Summary */}
        <Card className="p-4 mb-6 bg-card/50">
          <h3 className="font-semibold mb-3">Campaign Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Campaign</span>
              <span>{campaignData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Strategy</span>
              <span>{campaignData.strategy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>{campaignData.duration} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Budget</span>
              <span>${campaignData.budget}</span>
            </div>
            <div className="border-t border-border my-2 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">${campaignData.totalCost}</span>
            </div>
          </div>
        </Card>

        {/* Payment Form */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Payment Details</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cardholder Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label>Card Number</Label>
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4242 4242 4242 4242"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiry</Label>
                <Input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label>CVV</Label>
                <Input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="123"
                  type="password"
                  maxLength={3}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
          <Shield className="w-4 h-4 text-green-500" />
          <span>Secured by SSL encryption</span>
        </div>

        {/* Pay Button */}
        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 text-lg font-semibold"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </div>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Pay ${campaignData.totalCost}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CampaignPayment;