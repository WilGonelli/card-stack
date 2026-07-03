class CartaDeJogo {
  // 1. Atributos (O que a carta tem?)
  naipe: string;
  valor: string;

  // 2. O Construtor (A receita de como criar a carta)
  constructor(naipeInformado: string, valorInformado: string) {
    this.naipe = naipeInformado;
    this.valor = valorInformado;
  }

  // 3. Métodos (O que a carta faz ou como ela se exibe?)
  exibir(): string {
    return `${this.valor} de ${this.naipe}`;
  }
}