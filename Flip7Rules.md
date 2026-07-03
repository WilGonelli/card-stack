## jogo flip 7

* total de cartas:1X0, 1X1, 2X2, 3X3, ...., 12X12 = 79

* cartas especiais: 2X vida extra, 3X flip three, 4X freeze, 2X 2+, 2X 4+, 2X 6+, 2X 8+, 2X 10+, 2X 2X = 21

    * vida extra você tem uma chance extra na rodada
    * flip trhee você pode virar 3 cartas seguidas para você ou para outro jogador, caso não tenha mais jogador as cartas é virada para você
    * freeze você pode anular um jogador na rodada, caso não tenha mais jogador, você se anula

* cada jogador pega uma carta por turno, caso a carta tirada seja repetida o jogador perde a rodada, a menos que tenha uma carta vida extra
* ao atinjir um total de 7 cartas de numero a rodada é parada e contabilizado os pontos
* vence quem fizer 200 pontos ou mais primeiro

## fluxo

* criar sessao com codigo de acesso para ate 8 players, cada um com seu nome
* todos da ok para iniciar
* rodada começa sorteando uma carta para cada jogador
* a partir da segunda rodada o jogador descide se quer mais carta
* metodos de perder a rodada:
    * jogador tirar 2 cartas iguais(com mesmo valor numerico)
    * jogador receber uma carta freeze
* metodos para ganhar a rodada:
    * jogador descide nao receber mais cartas
    * jogador atinge um total de 7 cartas numericas
* rodada acaba quando todos jogadores sao eliminados ou descidem parar ou quando um jogador atinge um total de 7 cartas numeradas
* as cartas sorteadas nas primeiras rodadas sao deixadas de lado e reembaralhadas para voltar ao jogo quando o total de cartas atingir 80% do monte

### logica inicial

* criar um array com as cartas do jogo
```ts
const baralho = [
  { id: 0, valor: "0" },
  { id: 1, valor: "1" },
  { id: 2, valor: "2" },
  { id: 3, valor: "2" },
  { id: 4, valor: "3" },
  { id: 5, valor: "3" },
  { id: 6, valor: "3" },
  // ...
];
```

* cria uma logica para sortear um numero random de 0 a 100(numero de cartas)
```ts
const randomCarta = () => {
  const index = Math.floor(Math.random() * baralho.length);
  return baralho[index];
};

console.log(randomCarta());

const puxarCarta = () => {
  const index = Math.floor(Math.random() * baralho.length);
  const carta = baralho.splice(index, 1)[0]; // remove e retorna
  return carta;
};

console.log(puxarCarta());
console.log(baralho.length); // diminui a cada sorteio

if (baralho.length === 20) {
  baralho = embaralhar(baralho); // usa Fisher-Yates
}
```