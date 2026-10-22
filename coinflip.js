

let wybor = "";
let obrot = 0;
let trwaLosowanie = false;

function wybierz(strona) {
    if (trwaLosowanie) return;

    wybor = strona;
    document.querySelectorAll("[data-side]").forEach((przycisk) => {
        const wybrany = przycisk.dataset.side === strona;
        przycisk.classList.toggle("wybrany", wybrany);
        przycisk.setAttribute("aria-pressed", String(wybrany));
    });
    document.getElementById("wynik").innerText = "Wybrano: " + strona;
}

function losowanie() {
    if (trwaLosowanie) return;

    if (wybor === "") {
        alert("Najpierw wybierz orła lub reszkę!");
        return;
    }

    const poleStawki = document.getElementById("bet");
    const stawka = poleStawki.valueAsNumber;
    const bilans = window.balance.get();

    if (!Number.isSafeInteger(stawka) || stawka < 1) {
        alert("Podaj prawidłową stawkę będącą liczbą całkowitą większą od zera.");
        poleStawki.focus();
        return;
    }

    if (stawka > bilans) {
        alert("Stawka nie może być większa niż Twój bilans.");
        poleStawki.focus();
        return;
    }

    if (bilans + stawka > Number.MAX_SAFE_INTEGER) {
        alert("Ta stawka może przekroczyć maksymalny obsługiwany bilans.");
        poleStawki.focus();
        return;
    }

    const los = Math.floor(Math.random() * 2);
    const wynik = los === 0 ? "orzel" : "reszka";
    let kat = los * 180;
    let poprawka = (kat - obrot % 360 + 360) % 360;

    obrot += 1800 + poprawka;

    window.balance.set(bilans - stawka);
    trwaLosowanie = true;
    document.getElementById("losuj").disabled = true;
    poleStawki.disabled = true;
    document.getElementById("wynik").innerText = "Losowanie...";

    document.getElementById("orzel").style.transform = "rotateY(" + obrot + "deg)";

    setTimeout(function() {
        try {
            if (wynik === wybor) {
                window.balance.set(window.balance.get() + stawka * 2);
                document.getElementById("wynik").innerText =
                    "WYGRAŁEŚ! " + wynik + " (wypłata: " + stawka * 2 + ")";
            } else {
                document.getElementById("wynik").innerText =
                    "PRZEGRAŁEŚ! " + wynik + " (strata: " + stawka + ")";
            }
        } finally {
            trwaLosowanie = false;
            document.getElementById("losuj").disabled = false;
            poleStawki.disabled = false;
        }
    }, 3000);
}
