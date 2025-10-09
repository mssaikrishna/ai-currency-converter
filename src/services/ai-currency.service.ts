import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiCurrencyService {
  private GEMINI_API_KEY = 'AIzaSyDeKLbDDCYNkzEiM2vNTsaC7PAZlNhiIMM';
  
  // Using ExchangeRate-API - supports 161 currencies, free tier
  private CURRENCY_API_URL = 'https://api.exchangerate-api.com/v4/latest';
  
  private GEMINI_MODEL = 'gemini-2.0-flash';

  constructor(private http: HttpClient) {}

  // Step 1: Use Gemini to interpret user text
  async interpretQuery(query: string): Promise<{ amount: number; from: string; to: string }> {
    const body = {
      contents: [
        {
          parts: [
            {
              text: `Extract currency conversion details from: "${query}"
              
              Extract:
              - amount (number, default: 1)
              - from currency (3-letter ISO code like USD, EUR, INR, GBP, JPY, CAD, AUD, CNY, etc.)
              - to currency (3-letter ISO code)
              
              Common currencies:
              USD (US Dollar), EUR (Euro), GBP (British Pound), JPY (Japanese Yen), 
              INR (Indian Rupee), CAD (Canadian Dollar), AUD (Australian Dollar),
              CHF (Swiss Franc), CNY (Chinese Yuan), SGD (Singapore Dollar),
              NZD (New Zealand Dollar), MXN (Mexican Peso), BRL (Brazilian Real),
              RUB (Russian Ruble), ZAR (South African Rand), AED (UAE Dirham),
              SAR (Saudi Riyal), TRY (Turkish Lira), KRW (South Korean Won)
              
              Respond ONLY with valid JSON:
              { "amount": number, "from": "USD", "to": "INR" }`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 150
      }
    };

    try {
      const res: any = await firstValueFrom(
        this.http.post(
          `https://generativelanguage.googleapis.com/v1/models/${this.GEMINI_MODEL}:generateContent?key=${this.GEMINI_API_KEY}`,
          body
        )
      );

      const text = res?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (!text) {
        throw new Error('No response from Gemini AI');
      }

      const cleanText = text.replace(/```json\s*|\s*```/g, '');
      const parsed = JSON.parse(cleanText);
      
      if (!parsed.from || !parsed.to) {
        throw new Error('Could not detect currencies. Please specify both source and target currencies.');
      }

      return {
        amount: Number(parsed.amount) || 1,
        from: parsed.from.toUpperCase(),
        to: parsed.to.toUpperCase()
      };

    } catch (error) {
      console.error('Error interpreting query:', error);
      throw new Error('Failed to understand your request. Please try: "Convert 100 USD to INR" or "50 euros in Japanese yen"');
    }
  }

  // Step 2: Fetch live conversion from ExchangeRate-API (supports 161 currencies)
  async getConversion(from: string, to: string, amount: number): Promise<{converted: number, rate: number}> {
    try {
      const url = `${this.CURRENCY_API_URL}/${from}`;
      const res: any = await firstValueFrom(this.http.get(url));
      
      console.log('Currency API Response:', res);
      
      if (!res.rates || !res.rates[to]) {
        throw new Error(`Conversion from ${from} to ${to} not supported. Try common currencies like USD, EUR, GBP, JPY, INR, etc.`);
      }
      
      const rate = res.rates[to];
      const converted = amount * rate;
      
      return {
        converted: converted,
        rate: rate
      };
      
    } catch (error: any) {
      console.error('Error converting currency:', error);
      
      if (error.status === 404) {
        throw new Error(`Currency ${from} not found. Please check the currency code.`);
      }
      
      throw new Error(`Failed to convert ${from} to ${to}. Please try again.`);
    }
  }

  // Get popular currencies for display
  getPopularCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD', 'NZD', 'MXN', 'BRL', 'RUB', 'ZAR', 'AED', 'SAR', 'TRY', 'KRW'];
  }
}