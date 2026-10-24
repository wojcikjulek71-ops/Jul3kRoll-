"use strict";

const SUITS = [
    { symbol: "♠", color: "black" },
    { symbol: "♥", color: "red" },
    { symbol: "♦", color: "red" },
    { symbol: "♣", color: "black" }
];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const betInput = document.getElementById("blackjack-bet");
const dealButton = document.getElementById("deal-blackjack");
const hitButton = document.getElementById("hit-blackjack");
const standButton = document.getElementById("stand-blackjack");
const dealerCardsDisplay = document.getElementById("dealer-cards");
const playerHandsDisplay = document.getElementById("player-hands");
const dealerScoreDisplay = document.getElementById("dealer-score");
const resultDisplay = document.getElementById("blackjack-result");

let deck = [];
let dealerHand = [];
let playerHands = [];
let activeHandIndex = 0;
let stake = 0;
let roundInProgress = false;
let dealerHoleCardHidden = false;

function createDeck() {
    const cards = [];
    SUITS.forEach((suit) => {
        RANKS.forEach((rank) => cards.push({ rank, suit }));
    });

    for (let index = cards.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
    }
    return cards;
}

function drawCard(hand) {
    const card = deck.pop();
    if (!card) throw new Error("Nie można dobrać karty z pustej talii.");
    card.justDealt = true;
    hand.push(card);
}

function handValue(hand) {
    let total = 0;
    let aces = 0;
    hand.forEach(({ rank }) => {
        if (rank === "A") {
            total += 11;
            aces += 1;
        } else {
            total += ["J", "Q", "K"].includes(rank) ? 10 : Number(rank);
        }
    });

    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }
    return total;
}

function isBlackjack(hand) {
    return hand.cards.length === 2 && handValue(hand.cards) === 21;
}

function renderHand(hand, container, hideHoleCard, revealHoleCard) {
    container.replaceChildren();
    hand.forEach((card, index) => {
        const cardElement = document.createElement("div");
        if (hideHoleCard && index === 1) {
            cardElement.className = "playing-card card-back";
            cardElement.setAttribute("aria-label", "Zakryta karta");
            cardElement.textContent = "★";
            dealerHoleCardHidden = true;
        } else {
            cardElement.className = "playing-card"
                + (card.suit.color === "red" ? " red-card" : "");
            if (card.justDealt) {
                cardElement.classList.add("card-deal");
                cardElement.style.setProperty(
                    "--deal-delay",
                    Math.min(index, 5) * 100 + "ms"
                );
                card.justDealt = false;
            }
            if (revealHoleCard && index === 1 && dealerHoleCardHidden) {
                cardElement.classList.add("card-reveal");
            }
            cardElement.setAttribute("aria-label", card.rank + " " + card.suit.symbol);

            const top = document.createElement("span");
            top.textContent = card.rank + card.suit.symbol;
            const center = document.createElement("span");
            center.className = "card-center";
            center.textContent = card.suit.symbol;
            const bottom = document.createElement("span");
            bottom.className = "card-bottom";
            bottom.textContent = card.rank + card.suit.symbol;
            cardElement.append(top, center, bottom);
        }
        container.appendChild(cardElement);
    });
    if (revealHoleCard) dealerHoleCardHidden = false;
}

function renderHands(revealDealer) {
    const hideHoleCard = roundInProgress && !revealDealer;
    renderHand(
        dealerHand,
        dealerCardsDisplay,
        hideHoleCard,
        !hideHoleCard && dealerHoleCardHidden
    );
    dealerScoreDisplay.textContent = dealerHand.length
        ? "(" + (roundInProgress && !revealDealer
            ? handValue([dealerHand[0]]) + " + ?"
            : handValue(dealerHand)) + ")"
        : "";

    playerHandsDisplay.replaceChildren();
    playerHands.forEach((hand) => {
        const handDisplay = document.createElement("div");
        handDisplay.className = "player-hand";
        const score = document.createElement("div");
        score.className = "player-hand-score";
        score.textContent = String(handValue(hand.cards))
            + (hand.busted ? " — bust" : hand.stood ? " — stoi" : "");
        const cards = document.createElement("div");
        cards.className = "cards";
        renderHand(hand.cards, cards, false, false);
        handDisplay.append(score, cards);
        playerHandsDisplay.appendChild(handDisplay);
    });
}

function updateControls() {
    const hand = playerHands[activeHandIndex];
    const canPlay = roundInProgress && hand && !hand.stood && !hand.busted;

    dealButton.disabled = roundInProgress;
    betInput.disabled = roundInProgress;
    hitButton.disabled = !canPlay;
    standButton.disabled = !canPlay;
}

function renderGame(revealDealer) {
    renderHands(revealDealer);
    updateControls();
}

function finishRound(message, payout) {
    roundInProgress = false;
    if (!Number.isSafeInteger(payout) || !Number.isSafeInteger(window.balance.get() + payout)) {
        throw new RangeError("Wypłata blackjacka przekracza obsługiwany bilans.");
    }
    if (payout > 0) window.balance.set(window.balance.get() + payout);
    resultDisplay.textContent = message;
    renderGame(true);
}

function settleDealerBlackjack() {
    const playerHasBlackjack = playerHands.length === 1 && isBlackjack(playerHands[0]);
    const mainPayout = playerHasBlackjack ? stake : 0;
    const payout = mainPayout;
    const message = playerHasBlackjack
        ? "Krupier ma blackjacka — remis, stawka wraca."
        : "Krupier ma blackjacka. Przegrywasz.";
    finishRound(message, payout);
}

function blackjackPayout(wager) {
    return wager + Math.floor(wager * 1.5);
}

function resolveInitialDeal() {
    if (handValue(dealerHand) === 21) {
        settleDealerBlackjack();
        return;
    }

    if (isBlackjack(playerHands[0])) {
        finishRound(
            "Blackjack! Wygrana 3:2, wypłata: "
                + blackjackPayout(stake).toLocaleString("pl-PL"),
            blackjackPayout(stake)
        );
        return;
    }

    resultDisplay.textContent = "Dobierz kartę albo stań.";
    renderGame(false);
}

function dealerTurn() {
    const liveHands = playerHands.filter((hand) => !hand.busted);
    if (liveHands.length > 0) {
        while (handValue(dealerHand) < 17) drawCard(dealerHand);
    }

    const dealerTotal = handValue(dealerHand);
    let payout = 0;
    let wins = 0;
    let pushes = 0;

    playerHands.forEach((hand) => {
        if (hand.busted) return;
        const playerTotal = handValue(hand.cards);
        if (dealerTotal > 21 || playerTotal > dealerTotal) {
            payout += isBlackjack(hand) ? blackjackPayout(hand.wager) : hand.wager * 2;
            wins += 1;
        } else if (playerTotal === dealerTotal) {
            payout += hand.wager;
            pushes += 1;
        }
    });

    const message = wins > 0
        ? "Wygrywasz " + wins + (wins === 1 ? " rękę" : " ręce")
            + (pushes > 0 ? ", " + pushes + (pushes === 1 ? " remis" : " remisy") : "")
            + ". Wypłata: " + payout.toLocaleString("pl-PL")
        : pushes > 0
            ? "Remis — stawka wraca na Twoje konto."
            : "Krupier wygrywa. Spróbuj ponownie!";
    finishRound(message, payout);
}

function startRound() {
    if (roundInProgress) return;

    const nextStake = betInput.valueAsNumber;
    const balance = window.balance.get();
    if (!Number.isSafeInteger(nextStake) || nextStake < 1) {
        resultDisplay.textContent = "Podaj stawkę będącą dodatnią liczbą całkowitą.";
        betInput.focus();
        return;
    }
    if (nextStake > balance) {
        resultDisplay.textContent = "Stawka nie może być większa niż Twój bilans.";
        betInput.focus();
        return;
    }
    if (!Number.isSafeInteger(balance - nextStake + Math.ceil(nextStake * 2.5))) {
        resultDisplay.textContent = "Ta stawka może przekroczyć maksymalny obsługiwany bilans.";
        betInput.focus();
        return;
    }

    stake = nextStake;
    dealerHoleCardHidden = false;
    deck = createDeck();
    dealerHand = [];
    playerHands = [{
        cards: [],
        wager: stake,
        stood: false,
        busted: false
    }];
    drawCard(playerHands[0].cards);
    drawCard(dealerHand);
    drawCard(playerHands[0].cards);
    drawCard(dealerHand);
    activeHandIndex = 0;
    roundInProgress = true;
    window.balance.set(balance - stake);

    resolveInitialDeal();
}

function finishPlayerHand() {
    dealerTurn();
}

function hit() {
    const hand = playerHands[activeHandIndex];
    if (!roundInProgress || !hand || hand.stood || hand.busted) return;

    drawCard(hand.cards);
    const total = handValue(hand.cards);
    if (total > 21) {
        hand.busted = true;
        hand.stood = true;
        resultDisplay.textContent = "Przekroczyłeś 21.";
        finishPlayerHand();
    } else if (total === 21) {
        hand.stood = true;
        finishPlayerHand();
    } else {
        resultDisplay.textContent = "Dobierz kartę albo stań.";
        renderGame(false);
    }
}

function stand() {
    const hand = playerHands[activeHandIndex];
    if (!roundInProgress || !hand || hand.stood || hand.busted) return;
    hand.stood = true;
    finishPlayerHand();
}

dealButton.addEventListener("click", startRound);
hitButton.addEventListener("click", hit);
standButton.addEventListener("click", stand);
renderGame(true);
