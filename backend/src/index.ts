import { startCards, CARDS_COMPLETE } from "./core/domain/Cards.js";
const game = () => {
  startCards();
  // A função puxarCarta pode ficar fora do loop
  const puxarCarta = () => {
    const index = Math.floor(Math.random() * CARDS_COMPLETE.length);
    return CARDS_COMPLETE.splice(index, 1)[0];
  };

  // Enquanto houver cartas no baralho, o loop continua
  while (CARDS_COMPLETE.length > 0) {
    console.log("Cartas restantes antes do sorteio:", CARDS_COMPLETE.length);

    const cartaPuxada = puxarCarta();
    console.log("Carta puxada:", cartaPuxada);

    console.log("-------------------");
  }
};

game();
