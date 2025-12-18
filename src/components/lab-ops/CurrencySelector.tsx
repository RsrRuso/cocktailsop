import { useCurrency, CURRENCIES, CurrencyInfo } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CurrencySelectorProps {
  compact?: boolean;
  className?: string;
}

export function CurrencySelector({ compact = false, className }: CurrencySelectorProps) {
  const { currency, setCurrency, currencies } = useCurrency();

  // Group currencies by region
  const gulfCurrencies = currencies.filter(c => 
    ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'].includes(c.code)
  );
  const majorCurrencies = currencies.filter(c => 
    ['USD', 'EUR', 'GBP'].includes(c.code)
  );
  const asiaCurrencies = currencies.filter(c => 
    ['INR', 'JPY', 'CNY', 'SGD', 'HKD', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'KRW'].includes(c.code)
  );
  const otherCurrencies = currencies.filter(c => 
    !gulfCurrencies.includes(c) && 
    !majorCurrencies.includes(c) && 
    !asiaCurrencies.includes(c)
  );

  const renderCurrencyItem = (c: CurrencyInfo) => (
    <DropdownMenuItem
      key={c.code}
      onClick={() => setCurrency(c)}
      className="flex items-center justify-between gap-2 cursor-pointer"
    >
      <span className="flex items-center gap-2">
        <span className="w-6 text-center font-medium">{c.symbol}</span>
        <span>{c.code}</span>
        {!compact && <span className="text-muted-foreground text-xs">({c.name})</span>}
      </span>
      {currency.code === c.code && <Check className="h-4 w-4 text-primary" />}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={compact ? "sm" : "default"}
          className={`gap-1 ${className}`}
        >
          <span className="font-medium">{currency.symbol}</span>
          <span>{currency.code}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ScrollArea className="h-80">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Major Currencies
          </DropdownMenuLabel>
          {majorCurrencies.map(renderCurrencyItem)}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Gulf Region
          </DropdownMenuLabel>
          {gulfCurrencies.map(renderCurrencyItem)}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Asia Pacific
          </DropdownMenuLabel>
          {asiaCurrencies.map(renderCurrencyItem)}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Other Currencies
          </DropdownMenuLabel>
          {otherCurrencies.map(renderCurrencyItem)}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
