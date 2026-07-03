export const CARDS_COMPLETE: Card[] = [];

class Card {
  id: number;
  value: string;
  constructor(id: number, value: string) {
    ((this.id = id), (this.value = value));
  }
}

export const startCards = (): void => {
  CARDS_COMPLETE.push(new Card(0, "0"));
  CARDS_COMPLETE.push(new Card(1, "1"));
  for (let i = 2; i < 4; i++) {
    CARDS_COMPLETE.push(new Card(i, "2"));
  }
  for (let i = 4; i < 7; i++) {
    CARDS_COMPLETE.push(new Card(i, "3"));
  }
  for (let i = 7; i < 11; i++) {
    CARDS_COMPLETE.push(new Card(i, "4"));
  }
  for (let i = 11; i < 16; i++) {
    CARDS_COMPLETE.push(new Card(i, "5"));
  }
  for (let i = 16; i < 22; i++) {
    CARDS_COMPLETE.push(new Card(i, "6"));
  }
  for (let i = 22; i < 29; i++) {
    CARDS_COMPLETE.push(new Card(i, "7"));
  }
  for (let i = 29; i < 37; i++) {
    CARDS_COMPLETE.push(new Card(i, "8"));
  }
  for (let i = 37; i < 46; i++) {
    CARDS_COMPLETE.push(new Card(i, "9"));
  }
  for (let i = 46; i < 56; i++) {
    CARDS_COMPLETE.push(new Card(i, "10"));
  }
  for (let i = 56; i < 67; i++) {
    CARDS_COMPLETE.push(new Card(i, "11"));
  }
  for (let i = 67; i < 79; i++) {
    CARDS_COMPLETE.push(new Card(i, "12"));
  }
  for (let i = 79; i < 83; i++) {
    CARDS_COMPLETE.push(new Card(i, "freeze"));
  }
  for (let i = 83; i < 85; i++) {
    CARDS_COMPLETE.push(new Card(i, "extra heart"));
  }
  for (let i = 85; i < 88; i++) {
    CARDS_COMPLETE.push(new Card(i, "flip three"));
  }
  for (let i = 88; i < 90; i++) {
    CARDS_COMPLETE.push(new Card(i, "+2"));
  }
  for (let i = 90; i < 92; i++) {
    CARDS_COMPLETE.push(new Card(i, "+4"));
  }
  for (let i = 92; i < 94; i++) {
    CARDS_COMPLETE.push(new Card(i, "+6"));
  }
  for (let i = 94; i < 96; i++) {
    CARDS_COMPLETE.push(new Card(i, "+8"));
  }
  for (let i = 96; i < 98; i++) {
    CARDS_COMPLETE.push(new Card(i, "+10"));
  }
  for (let i = 98; i < 100; i++) {
    CARDS_COMPLETE.push(new Card(i, "X2"));
  }
};
