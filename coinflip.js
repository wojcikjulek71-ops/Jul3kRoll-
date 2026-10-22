

let wybor = "";
let obrot = 0;
let trwaLosowanie = false;


function wybierz(strona) {
    if (trwaLosowanie) return;

    wybor = strona;
    document.getElementById("wynik").innerText = "Wybrano: " + strona;
}


function losowanie() {
    if (trwaLosowanie) return;

    if (wybor === "") {
        alert("Najpierw wybierz orła lub reszkę!");
        return;
    }


    let los = Math.floor(Math.random() * 2);

    
    let wynik = los === 0 ? "orzel" : "reszka";

    
    let kat = los * 180;
    let poprawka = (kat - obrot % 360 + 360) % 360;

    obrot += 1800 + poprawka;

    
    trwaLosowanie = true;
    document.getElementById("losuj").disabled = true;
    document.getElementById("wynik").innerText = "Losowanie...";

    document.getElementById("orzel").style.transform = "rotateY(" + obrot + "deg)";

   
    setTimeout(function() {
        if (wynik === wybor) {
            document.getElementById("wynik").innerText = "WYGRAŁEŚ! " + wynik;
        } else {
            document.getElementById("wynik").innerText = "PRZEGRAŁEŚ! " + wynik;
        }

        trwaLosowanie = false;
        document.getElementById("losuj").disabled = false;
    }, 3000);
}
