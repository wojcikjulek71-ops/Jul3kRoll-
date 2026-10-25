const EUROPEAN_WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const RED_NUMBERS = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);
const bets = new Map();
const numberGrid = document.getElementById("number-grid");
const wheel = document.getElementById("roulette-wheel");
const totalBetDisplay = document.getElementById("total-bet");
const resultDisplay = document.getElementById("roulette-result");
const betWarningDisplay = document.getElementById("roulette-bet-warning");
const spinButton = document.getElementById("spin-roulette");
const historyList = document.getElementById("roulette-history");
let spinning = false;
let wheelRotation = 0;
let selectedChipValue = 10;
let eraserMode = false;

function numberColor(number) {
    if (number === 0) return "green";
    return RED_NUMBERS.has(number) ? "red" : "black";
}

function numberColorName(number) {
    if (number === 0) return "zielone";
    return RED_NUMBERS.has(number) ? "czerwone" : "czarne";
}

function createWheelNumbers() {
    const segmentAngle = 360 / EUROPEAN_WHEEL_ORDER.length;
    const gradientStops = [];
    EUROPEAN_WHEEL_ORDER.forEach((number, index) => {
        const label = document.createElement("span");
        label.className = "wheel-number";
        label.textContent = number;
        const angle = index * segmentAngle;
        label.style.setProperty("--angle", angle + "deg");
        label.style.setProperty("--counter-angle", -angle + "deg");
        wheel.appendChild(label);
        gradientStops.push(
            (numberColor(number) === "green" ? "#08713d"
                : numberColor(number) === "red" ? "#a51d27" : "#171717")
            + " " + (index * segmentAngle) + "deg "
            + ((index + 1) * segmentAngle) + "deg"
        );
    });
    wheel.style.setProperty(
        "--wheel-gradient",
        "conic-gradient(from -" + (segmentAngle / 2) + "deg, "
            + gradientStops.join(", ") + ")"
    );
}

function createNumberGrid() {
    for (let number = 1; number <= 36; number += 1) {
        const cell = document.createElement("button");
        const row = 3 - ((number - 1) % 3);
        const column = Math.floor((number - 1) / 3) + 1;
        cell.type = "button";
        cell.className = "bet-spot " + numberColor(number);
        cell.dataset.bet = "number:" + number;
        cell.style.gridRow = String(row);
        cell.style.gridColumn = String(column);
        cell.setAttribute("aria-label", "Postaw na " + number);
        cell.textContent = number;
        numberGrid.appendChild(cell);
    }
}

function getTotalBet() {
    let total = 0;
    for (const amount of bets.values()) {
        total += amount;
    }
    return total;
}

function renderBets() {
    document.querySelectorAll("[data-bet]").forEach((spot) => {
        const amount = bets.get(spot.dataset.bet) || 0;
        let chip = spot.querySelector(".chip");
        if (amount > 0) {
            if (!chip) {
                chip = document.createElement("span");
                chip.className = "chip";
                spot.appendChild(chip);
            }
            chip.textContent = amount.toLocaleString("en-US");
        } else if (chip) {
            chip.remove();
        }
    });
    totalBetDisplay.textContent = getTotalBet().toLocaleString("en-US");
    const canAffordSpin = getTotalBet() <= window.balance.get();
    spinButton.disabled = spinning || bets.size === 0 || !canAffordSpin;
    spinButton.title = bets.size > 0 && !canAffordSpin
        ? "Bilans jest mniejszy niż suma zakładów. Zmniejsz lub wyczyść zakłady."
        : "";
    betWarningDisplay.textContent = bets.size > 0 && !canAffordSpin
        ? "Bilans jest mniejszy niż suma zakładów. Zmniejsz lub wyczyść zakłady."
        : "";
}

function placeBet(key) {
    if (spinning) return;

    if (eraserMode) {
        bets.delete(key);
        renderBets();
        return;
    }

    const nextTotal = getTotalBet() + selectedChipValue;
    if (!Number.isSafeInteger(nextTotal) || nextTotal > window.balance.get()) {
        alert("Suma stawek nie może być większa niż Twój bilans.");
        return;
    }

    bets.set(key, (bets.get(key) || 0) + selectedChipValue);
    renderBets();
}

function isWinningBet(key, number) {
    if (key.startsWith("number:")) {
        return number === Number(key.slice("number:".length));
    }
    if (key.startsWith("dozen:")) {
        const dozen = Number(key.slice("dozen:".length));
        return number > (dozen - 1) * 12 && number <= dozen * 12;
    }
    if (key.startsWith("column:")) {
        const column = Number(key.slice("column:".length));
        return number > 0 && (number - 1) % 3 + 1 === column;
    }

    switch (key) {
        case "red":
            return RED_NUMBERS.has(number);
        case "black":
            return number !== 0 && !RED_NUMBERS.has(number);
        case "low":
            return number >= 1 && number <= 18;
        case "high":
            return number >= 19 && number <= 36;
        case "odd":
            return number > 0 && number % 2 === 1;
        case "even":
            return number > 0 && number % 2 === 0;
        default:
            return false;
    }
}

function getPayoutMultiplier(key) {
    if (key.startsWith("number:")) return 35;
    if (key.startsWith("dozen:") || key.startsWith("column:")) return 2;
    return 1;
}

function addHistory(number) {
    const item = document.createElement("li");
    item.className = "history-number " + numberColor(number);
    item.textContent = number;
    item.setAttribute("aria-label", number + ", " + numberColorName(number));
    historyList.prepend(item);
    while (historyList.children.length > 10) {
        historyList.lastElementChild.remove();
    }
}

function finishSpin(number, totalStake, placedBets) {
    let payout = 0;
    for (const [key, amount] of placedBets) {
        if (isWinningBet(key, number)) {
            payout += amount * (getPayoutMultiplier(key) + 1);
        }
    }

    if (!Number.isSafeInteger(payout)
        || !Number.isSafeInteger(window.balance.get() + payout)) {
        window.balance.set(window.balance.get() + totalStake);
        resultDisplay.textContent = "Błąd wypłaty. Stawki zostały zwrócone.";
    } else {
        window.balance.set(window.balance.get() + payout);
        const netResult = payout - totalStake;
        const outcome = netResult > 0
            ? "zysk: " + netResult.toLocaleString("pl-PL")
            : netResult === 0
                ? "zwrot stawek"
                : "strata: " + Math.abs(netResult).toLocaleString("pl-PL");
        const payoutText = payout > 0
            ? " (wypłata: " + payout.toLocaleString("pl-PL") + ")"
            : "";
        resultDisplay.textContent =
            "Wynik: " + number + " (" + numberColorName(number) + ") — "
                + outcome + payoutText;
    }

    addHistory(number);
    spinning = false;
    document.querySelectorAll("[data-bet]").forEach((spot) => {
        spot.disabled = false;
    });
    document.querySelectorAll("[data-chip]").forEach((chip) => {
        chip.disabled = false;
    });
    document.getElementById("eraser-tool").disabled = false;
    document.getElementById("clear-bets").disabled = false;
    renderBets();
}

function spinRoulette() {
    if (spinning || bets.size === 0) return;

    const totalStake = getTotalBet();
    const currentBalance = window.balance.get();
    if (totalStake > currentBalance) {
        betWarningDisplay.textContent =
            "Bilans jest mniejszy niż suma zakładów. Zmniejsz lub wyczyść zakłady.";
        renderBets();
        return;
    }

    const placedBets = new Map(bets);
    const possiblePayouts = EUROPEAN_WHEEL_ORDER.map((number) => {
        let payout = 0;
        for (const [key, amount] of placedBets) {
            if (isWinningBet(key, number)) {
                payout += amount * (getPayoutMultiplier(key) + 1);
            }
        }
        return payout;
    });
    if (possiblePayouts.some((payout) =>
        !Number.isSafeInteger(currentBalance - totalStake + payout))) {
        alert("Te zakłady mogą przekroczyć maksymalny obsługiwany bilans.");
        return;
    }

    const number = EUROPEAN_WHEEL_ORDER[
        Math.floor(Math.random() * EUROPEAN_WHEEL_ORDER.length)
    ];
    const winningIndex = EUROPEAN_WHEEL_ORDER.indexOf(number);
    const segmentAngle = 360 / EUROPEAN_WHEEL_ORDER.length;
    const targetRotation = (360 - (winningIndex * segmentAngle) % 360) % 360;
    wheelRotation += 360 * 6 + targetRotation - (wheelRotation % 360);

    spinning = true;
    document.querySelectorAll("[data-bet]").forEach((spot) => {
        spot.disabled = true;
    });
    document.querySelectorAll("[data-chip]").forEach((chip) => {
        chip.disabled = true;
    });
    document.getElementById("eraser-tool").disabled = true;
    document.getElementById("clear-bets").disabled = true;
    spinButton.disabled = true;
    resultDisplay.textContent = "Koło się kręci...";
    window.balance.set(currentBalance - totalStake);
    wheel.style.transform = "rotate(" + wheelRotation + "deg)";

    window.setTimeout(() => finishSpin(number, totalStake, placedBets), 4100);
}

createWheelNumbers();
createNumberGrid();
document.querySelectorAll("[data-bet]").forEach((spot) => {
    spot.addEventListener("click", () => placeBet(spot.dataset.bet));
});
document.querySelectorAll("[data-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
        if (spinning) return;
        eraserMode = false;
        const eraserButton = document.getElementById("eraser-tool");
        eraserButton.classList.remove("wybrany");
        eraserButton.setAttribute("aria-pressed", "false");
        selectedChipValue = Number(chip.dataset.chip);
        document.querySelectorAll("[data-chip]").forEach((option) => {
            const selected = option === chip;
            option.classList.toggle("wybrany", selected);
            option.setAttribute("aria-pressed", String(selected));
        });
    });
});
document.getElementById("eraser-tool").addEventListener("click", (event) => {
    if (spinning) return;
    eraserMode = !eraserMode;
    const eraserButton = event.currentTarget;
    eraserButton.classList.toggle("wybrany", eraserMode);
    eraserButton.setAttribute("aria-pressed", String(eraserMode));
    document.querySelectorAll("[data-chip]").forEach((chip) => {
        const selected = !eraserMode && Number(chip.dataset.chip) === selectedChipValue;
        chip.classList.toggle("wybrany", selected);
        chip.setAttribute("aria-pressed", String(selected));
    });
});
document.getElementById("clear-bets").addEventListener("click", () => {
    if (spinning) return;
    bets.clear();
    renderBets();
});
spinButton.addEventListener("click", spinRoulette);
window.addEventListener("storage", renderBets);
renderBets();
