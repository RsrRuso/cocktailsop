import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  locale: string;
  name: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', locale: 'ar-AE', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', locale: 'ar-SA', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'ر.ق', locale: 'ar-QA', name: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'د.ك', locale: 'ar-KW', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: '.د.ب', locale: 'ar-BH', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'ر.ع.', locale: 'ar-OM', name: 'Omani Rial' },
  { code: 'INR', symbol: '₹', locale: 'en-IN', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', locale: 'zh-CN', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', locale: 'en-AU', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', locale: 'en-CA', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', locale: 'de-CH', name: 'Swiss Franc' },
  { code: 'SGD', symbol: 'S$', locale: 'en-SG', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', locale: 'zh-HK', name: 'Hong Kong Dollar' },
  { code: 'THB', symbol: '฿', locale: 'th-TH', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', locale: 'ms-MY', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', locale: 'en-PH', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', locale: 'id-ID', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫', locale: 'vi-VN', name: 'Vietnamese Dong' },
  { code: 'KRW', symbol: '₩', locale: 'ko-KR', name: 'South Korean Won' },
  { code: 'TRY', symbol: '₺', locale: 'tr-TR', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', locale: 'ru-RU', name: 'Russian Ruble' },
  { code: 'ZAR', symbol: 'R', locale: 'en-ZA', name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', locale: 'pt-BR', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', locale: 'es-MX', name: 'Mexican Peso' },
  { code: 'EGP', symbol: 'E£', locale: 'ar-EG', name: 'Egyptian Pound' },
  { code: 'NGN', symbol: '₦', locale: 'en-NG', name: 'Nigerian Naira' },
];

// Map timezone to currency (best effort detection)
const TIMEZONE_CURRENCY_MAP: Record<string, string> = {
  'America/New_York': 'USD',
  'America/Los_Angeles': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'Europe/London': 'GBP',
  'Europe/Paris': 'EUR',
  'Europe/Berlin': 'EUR',
  'Europe/Rome': 'EUR',
  'Europe/Madrid': 'EUR',
  'Europe/Amsterdam': 'EUR',
  'Asia/Dubai': 'AED',
  'Asia/Abu_Dhabi': 'AED',
  'Asia/Riyadh': 'SAR',
  'Asia/Qatar': 'QAR',
  'Asia/Kuwait': 'KWD',
  'Asia/Bahrain': 'BHD',
  'Asia/Muscat': 'OMR',
  'Asia/Kolkata': 'INR',
  'Asia/Tokyo': 'JPY',
  'Asia/Shanghai': 'CNY',
  'Asia/Hong_Kong': 'HKD',
  'Asia/Singapore': 'SGD',
  'Asia/Bangkok': 'THB',
  'Asia/Kuala_Lumpur': 'MYR',
  'Asia/Manila': 'PHP',
  'Asia/Jakarta': 'IDR',
  'Asia/Ho_Chi_Minh': 'VND',
  'Asia/Seoul': 'KRW',
  'Europe/Istanbul': 'TRY',
  'Europe/Moscow': 'RUB',
  'Africa/Johannesburg': 'ZAR',
  'America/Sao_Paulo': 'BRL',
  'America/Mexico_City': 'MXN',
  'Africa/Cairo': 'EGP',
  'Africa/Lagos': 'NGN',
  'Australia/Sydney': 'AUD',
  'Australia/Melbourne': 'AUD',
  'America/Toronto': 'CAD',
  'Europe/Zurich': 'CHF',
};

interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrency: (currency: CurrencyInfo) => void;
  formatPrice: (amount: number) => string;
  currencies: CurrencyInfo[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const detectUserCurrency = (): CurrencyInfo => {
  try {
    // Try to detect from timezone first
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneCode = TIMEZONE_CURRENCY_MAP[timezone];
    
    if (timezoneCode) {
      const found = CURRENCIES.find(c => c.code === timezoneCode);
      if (found) return found;
    }

    // Fallback: try to detect from browser locale
    const locale = navigator.language || 'en-US';
    
    // Map common locales to currencies
    if (locale.startsWith('en-US')) return CURRENCIES.find(c => c.code === 'USD')!;
    if (locale.startsWith('en-GB')) return CURRENCIES.find(c => c.code === 'GBP')!;
    if (locale.startsWith('ar-AE')) return CURRENCIES.find(c => c.code === 'AED')!;
    if (locale.startsWith('ar-SA')) return CURRENCIES.find(c => c.code === 'SAR')!;
    if (locale.startsWith('ar-QA')) return CURRENCIES.find(c => c.code === 'QAR')!;
    if (locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('it') || locale.startsWith('es')) {
      return CURRENCIES.find(c => c.code === 'EUR')!;
    }
    if (locale.startsWith('ja')) return CURRENCIES.find(c => c.code === 'JPY')!;
    if (locale.startsWith('zh')) return CURRENCIES.find(c => c.code === 'CNY')!;
    if (locale.startsWith('hi') || locale.startsWith('en-IN')) return CURRENCIES.find(c => c.code === 'INR')!;
    
  } catch (error) {
    console.log('Currency detection error:', error);
  }
  
  // Default to AED (UAE Dirham) for LAB Ops
  return CURRENCIES.find(c => c.code === 'AED')!;
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyInfo>(() => {
    // Try to load from localStorage first (v2 key for new default)
    const saved = localStorage.getItem('labops-currency-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const found = CURRENCIES.find(c => c.code === parsed.code);
        if (found) return found;
      } catch {}
    }
    // Detect from user region or default to AED
    return detectUserCurrency();
  });

  const setCurrency = (newCurrency: CurrencyInfo) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('labops-currency-v2', JSON.stringify(newCurrency));
  };

  const formatPrice = (amount: number): string => {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency.symbol}${amount.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatPrice, 
      currencies: CURRENCIES 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
