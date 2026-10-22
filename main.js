const BALANCE_STORAGE_KEY = "jul3kroll-balance";
const RECORD_STORAGE_KEY = "jul3kroll-balance-record";
const STARTING_BALANCE = 1000;
const balanceDisplay = document.getElementById("bilans");
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
let balanceRecord = Math.max(
    currentBalance,
    readStoredValue(RECORD_STORAGE_KEY, STARTING_BALANCE)
);

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
}

window.balance = {
    get: () => currentBalance,
    getRecord: () => balanceRecord,
    set: setBalance,
    reset: () => setBalance(STARTING_BALANCE)
};

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

window.addEventListener("storage", (event) => {
    if (event.key === BALANCE_STORAGE_KEY) {
        const balance = Number(event.newValue);
        currentBalance = Number.isSafeInteger(balance) && balance >= 0
            ? balance
            : STARTING_BALANCE;
        if (currentBalance > balanceRecord) {
            balanceRecord = currentBalance;
            localStorage.setItem(RECORD_STORAGE_KEY, String(balanceRecord));
        }
        renderBalance();
    } else if (event.key === RECORD_STORAGE_KEY) {
        const record = Number(event.newValue);
        if (Number.isSafeInteger(record) && record >= 0) {
            balanceRecord = Math.max(balanceRecord, record, currentBalance);
            renderBalance();
        }
    }
});
