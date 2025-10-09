import { Component } from '@angular/core';
import { AiCurrencyService } from '../../services/ai-currency.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-converter',
  templateUrl: './converter.component.html',
  imports: [FormsModule, CommonModule],
  styleUrls: ['./converter.component.css']
})
export class ConverterComponent {
  userQuery = '';
  result = '';
  detailedResult = '';
  error = '';
  loading = false;
  popularCurrencies: string[] = [];
  
  examples = [
    'Convert 100 USD to INR',
    '50 euros in Japanese yen',
    '1000 GBP to Canadian dollars',
    '25 Australian dollars in Indian rupees',
    '5000 Japanese yen to US dollars',
    '75 Swiss francs in euros',
    '1000 Chinese yuan to US dollars'
  ];

  constructor(private aiService: AiCurrencyService) {
    this.popularCurrencies = this.aiService.getPopularCurrencies();
  }

  async handleConvert() {
    this.result = '';
    this.detailedResult = '';
    this.error = '';
    this.loading = true;

    try {
      const parsed = await this.aiService.interpretQuery(this.userQuery);
      const conversion = await this.aiService.getConversion(parsed.from, parsed.to, parsed.amount);

      this.result = `${parsed.amount} ${parsed.from} = ${conversion.converted.toFixed(2)} ${parsed.to}`;
      this.detailedResult = `Exchange rate: 1 ${parsed.from} = ${conversion.rate.toFixed(4)} ${parsed.to}`;
      
    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'Sorry, something went wrong. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async convertToMultiple(currency: string) {
    if (!this.userQuery.trim()) return;
    
    this.error = '';
    this.loading = true;

    try {
      const parsed = await this.aiService.interpretQuery(this.userQuery);
      const conversion = await this.aiService.getConversion(parsed.from, currency, parsed.amount);

      this.result = `${parsed.amount} ${parsed.from} = ${conversion.converted.toFixed(2)} ${currency}`;
      this.detailedResult = `Exchange rate: 1 ${parsed.from} = ${conversion.rate.toFixed(4)} ${currency}`;
      
    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'Failed to convert currency.';
    } finally {
      this.loading = false;
    }
  }

  useExample(example: string) {
    this.userQuery = example;
    this.result = '';
    this.detailedResult = '';
    this.error = '';
  }

  quickConvert(amount: number, from: string, to: string) {
    this.userQuery = `Convert ${amount} ${from} to ${to}`;
    this.handleConvert();
  }
}