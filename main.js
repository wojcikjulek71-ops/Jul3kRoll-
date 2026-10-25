const BALANCE_STORAGE_KEY = "jul3kroll-balance";
const BANK_STORAGE_KEY = "jul3kroll-bank";
const RECORD_STORAGE_KEY = "jul3kroll-balance-record";
const STARTING_BALANCE = 1000;
const balanceDisplay = document.getElementById("bilans");
const bankCashDisplay = document.getElementById("bank-cash");
const bankDisplay = document.getElementById("bank-balance");
const recordDisplay = document.getElementById("rekord");

function readStoredBalance() {
    const storedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);

    if (storedBalance === null) {
        return STARTING_BALANCE;
    }

    const balance = Number(storedBalance);
    return Number.isSafeInteger(balance) && balance >= 0
        ? balance
        : STARTING_BALANCE;
}

let currentBalance = readStoredBalance();
let currentBank = readStoredValue(BANK_STORAGE_KEY, 0);
let balanceRecord = Math.max(
    currentBalance,
    readStoredValue(RECORD_STORAGE_KEY, STARTING_BALANCE)
);
const depositForm = document.getElementById("bank-deposit-form");
const depositAmountInput = document.getElementById("bank-deposit-amount");
const depositMessage = document.getElementById("bank-deposit-message")
    || document.getElementById("bank-message");
const withdrawForm = document.getElementById("bank-withdraw-form");
const withdrawAmountInput = document.getElementById("bank-withdraw-amount");
const withdrawMessage = document.getElementById("bank-withdraw-message");

function readStoredValue(key, fallback) {
    const storedValue = localStorage.getItem(key);

    if (storedValue === null) {
        return fallback;
    }

    const value = Number(storedValue);
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function renderBalance() {
    if (balanceDisplay) {
        balanceDisplay.textContent = currentBalance.toLocaleString("pl-PL");
    }
    if (bankCashDisplay) {
        bankCashDisplay.textContent = currentBalance.toLocaleString("pl-PL");
    }
    if (bankDisplay) {
        bankDisplay.textContent = currentBank.toLocaleString("pl-PL");
    }
    if (recordDisplay) {
        recordDisplay.textContent = balanceRecord.toLocaleString("pl-PL");
    }
}

function setBalance(balance) {
    if (!Number.isSafeInteger(balance) || balance < 0) {
        throw new RangeError("Bilans musi być nieujemną bezpieczną liczbą całkowitą.");
    }

    localStorage.setItem(BALANCE_STORAGE_KEY, String(balance));
    currentBalance = balance;
    if (balance > balanceRecord) {
        balanceRecord = balance;
        localStorage.setItem(RECORD_STORAGE_KEY, String(balanceRecord));
    }
    renderBalance();
    window.dispatchEvent(new Event("balancechange"));
}

window.balance = {
    get: () => currentBalance,
    getBank: () => currentBank,
    getRecord: () => balanceRecord,
    set: setBalance,
    deposit: (amount) => {
        if (!Number.isSafeInteger(amount) || amount < 1) {
            throw new RangeError("Wpłata musi być dodatnią liczbą całkowitą.");
        }
        if (amount > currentBalance) {
            throw new RangeError("Nie masz wystarczającej gotówki na tę wpłatę.");
        }
        if (!Number.isSafeInteger(currentBank + amount)) {
            throw new RangeError("Wpłata przekracza maksymalny stan konta bankowego.");
        }

        setBalance(currentBalance - amount);
        currentBank += amount;
        localStorage.setItem(BANK_STORAGE_KEY, String(currentBank));
        renderBalance();
    },
    withdraw: (amount) => {
        if (!Number.isSafeInteger(amount) || amount < 1) {
            throw new RangeError("Wypłata musi być dodatnią liczbą całkowitą.");
        }
        if (amount > currentBank) {
            throw new RangeError("Nie masz wystarczających środków w banku.");
        }
        if (!Number.isSafeInteger(currentBalance + amount)) {
            throw new RangeError("Wypłata przekracza maksymalny stan gotówki.");
        }

        currentBank -= amount;
        localStorage.setItem(BANK_STORAGE_KEY, String(currentBank));
        setBalance(currentBalance + amount);
    },
    reset: () => {
        currentBank = 0;
        localStorage.setItem(BANK_STORAGE_KEY, "0");
        setBalance(STARTING_BALANCE);
    }
};

function handleBankTransfer(form, amountInput, message, transfer, successMessage) {
    if (!form || !amountInput || !message) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
            transfer(amountInput.valueAsNumber);
            message.textContent = successMessage;
            amountInput.value = "";
        } catch (error) {
            if (!(error instanceof RangeError)) throw error;
            message.textContent = error.message;
        }
    });
}

handleBankTransfer(
    depositForm,
    depositAmountInput,
    depositMessage,
    window.balance.deposit,
    "Wpłata została wykonana."
);
handleBankTransfer(
    withdrawForm,
    withdrawAmountInput,
    withdrawMessage,
    window.balance.withdraw,
    "Wypłata została wykonana."
);

if (localStorage.getItem(RECORD_STORAGE_KEY) === null
    || balanceRecord !== Number(localStorage.getItem(RECORD_STORAGE_KEY))) {
    localStorage.setItem(RECORD_STORAGE_KEY, String(balanceRecord));
}

if (localStorage.getItem(BALANCE_STORAGE_KEY) === null
    || currentBalance !== Number(localStorage.getItem(BALANCE_STORAGE_KEY))) {
    setBalance(currentBalance);
} else {
    renderBalance();
}
if (localStorage.getItem(BANK_STORAGE_KEY) === null
    || currentBank !== Number(localStorage.getItem(BANK_STORAGE_KEY))) {
    localStorage.setItem(BANK_STORAGE_KEY, String(currentBank));
}

window.addEventListener("storage", (event) => {
    if (event.key === BALANCE_STORAGE_KEY) {
        const balance = event.newValue === null
            ? STARTING_BALANCE
            : Number(event.newValue);
        currentBalance = Number.isSafeInteger(balance) && balance >= 0
            ? balance
            : STARTING_BALANCE;
        if (currentBalance > balanceRecord) {
            balanceRecord = currentBalance;
            localStorage.setItem(RECORD_STORAGE_KEY, String(balanceRecord));
        }
        renderBalance();
    } else if (event.key === BANK_STORAGE_KEY) {
        const bank = Number(event.newValue);
        currentBank = Number.isSafeInteger(bank) && bank >= 0
            ? bank
            : 0;
        renderBalance();
    } else if (event.key === RECORD_STORAGE_KEY) {
        const record = Number(event.newValue);
        if (Number.isSafeInteger(record) && record >= 0) {
            balanceRecord = Math.max(balanceRecord, record, currentBalance);
            renderBalance();
        }
    }
});
