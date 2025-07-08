import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

interface Investimento {
  nome: string;
  montanteBruto: number;
  montanteLiquido: number;
  rendimentoBruto: number;
  rendimentoLiquido: number;
  impostoValor: number;
}

interface Resultados {
  valorInicial: number;
  periodoMeses: number;
  aliquotaIR: number;
  investimentos: { [key: string]: Investimento };
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatTabsModule,
    MatIconModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  valor: string = '';
  tempo: string = '';
  unidadeTempo: string = 'meses';
  resultados: Resultados | null = null;

  // Taxas atuais - Selic editável
  taxas = {
    cdi: 14.90,
    selic: 15.00,
    ipca: 5.32
  };

  calcularRendimentos() {
    if (!this.valor || !this.tempo) return;

    const valorInicial = parseFloat(this.valor.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
    const periodoMeses = this.unidadeTempo === 'anos' ? parseInt(this.tempo) * 12 : parseInt(this.tempo);
    
    if (isNaN(valorInicial) || isNaN(periodoMeses) || valorInicial <= 0 || periodoMeses <= 0) {
      alert('Por favor, insira valores válidos');
      return;
    }

    // Determinar alíquota de IR baseada no prazo
    let aliquotaIR = 22.5; // até 180 dias
    if (periodoMeses > 6) aliquotaIR = 20; // 181 a 360 dias
    if (periodoMeses > 12) aliquotaIR = 17.5; // 361 a 720 dias
    if (periodoMeses > 24) aliquotaIR = 15; // acima de 720 dias

    // CDB 100% CDI
    const cdb100 = this.calcularJurosCompostos(valorInicial, this.taxas.cdi, periodoMeses, aliquotaIR);
    
    // CDB 110% CDI
    const cdb110 = this.calcularJurosCompostos(valorInicial, this.taxas.cdi * 1.1, periodoMeses, aliquotaIR);
    
    // CDB 120% CDI
    const cdb120 = this.calcularJurosCompostos(valorInicial, this.taxas.cdi * 1.2, periodoMeses, aliquotaIR);

    // LCA/LCI 85% CDI (isentos de IR)
    const lca85 = this.calcularJurosCompostos(valorInicial, this.taxas.cdi * 0.85, periodoMeses, 0);
    
    // LCA/LCI 90% CDI (isentos de IR)
    const lca90 = this.calcularJurosCompostos(valorInicial, this.taxas.cdi * 0.9, periodoMeses, 0);

    // Tesouro Selic (taxa de custódia 0.2% ao ano)
    const tesouroSelic = this.calcularJurosCompostos(valorInicial, this.taxas.selic - 0.2, periodoMeses, aliquotaIR);
    
    // Tesouro IPCA+ (exemplo: IPCA + 6%)
    const tesouroIPCA = this.calcularJurosCompostos(valorInicial, this.taxas.ipca + 6, periodoMeses, aliquotaIR);

    // Poupança (70% da Selic quando Selic > 8.5%)
    const poupanca = this.calcularJurosCompostos(valorInicial, this.taxas.selic * 0.7, periodoMeses, 0);

    this.resultados = {
      valorInicial,
      periodoMeses,
      aliquotaIR,
      investimentos: {
        cdb120: { nome: 'CDB 120% CDI', ...cdb120 },
        cdb110: { nome: 'CDB 110% CDI', ...cdb110 },
        cdb100: { nome: 'CDB 100% CDI', ...cdb100 },
        lca90: { nome: 'LCA/LCI 90% CDI', ...lca90 },
        lca85: { nome: 'LCA/LCI 85% CDI', ...lca85 },
        tesouroSelic: { nome: 'Tesouro Selic', ...tesouroSelic },
        tesouroIPCA: { nome: 'Tesouro IPCA+ 6%', ...tesouroIPCA },
        poupanca: { nome: 'Poupança', ...poupanca }
      }
    };
  }

  private calcularJurosCompostos(principal: number, taxaAnual: number, meses: number, impostoIR: number = 0) {
    const taxaMensal = taxaAnual / 100 / 12;
    const montante = principal * Math.pow(1 + taxaMensal, meses);
    const rendimentoBruto = montante - principal;
    const impostoValor = rendimentoBruto * (impostoIR / 100);
    const rendimentoLiquido = rendimentoBruto - impostoValor;
    const montanteLiquido = principal + rendimentoLiquido;
    
    return {
      montanteBruto: montante,
      montanteLiquido,
      rendimentoBruto,
      rendimentoLiquido,
      impostoValor
    };
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  formatarPercentual(valor: number): string {
    return `${valor.toFixed(2)}%`;
  }

  getInvestimentosOrdenados() {
    if (!this.resultados) return [];
    
    return Object.entries(this.resultados.investimentos)
      .sort((a, b) => b[1].montanteLiquido - a[1].montanteLiquido)
      .map(([key, inv]) => ({ key, ...inv }));
  }
}

