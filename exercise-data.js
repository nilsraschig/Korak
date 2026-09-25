/* Korak – Autorenaufgaben für lebensnahe Übungstypen.
 *  roleplay: Mini-Rollenspiel – situativ passende Antwort wählen (alle Optionen grammatisch korrekt)
 *  scenario: Alltagsszenario mit Kontextkarte (Speisekarte, Schild, Fahrplan, Nachricht)
 *  fix:      Fehler-Korrektur – falsches Wort antippen und durch die richtige Form ersetzen
 * "at" verweist auf eine Lektion (nur dort) oder ein Kapitel (alle Lektionen + Kapiteltest).
 * Optionen: [Text, richtig?, Begründung]
 */
(function () {
  const R = (id, at, scene, turns) => ({ id, at, type: "roleplay", scene, turns: turns.map(([npc, options]) => ({ npc, options })) });
  const S = (id, at, context, question, options, say = false) => ({ id, at, type: "scenario", context, question, options, say });
  const F = (id, at, wrong, right, options, de, why) => ({ id, at, type: "fix", wrong, right, options, de, why });
  const menu = (title, lines) => ({ kind: "menu", title, lines });
  const sign = (title, lines) => ({ kind: "sign", title, lines });
  const note = (title, lines) => ({ kind: "note", title, lines });
  const table = (title, lines) => ({ kind: "timetable", title, lines });

  window.KORAK_EXERCISES = [
    // ================= A1 =================
    R("rp-a1-1", "a1-begruessung", "Du betrittst morgens eine kleine Bäckerei in Split. Die Verkäuferin ist etwa sechzig.", [
      ["Dobro jutro!", [["Dobro jutro!", true, "Morgens und gegenüber Fremden passt „Dobro jutro“ – freundlich und höflich."], ["Bok, stara!", false, "Viel zu salopp – „stara“ (Alte) sagt man höchstens unter engen Freunden."], ["Laku noć!", false, "„Laku noć“ wünscht man erst zum Schlafengehen."]]]]),
    F("fx-a1-1", "a1-begruessung", "Ja sam iz Njemačka.", "Ja sam iz Njemačke.", ["Njemačke", "Njemačkoj", "Njemačku"], "Ich komme aus Deutschland.", "iz verlangt den Genitiv: iz Njemačke, iz Austrije."),
    R("rp-a1-2", "a1-obitelj", "Eine Nachbarin zeigt dir stolz ein Foto ihrer Familie.", [
      ["Ovo je moja kći Ana.", [["Baš je lijepa!", true, "Ein Kompliment passt – lijepa bezieht sich auf die Tochter."], ["Koliko košta?", false, "„Wie viel kostet das?“ passt nicht zu einem Familienfoto."], ["Imam dvadeset godina.", false, "Niemand hat nach deinem Alter gefragt – es geht um ihre Tochter."]]]]),
    F("fx-a1-2", "a1-obitelj", "Moja brat živi u Zagrebu.", "Moj brat živi u Zagrebu.", ["Moj", "Moje", "Mojom"], "Mein Bruder wohnt in Zagreb.", "brat ist männlich: moj brat – aber moja sestra."),
    S("sc-a1-3", "a1-hrana", menu("Bistro Luka", [["Juha od rajčice", "4 €"], ["Riblja plata", "18 €"], ["Ćevapi s lukom", "9 €"], ["Salata od hobotnice", "12 €"], ["Palačinke s orasima", "5 €"]]),
      "Du isst kein Fleisch und keinen Fisch. Was sagst du dem Kellner?", [["Juhu od rajčice, molim.", true, "Tomatensuppe – ohne Fleisch und Fisch."], ["Ćevape s lukom, molim.", false, "Ćevapi sind Hackfleischröllchen."], ["Salatu od hobotnice, molim.", false, "hobotnica ist Oktopus."]], true),
    F("fx-a1-3", "a1-hrana", "Jednu kava, molim.", "Jednu kavu, molim.", ["kavu", "kave", "kavom"], "Einen Kaffee, bitte.", "Beim Bestellen steht der Akkusativ: jednu kavu, jednu vodu."),
    S("sc-a1-4", "a1-kupovina", sign("Trgovina", ["RADNO VRIJEME", "pon – pet: 8 – 20", "sub: 8 – 14", "ned: zatvoreno"]),
      "Es ist Sonntag, 10 Uhr. Kannst du hier einkaufen?", [["Nein, sonntags ist geschlossen.", true, "ned: zatvoreno = sonntags geschlossen."], ["Ja, bis 14 Uhr.", false, "Bis 14 Uhr ist samstags (sub) geöffnet."], ["Ja, bis 20 Uhr.", false, "8–20 Uhr gilt montags bis freitags (pon – pet)."]]),
    F("fx-a1-4", "a1-kupovina", "Imate li veću veličina?", "Imate li veću veličinu?", ["veličinu", "veličine", "veličini"], "Haben Sie eine größere Größe?", "imati verlangt den Akkusativ: veću veličinu."),
    R("rp-a1-5", "a1-putovanje", "Du suchst den Bahnhof. Eine Passantin sieht deinen suchenden Blick.", [
      ["Mogu li vam pomoći?", [["Da, molim vas. Gdje je kolodvor?", true, "Du nimmst die Hilfe an und fragst direkt – perfekt."], ["Ne razumijem, doviđenja.", false, "Du brauchst ja Hilfe – so beendest du das Gespräch sofort."], ["Da, jednu kavu, molim.", false, "Das ist eine Bestellung im Café, keine Wegfrage."]]]]),
    F("fx-a1-5", "a1-putovanje", "Gdje je moj soba?", "Gdje je moja soba?", ["moja", "moje", "mojom"], "Wo ist mein Zimmer?", "soba ist weiblich: moja soba."),
    S("sc-a1-6", "a1-svakodnevica", sign("Ljekarna", ["ZATVORENO", "Dežurna ljekarna:", "Ljekarna Centar, Ulica kralja Tomislava 5"]),
      "Deine Apotheke hat geschlossen. Was verrät das Schild?", [["Welche Apotheke gerade Notdienst hat.", true, "dežurna ljekarna = diensthabende Apotheke (Notdienst)."], ["Dass alle Apotheken geschlossen sind.", false, "Im Gegenteil – eine Apotheke hat Dienst."], ["Dass die Apotheke umgezogen ist.", false, "Von einem Umzug steht dort nichts."]]),
    F("fx-a1-6", "a1-svakodnevica", "Boli me glavu.", "Boli me glava.", ["glava", "glave", "glavom"], "Mir tut der Kopf weh.", "Bei boli me ist der Körperteil das Subjekt – Nominativ: boli me glava."),

    // ================= A2 (bestehende Kapitel) =================
    R("rp-a2-1", "a2-proslost", "Montagmorgen im Büro. Eine Kollegin fragt nach deinem Wochenende.", [
      ["Kako je bilo za vikend?", [["Super, bili smo na Braču!", true, "Vergangenheit mit bili smo – genau die Frage beantwortet."], ["Idem na Brač sljedeći vikend.", false, "Das ist ein Plan – gefragt war nach dem letzten Wochenende."], ["Ne volim vikend.", false, "Klingt schroff und beantwortet die Frage nicht."]]]]),
    F("fx-a2-1", "a2-proslost", "Prošli vikend smo bio u Splitu.", "Prošli vikend smo bili u Splitu.", ["bili", "bila", "bilo"], "Letztes Wochenende waren wir in Split.", "Bei mi (wir) steht das l-Partizip im Plural: bili smo."),
    R("rp-a2-2", "a2-buducnost", "Ein Freund lädt dich per Nachricht zum Grillen ein.", [
      ["Hoćeš li doći u subotu na roštilj?", [["Hoću, rado! Što da donesem?", true, "Zusage plus Angebot, etwas mitzubringen – sehr kroatisch."], ["Bio sam u subotu.", false, "Vergangenheit – die Einladung gilt für den kommenden Samstag."], ["Neću. Bok.", false, "Korrekt, aber eine Absage ohne Dank wirkt unhöflich – besser: „Nažalost ne mogu, hvala na pozivu.“"]]]]),
    F("fx-a2-2", "a2-buducnost", "Sutra ću radim.", "Sutra ću raditi.", ["raditi", "radio", "radila"], "Morgen werde ich arbeiten.", "Futur: ću + Infinitiv – sutra ću raditi."),
    S("sc-a2-3", "a2-smjestaj", sign("Na vratima sobe", ["Odjava do 10 sati", "Ključeve ostavite na recepciji", "Hvala na boravku!"]),
      "Wann musst du auschecken, und wohin mit dem Schlüssel?", [["Bis 10 Uhr, Schlüssel an der Rezeption abgeben.", true, "Odjava do 10 = Check-out bis 10; ključeve na recepciji."], ["Ab 10 Uhr, Schlüssel im Zimmer lassen.", false, "do heißt „bis“, nicht „ab“."], ["Bis 10 Uhr, Schlüssel mitnehmen.", false, "Die Schlüssel bleiben an der Rezeption."]]),
    F("fx-a2-3", "a2-smjestaj", "Imamo rezervacija za dvije noći.", "Imamo rezervaciju za dvije noći.", ["rezervaciju", "rezervacije", "rezervaciji"], "Wir haben eine Reservierung für zwei Nächte.", "imati + Akkusativ: rezervaciju."),
    R("rp-a2-4", "a2-restoran", "Ihr wartet seit vierzig Minuten auf das Essen. Der Kellner kommt vorbei.", [
      ["Je li sve u redu?", [["Oprostite, čekamo već četrdeset minuta.", true, "Höflich, klar und mit Fakt – so wird dir am ehesten geholfen."], ["Ovo je najgori restoran na svijetu!", false, "Sprachlich korrekt, aber beleidigend – danach wird es selten besser."], ["Da, sve je savršeno.", false, "Dann weiß niemand, dass ihr noch wartet."]]]]),
    F("fx-a2-4", "a2-restoran", "Riba je svjež.", "Riba je svježa.", ["svježa", "svježe", "svježi"], "Der Fisch ist frisch.", "riba ist weiblich – das Adjektiv auch: svježa."),
    R("rp-a2-5", "a2-svakodnevica", "Du rufst in einer Firma an und möchtest Herrn Horvat sprechen.", [
      ["Dobar dan, tvrtka Adria, izvolite.", [["Dobar dan, mogu li razgovarati s gospodinom Horvatom?", true, "Gruß plus höfliche Frage mit mogu li – ideal am Telefon."], ["Daj mi Horvata.", false, "Befehlston mit ti – am Telefon mit Fremden viel zu direkt."], ["Tko je to?", false, "Du hast angerufen – die Frage ist hier fehl am Platz."]]]]),
    F("fx-a2-5", "a2-svakodnevica", "Mogu li razgovarati s gospodin Horvatom?", "Mogu li razgovarati s gospodinom Horvatom?", ["gospodinom", "gospodina", "gospodinu"], "Kann ich mit Herrn Horvat sprechen?", "s (mit) verlangt den Instrumental – bei beiden Wörtern: s gospodinom Horvatom."),
    S("sc-a2-6", "a2-posao", note("Poruka od šefice", ["Sastanak je pomaknut na četvrtak u 10.", "Molim pripremite prezentaciju.", "Lp, Ivana"]),
      "Was hat sich geändert?", [["Das Meeting ist auf Donnerstag, 10 Uhr, verschoben.", true, "pomaknut na četvrtak = auf Donnerstag verschoben."], ["Das Meeting fällt aus.", false, "Es wird nur verschoben, nicht abgesagt."], ["Die Präsentation ist schon fertig.", false, "Im Gegenteil – du sollst sie vorbereiten (pripremite)."]]),
    F("fx-a2-6", "a2-posao", "Radim od kuće dva dana tjedan.", "Radim od kuće dva dana tjedno.", ["tjedno", "tjedna", "tjednom"], "Ich arbeite zwei Tage pro Woche von zu Hause.", "„pro Woche“ heißt tjedno – wie dnevno (täglich) und mjesečno (monatlich)."),
    R("rp-a2-7", "a2-hitno", "Du rufst die 112 an. Ein Radfahrer ist an der Riva in Split gestürzt.", [
      ["Hitna služba, gdje se nalazite?", [["Na Rivi u Splitu, kod fontane.", true, "Zuerst der genaue Ort – so kommt die Hilfe schnell."], ["Zovem se Petra i imam trideset godina.", false, "Name und Alter helfen gerade nicht – gefragt ist der Ort."], ["Ništa strašno, doviđenja.", false, "Beim Notruf nicht auflegen – klar schildern, was passiert ist."]]]]),
    F("fx-a2-7", "a2-hitno", "Boli me zubi.", "Bole me zubi.", ["Bole", "Boljela", "Bolim"], "Mir tun die Zähne weh.", "Plural: bole me zubi – der Körperteil bestimmt die Verbform."),
    S("sc-a2-8", "a2-promet", table("Trajekt Split – Supetar", [["07:30", "Supetar", "trajekt"], ["09:15", "Supetar", "trajekt"], ["11:00", "Supetar", "samo putnici"], ["13:30", "Supetar", "trajekt"]]),
      "Es ist 10 Uhr, du willst mit dem Auto nach Brač. Welche Fähre nimmst du?", [["13:30", true, "Um 11:00 fahren nur Passagiere (samo putnici) – mit Auto geht es erst um 13:30."], ["11:00", false, "samo putnici = nur Fußpassagiere, kein Auto."], ["09:15", false, "Die ist um 10 Uhr schon weg."]]),
    F("fx-a2-8", "a2-promet", "Jednu karta za Split, molim.", "Jednu kartu za Split, molim.", ["kartu", "karte", "karti"], "Eine Fahrkarte nach Split, bitte.", "Beim Kaufen steht der Akkusativ: jednu kartu."),
    R("rp-a2-9", "a2-dom", "Wohnungsbesichtigung: Der Vermieter hat dir alle Räume gezeigt.", [
      ["Što mislite o stanu?", [["Sviđa mi se, ali koliko su režije?", true, "Positiv und gleichzeitig die wichtige Kostenfrage – perfekt."], ["Kupit ću ga sutra.", false, "Du willst mieten – kaufen steht nicht zur Debatte."], ["Stan je ružan i skup.", false, "Ehrlich, aber so verhandelt es sich schlecht."]]]]),
    F("fx-a2-9", "a2-dom", "Perilica ne radiš.", "Perilica ne radi.", ["radi", "rade", "radimo"], "Die Waschmaschine funktioniert nicht.", "3. Person Singular: perilica radi – ne radi."),
    S("sc-a2-10", "a2-vrijeme", note("Prognoza za sutra", ["Split: 31 °C, sunčano", "Zagreb: 12 °C, kiša", "Rijeka: bura do 90 km/h"]),
      "Wo solltest du morgen besser keine Bootstour machen?", [["In Rijeka – dort weht starke Bura.", true, "Bura mit 90 km/h – kein Tag fürs Boot."], ["In Split – dort ist es zu heiß.", false, "31 °C und Sonne – ideales Bootswetter."], ["In Zagreb – dort regnet es.", false, "Zagreb liegt nicht am Meer."]]),
    F("fx-a2-10", "a2-vrijeme", "Danas je trideset stupnja.", "Danas je trideset stupnjeva.", ["stupnjeva", "stupnjevi", "stupnju"], "Heute sind es dreißig Grad.", "Ab fünf steht der Genitiv Plural: trideset stupnjeva."),
    R("rp-a2-11", "a2-novac", "Auf dem Markt: Du möchtest ein halbes Kilo Kirschen.", [
      ["Izvolite, što trebate?", [["Pola kile trešanja, molim.", true, "Menge plus Genitiv plus molim – so bestellt man auf dem Markt."], ["Trešnje su crvene.", false, "Stimmt – aber du bestellst nichts."], ["Koliko je sati?", false, "Die Uhrzeit hilft beim Einkaufen nicht weiter."]]]]),
    F("fx-a2-11", "a2-novac", "Mogu li platiti kartica?", "Mogu li platiti karticom?", ["karticom", "karticu", "kartice"], "Kann ich mit Karte zahlen?", "Das Zahlungsmittel steht im Instrumental: karticom, gotovinom."),
    R("rp-a2-12", "a2-tijelo", "Beim Joggen an der Promenade triffst du eine Bekannte.", [
      ["Opa, trčiš svaki dan?", [["Skoro, tri puta tjedno.", true, "Direkte Antwort mit Häufigkeit – das Gespräch läuft."], ["Boli me glava.", false, "Beantwortet die Frage nicht."], ["Nikad nisam bila u Zagrebu.", false, "Hat mit Joggen nichts zu tun."]]]]),
    F("fx-a2-12", "a2-tijelo", "Bavim se plivanje.", "Bavim se plivanjem.", ["plivanjem", "plivanja", "plivanju"], "Ich schwimme regelmäßig.", "baviti se + Instrumental: bavim se plivanjem."),

    // ================= B1 =================
    R("rp-b1-1", "b1-misljenje", "Ein Kollege sagt, Homeoffice sei Zeitverschwendung. Du siehst das anders.", [
      ["Rad od kuće je gubljenje vremena.", [["Shvaćam, ali meni štedi dva sata vožnje dnevno.", true, "Du erkennst die Meinung an und bringst ein konkretes Gegenargument."], ["Ti nemaš pojma.", false, "Grammatisch korrekt, aber persönlich angreifend."], ["Potpuno se slažem.", false, "Du siehst das doch anders."]]]]),
    F("fx-b1-1", "b1-misljenje", "Da sam na tvom mjestu, prihvatio bi ponudu.", "Da sam na tvom mjestu, prihvatio bih ponudu.", ["bih", "bismo", "biste"], "An deiner Stelle würde ich das Angebot annehmen.", "1. Person Singular im Konditional: bih (ich) – bi heißt „du/er/sie würde“."),
    S("sc-b1-2", "b1-karijera", note("E-mail", ["Poštovani,", "zahvaljujemo na prijavi. Pozivamo Vas na razgovor", "u utorak, 14. svibnja u 11 sati.", "Molimo potvrdite dolazak.", "S poštovanjem, Odjel ljudskih potencijala"]),
      "Was sollst du jetzt tun?", [["Den Termin am Dienstag bestätigen.", true, "Molimo potvrdite dolazak = Bitte bestätigen Sie Ihr Kommen."], ["Einen Lebenslauf nachreichen.", false, "Davon steht nichts in der Mail."], ["Am Montag anrufen.", false, "Das Gespräch ist am Dienstag (utorak) – und bestätigen genügt."]]),
    F("fx-b1-2", "b1-karijera", "Imam pet godine iskustva.", "Imam pet godina iskustva.", ["godina", "godinu", "godini"], "Ich habe fünf Jahre Erfahrung.", "Ab fünf steht der Genitiv Plural: pet godina."),
    R("rp-b1-3", "b1-drustvo", "Eine Freundin schickt dir einen Artikel, der nach Falschnachricht aussieht.", [
      ["Jesi li vidio ovaj članak? Nevjerojatno!", [["Jesam, ali nisam siguran je li istina. Odakle je?", true, "Freundlich bleiben und nach der Quelle fragen – genau richtig."], ["Podijelit ću ga odmah svima!", false, "Genau so verbreiten sich Falschnachrichten."], ["Ne čitam novine.", false, "Weicht aus und hilft nicht weiter."]]]]),
    F("fx-b1-3", "b1-drustvo", "Sve više ljudi rade na daljinu.", "Sve više ljudi radi na daljinu.", ["radi", "radiš", "radimo"], "Immer mehr Menschen arbeiten aus der Ferne.", "Nach sve više, mnogo, malo + Genitiv steht das Verb im Singular: sve više ljudi radi."),

    // ================= A2-13 Beim Hausarzt =================
    R("rp-ord", "a2-ordinacija", "Du rufst in der Hausarztpraxis an, weil du seit drei Tagen Fieber hast.", [
      ["Ordinacija, izvolite.", [["Dobar dan, želio bih se naručiti.", true, "Gruß plus Anliegen – so beginnt jedes gute Telefonat."], ["Tko je doktor?", false, "Unvermittelt – erst grüßen und sagen, was du möchtest."], ["Imam dopunsko osiguranje.", false, "Das kommt später – zuerst der Termin."]]],
      ["Je li hitno?", [["Nije hitno, ali imam temperaturu već tri dana.", true, "Ehrliche Einschätzung plus Symptom – hilft beim Einplanen."], ["Hitno je, zovite hitnu pomoć!", false, "Dann würdest du die 112 anrufen, nicht die Praxis."], ["Da, u devet.", false, "Gefragt war, ob es dringend ist."]]],
      ["Može sutra u devet i petnaest?", [["Može, hvala lijepa.", true, "Kurz und höflich zugesagt."], ["Ne volim doktore.", false, "Mag sein – aber du brauchst den Termin."], ["Jučer u devet.", false, "Gestern ist vorbei."]]]]),
    S("sc-13-1", "a2-13-1", note("SMS", ["Ordinacija dr. Marić:", "Vaš termin je sutra u 9:15.", "Molimo ponesite zdravstvenu iskaznicu."]),
      "Was sollst du morgen mitbringen?", [["Die Krankenversicherungskarte.", true, "zdravstvena iskaznica = Krankenversicherungskarte."], ["Ein Rezept.", false, "Das bekommst du erst beim Arzt."], ["Eine Überweisung.", false, "Zum Hausarzt braucht man keine uputnica."]]),
    F("fx-13-1", "a2-13-1", "Želio bih se naručiti kod doktor.", "Želio bih se naručiti kod doktora.", ["doktora", "doktoru", "doktorom"], "Ich möchte einen Termin beim Arzt.", "kod + Genitiv: kod doktora, kod zubara."),
    R("rp-13-2", "a2-13-2", "Du hast seit gestern Fieber und Husten. Die Ärztin fragt:", [
      ["Što vas muči?", [["Od jučer imam temperaturu i kašljem.", true, "Seit wann und was – genau das will die Ärztin wissen."], ["Muči me što je vani vruće.", false, "Die Ärztin fragt nach Beschwerden, nicht nach dem Wetter."], ["Hvala, dobro sam.", false, "Dann wärst du wohl nicht hier."]]]]),
    F("fx-13-2", "a2-13-2", "Vrti mi se u glava.", "Vrti mi se u glavi.", ["glavi", "glavu", "glave"], "Mir ist schwindelig.", "u + Lokativ (wo?): u glavi."),
    S("sc-13-3", "a2-13-3", sign("Čekaonica", ["Molimo isključite mobitel", "Ne ulazite bez poziva"]),
      "Worum bittet das Schild im Wartezimmer?", [["Handy aus und erst eintreten, wenn man aufgerufen wird.", true, "isključite mobitel = Handy ausschalten; bez poziva = ohne Aufruf."], ["Handy laden und sofort eintreten.", false, "isključiti heißt ausschalten, nicht laden."], ["Nur mit Termin anrufen.", false, "Vom Anrufen steht dort nichts."]]),
    F("fx-13-3", "a2-13-3", "Otvori usta, molim vas.", "Otvorite usta, molim vas.", ["Otvorite", "Otvorimo", "Otvaram"], "Öffnen Sie bitte den Mund.", "Zu „molim vas“ (Sie) passt der höfliche Imperativ: otvorite."),
    S("sc-13-4", "a2-13-4", sign("Na kutiji lijeka", ["1 tableta 3 × dnevno", "nakon jela", "ne uzimati s alkoholom"]),
      "Wie nimmst du das Medikament?", [["Dreimal täglich eine Tablette nach dem Essen, ohne Alkohol.", true, "3 × dnevno, nakon jela, ne s alkoholom."], ["Einmal täglich drei Tabletten vor dem Essen.", false, "Es ist eine Tablette dreimal täglich – und nach dem Essen."], ["Dreimal täglich auf nüchternen Magen.", false, "nakon jela heißt nach dem Essen."]]),
    F("fx-13-4", "a2-13-4", "Dođite na kontrola za tjedan dana.", "Dođite na kontrolu za tjedan dana.", ["kontrolu", "kontroli", "kontrole"], "Kommen Sie in einer Woche zur Kontrolle.", "Richtung (wohin?) mit na + Akkusativ: na kontrolu."),
    R("rp-13-5", "a2-13-5", "Du rufst morgens deine Chefin an – du bist krank.", [
      ["Halo, Ivana ovdje.", [["Dobro jutro, Ivana. Bolestan sam, liječnik mi je otvorio bolovanje.", true, "Klar, höflich und mit der wichtigen Info zur Krankschreibung."], ["Danas mi se ne da raditi.", false, "„Ich hab keine Lust“ – ehrlich, aber keine Krankmeldung."], ["Brzo ozdravi!", false, "Das wünscht man Kranken – krank bist hier du."]]]]),
    F("fx-13-5", "a2-13-5", "Ostanite u krevet dva dana.", "Ostanite u krevetu dva dana.", ["krevetu", "kreveta", "krevetom"], "Bleiben Sie zwei Tage im Bett.", "Ort (wo?): u + Lokativ – u krevetu."),

    // ================= A2-14 Wohnungssuche =================
    R("rp-stan", "a2-stanovanje", "Du rufst wegen einer Wohnungsanzeige an.", [
      ["Halo?", [["Dobar dan, zovem u vezi s oglasom za stan.", true, "Du stellst dein Anliegen gleich klar."], ["Halo, tko je?", false, "Du rufst an – stell dich und dein Anliegen vor."], ["Stan je preskup.", false, "Du weißt noch gar nichts über den Preis."]]],
      ["Stan je još slobodan. Imate li pitanja?", [["Jesu li režije uključene u cijenu?", true, "Die wichtigste Frage zu den Kosten."], ["Nemam pitanja, doviđenja.", false, "Dann erfährst du nichts – der Anruf war umsonst."], ["Koliko je sati?", false, "Keine Frage zur Wohnung."]]],
      ["Nisu, režije su oko sto eura. Želite li pogledati stan?", [["Rado, može li sutra navečer?", true, "Zusage mit Terminvorschlag."], ["Ne, hvala, želim kupiti kuću.", false, "Dann hättest du nicht wegen der Mietwohnung angerufen."], ["Režije plaća stanodavac.", false, "Er hat gerade gesagt, dass sie extra sind."]]]]),
    S("sc-14-1", "a2-14-1", note("Oglas", ["Iznajmljujem dvosoban stan, 55 m²", "3. kat, bez lifta, centralno grijanje", "550 € + režije, dugoročno", "Kućni ljubimci nisu dozvoljeni"]),
      "Du hast einen Hund und brauchst einen Aufzug. Passt die Wohnung?", [["Nein – keine Haustiere und kein Aufzug.", true, "bez lifta und kućni ljubimci nisu dozvoljeni – beides passt nicht."], ["Ja – Zentralheizung und langfristig.", false, "Schön, aber Hund und Aufzug sind die Knackpunkte."], ["Nur der Hund ist ein Problem.", false, "bez lifta heißt ohne Aufzug – das ist das zweite Problem."]]),
    F("fx-14-1", "a2-14-1", "Stan je slobodan od prvi listopada.", "Stan je slobodan od prvog listopada.", ["prvog", "prvom", "prvu"], "Die Wohnung ist ab dem ersten Oktober frei.", "Datum mit od + Genitiv: od prvog listopada."),
    R("rp-14-2", "a2-14-2", "Der Vermieter ruft zurück.", [
      ["Kada biste htjeli pogledati stan?", [["Može li sutra poslije posla, oko šest?", true, "Konkreter Terminvorschlag – so kommt die Besichtigung zustande."], ["Pogledao sam ga jučer.", false, "Du hast sie noch nicht gesehen – gefragt ist nach einem Termin."], ["Nemam kućnih ljubimaca.", false, "Gut zu wissen, aber keine Antwort auf die Frage."]]]]),
    F("fx-14-2", "a2-14-2", "Zovem u vezi s oglas.", "Zovem u vezi s oglasom.", ["oglasom", "oglasa", "oglasu"], "Ich rufe wegen der Anzeige an.", "s + Instrumental: u vezi s oglasom."),
    S("sc-14-3", "a2-14-3", note("Iz ugovora", ["Najamnina: 600 € mjesečno", "Plaća se do 5. u mjesecu", "Otkazni rok: 30 dana", "Polog: 600 €"]),
      "Du willst Ende Mai ausziehen. Wann musst du spätestens kündigen?", [["Ende April – 30 Tage vorher.", true, "Otkazni rok: 30 dana = 30 Tage Kündigungsfrist."], ["Am 5. Mai.", false, "Der 5. ist der Zahltag der Miete."], ["Gar nicht, die Kaution reicht.", false, "Die Kaution ersetzt keine Kündigung."]]),
    F("fx-14-3", "a2-14-3", "Najamnina se plaća do petog u mjesec.", "Najamnina se plaća do petog u mjesecu.", ["mjesecu", "mjeseca", "mjesecom"], "Die Miete wird bis zum Fünften des Monats bezahlt.", "u + Lokativ: u mjesecu."),
    R("rp-14-4", "a2-14-4", "Dein Nachbar sieht dich mit einem Stapel Umzugskisten.", [
      ["Trebaš li pomoć s kutijama?", [["Bilo bi super, hvala! Još samo pet kutija.", true, "Hilfe angenommen und gedankt."], ["Ne, kutije su smeđe.", false, "Farbe egal – die Frage war, ob du Hilfe brauchst."], ["Selio sam se prošle godine.", false, "Du ziehst gerade jetzt um."]]]]),
    F("fx-14-4", "a2-14-4", "Zapisat ćemo stanje brojilo.", "Zapisat ćemo stanje brojila.", ["brojila", "brojilu", "brojilom"], "Wir notieren den Zählerstand.", "stanje (Stand) + Genitiv: stanje brojila – Stand des Zählers."),
    R("rp-14-5", "a2-14-5", "Du schreibst dem Vermieter schon zum dritten Mal wegen Schimmel.", [
      ["Riješit ću to uskoro.", [["Hvala, ali molim vas da to riješite ovaj tjedan – plijesan je štetna za zdravlje.", true, "Höflich, aber mit klarer Frist und Begründung."], ["Uskoro? Vi ste lažljivac!", false, "Beleidigend – damit verhärtest du die Fronten."], ["Dobro, nema žurbe.", false, "Nach drei Nachrichten zu nachgiebig – Schimmel schadet der Gesundheit."]]]]),
    F("fx-14-5", "a2-14-5", "Bojler ne grijem vodu.", "Bojler ne grije vodu.", ["grije", "griju", "grijemo"], "Der Boiler heizt das Wasser nicht.", "3. Person Singular: bojler grije."),

    // ================= A2-15 Nachbarn =================
    R("rp-sus", "a2-susjedi", "Im Treppenhaus triffst du zum ersten Mal eine Nachbarin.", [
      ["Dobar dan! Vi ste sigurno novi u zgradi?", [["Jesam, stanujem na trećem katu. Drago mi je!", true, "Klare Antwort plus freundliche Vorstellung."], ["Nisam siguran.", false, "Du weißt ja, dass du hier wohnst – eine klare Antwort ist freundlicher."], ["Zgrada je stara.", false, "Keine Antwort auf die Frage."]]],
      ["Ja sam Vesna, s prvog kata. Ako vam što treba, samo recite.", [["Hvala, vrlo ljubazno. Ja sam Luka.", true, "Dank und Vorstellung – der Anfang einer guten Nachbarschaft."], ["Trebam tisuću eura.", false, "Das Angebot war nett gemeint – nicht wörtlich."], ["Ništa mi ne treba, bok.", false, "Wirkt abweisend – ein Dank wäre höflicher."]]],
      ["Dođite jednom na kavu!", [["Rado! Može u subotu?", true, "Zusage mit Terminvorschlag."], ["Ne pijem kavu, doviđenja.", false, "„Na kavu“ meint das Gespräch, nicht das Getränk – so bügelst du die Einladung ab."], ["Kava je preskupa.", false, "Es geht um eine Einladung, nicht um Preise."]]]]),
    R("rp-15-1", "a2-15-1", "Morgens im Treppenhaus – ein älterer Herr spricht dich an.", [
      ["Dobro jutro! Vi ste novi susjed?", [["Jesam, doselio sam se prošli tjedan. Ja sam Marko.", true, "Antwort plus Vorstellung – perfekt."], ["Nisam vaš susjed, ja sam turist.", false, "Du wohnst ja jetzt hier."], ["Opet je vruće.", false, "Small Talk gut – aber die Frage war, ob du neu bist."]]]]),
    F("fx-15-1", "a2-15-1", "Stanujem na drugom kat.", "Stanujem na drugom katu.", ["katu", "kata", "katom"], "Ich wohne im zweiten Stock.", "Ort (wo?): na + Lokativ – na drugom katu."),
    S("sc-15-2", "a2-15-2", note("Poruka na vratima", ["Draga susjedo,", "sutra dolazi paket za mene.", "Možete li ga preuzeti?", "Hvala! Ana, 3. kat"]),
      "Was möchte Ana von dir?", [["Dass du morgen ihr Paket annimmst.", true, "preuzeti paket = ein Paket annehmen."], ["Dass du ihr ein Paket schickst.", false, "Sie bekommt eins – du sollst es nur annehmen."], ["Dass du ihr den Schlüssel gibst.", false, "Von einem Schlüssel steht dort nichts."]]),
    F("fx-15-2", "a2-15-2", "Možete li mi posuditi bušilica?", "Možete li mi posuditi bušilicu?", ["bušilicu", "bušilice", "bušilici"], "Können Sie mir eine Bohrmaschine leihen?", "posuditi + Akkusativ: bušilicu."),
    R("rp-15-3", "a2-15-3", "Die Nachbarin seufzt an der Bushaltestelle.", [
      ["Sve je opet poskupjelo, zar ne?", [["Stvarno, kava je već dva eura!", true, "Du steigst ins Gespräch ein – genau so funktioniert Small Talk."], ["Ne znam, ne kupujem ništa.", false, "Beendet das Gespräch – und stimmt wohl kaum."], ["Kava je crna.", false, "Stimmt, passt aber nicht zum Thema Preise."]]]]),
    F("fx-15-3", "a2-15-3", "Idemo na otok kod rodbina.", "Idemo na otok kod rodbine.", ["rodbine", "rodbinu", "rodbini"], "Wir fahren zu Verwandten auf die Insel.", "kod + Genitiv: kod rodbine."),
    S("sc-15-4", "a2-15-4", note("Pozivnica", ["Slavimo imendan!", "Subota, 19 h, kod nas (2. kat)", "Ponesite samo dobro raspoloženje!"]),
      "Was solltest du mitbringen?", [["Gute Laune – eine Kleinigkeit ist trotzdem nett.", true, "dobro raspoloženje = gute Laune; ein kleines Mitbringsel ist üblich."], ["Einen Kuchen für alle, das ist Pflicht.", false, "Davon steht nichts – nur gute Laune."], ["Nichts, du bist nicht eingeladen.", false, "Doch – die Einladung hängt ja an der Tür."]]),
    F("fx-15-4", "a2-15-4", "Hvala na gostoprimstvo.", "Hvala na gostoprimstvu.", ["gostoprimstvu", "gostoprimstva", "gostoprimstvom"], "Danke für die Gastfreundschaft.", "hvala na + Lokativ: hvala na gostoprimstvu, hvala na pozivu."),
    R("rp-15-5", "a2-15-5", "23 Uhr, beim Nachbarn dröhnt Musik. Du klingelst.", [
      ["Da? Izvolite?", [["Oprostite što smetam, možete li malo tiše? Dijete spava.", true, "Entschuldigung, Bitte und Grund – so klappt es meistens."], ["Isključi to smeće odmah!", false, "Befehl und Beleidigung – das eskaliert sofort."], ["Dobra glazba! Mogu li ući?", false, "Freundlich, aber du wolltest ja Ruhe."]]]]),
    F("fx-15-5", "a2-15-5", "Vaš auto blokiraju ulaz.", "Vaš auto blokira ulaz.", ["blokira", "blokiram", "blokiramo"], "Ihr Auto blockiert die Einfahrt.", "Subjekt auto (Singular): auto blokira."),

    // ================= A2-16 In der Konoba =================
    R("rp-kon", "a2-konoba", "Ein Sommerabend in einer Konoba auf Korčula.", [
      ["Dobra večer! Za koliko osoba?", [["Za dvoje, molim. Može vani?", true, "Anzahl plus Wunsch nach der Terrasse."], ["Dvije kave, molim.", false, "Ihr wollt essen – gefragt ist, für wie viele Personen."], ["Nemam rezervaciju za sutra.", false, "Um morgen geht es gerade nicht."]]],
      ["Naravno. Što ćete jesti?", [["Što nam preporučujete?", true, "Die beste Frage, wenn du unsicher bist – Kellner freuen sich darüber."], ["Ništa, samo gledamo.", false, "Im Restaurant eine seltsame Antwort."], ["Jeli smo jučer.", false, "Hat mit heute nichts zu tun."]]],
      ["Danas imamo svježu ribu s gradela.", [["Odlično, uzet ćemo ribu i blitvu.", true, "Klare Bestellung mit typischer Beilage."], ["Ne volim ribu, zato uzimam ribu.", false, "Widerspricht sich selbst."], ["Riba je u moru.", false, "Die heutige ist schon auf dem Grill."]]]]),
    R("rp-16-1", "a2-16-1", "Du hast für drei Personen auf den Namen Horvat reserviert.", [
      ["Dobra večer! Imate li rezervaciju?", [["Imamo, na ime Horvat, za troje.", true, "Name und Personenzahl – alles, was der Kellner braucht."], ["Hvala, dobro smo.", false, "Beantwortet nicht die Frage nach der Reservierung."], ["Rezervirat ćemo sutra.", false, "Ihr seid jetzt hier und habt ja reserviert."]]]]),
    F("fx-16-1", "a2-16-1", "Unutra je hladniji.", "Unutra je hladnije.", ["hladnije", "hladnija", "hladnijeg"], "Drinnen ist es kühler.", "Unpersönlich („es ist …“) steht das Neutrum: unutra je hladnije."),
    S("sc-16-2", "a2-16-2", menu("Konoba Mate", [["Crni rižot", "14 €"], ["Riba s gradela (kg)", "65 €"], ["Brudet", "18 €"], ["Blitva s krumpirom", "5 €"], ["Peka (najava dan ranije)", "25 €"]]),
      "Ihr wollt heute Abend spontan Peka essen. Geht das?", [["Nein – Peka muss man einen Tag vorher bestellen.", true, "najava dan ranije = Vorbestellung am Vortag."], ["Ja, für 25 €.", false, "Der Preis stimmt, aber ohne Vorbestellung gibt es keine Peka."], ["Nur als Beilage.", false, "Peka ist ein Hauptgericht."]]),
    F("fx-16-2", "a2-16-2", "Riba s gradela je jako ukusan.", "Riba s gradela je jako ukusna.", ["ukusna", "ukusno", "ukusni"], "Der Fisch vom Grill ist sehr lecker.", "riba ist weiblich: riba je ukusna."),
    S("sc-16-3", "a2-16-3", menu("Vinska karta", [["Bevanda (1 l)", "12 €"], ["Gemišt (0,5 l)", "6 €"], ["Plavac mali (0,75 l)", "32 €"], ["Pošip (0,75 l)", "28 €"]]),
      "Du möchtest Rotwein, gemischt mit Wasser – wie die Einheimischen. Was bestellst du?", [["Bevandu, molim.", true, "bevanda = Rotwein mit Wasser, typisch in Dalmatien."], ["Gemišt, molim.", false, "Gemišt ist Weißwein mit Sprudel."], ["Pošip, molim.", false, "Pošip ist ein Weißwein von Korčula – und pur."]], true),
    F("fx-16-3", "a2-16-3", "Pola litre domaći vina, molim.", "Pola litre domaćeg vina, molim.", ["domaćeg", "domaće", "domaćem"], "Einen halben Liter Hauswein, bitte.", "Nach pola litre steht der Genitiv: domaćeg vina."),
    R("rp-16-4", "a2-16-4", "Der Fisch ist zu salzig. Du willst es höflich sagen.", [
      ["Je li sve u redu?", [["Sve je lijepo, samo je riba malo preslana.", true, "Erst das Positive, dann freundlich das Problem."], ["Riba je odvratna!", false, "Zu hart – so fühlt sich die Küche angegriffen."], ["Sve je savršeno!", false, "Dann erfährt niemand vom Problem."]]]]),
    F("fx-16-4", "a2-16-4", "Možemo li dobiti još kruh?", "Možemo li dobiti još kruha?", ["kruha", "kruhu", "kruhom"], "Können wir noch Brot bekommen?", "još + Genitiv: još kruha, još vode."),
    S("sc-16-5", "a2-16-5", menu("Račun", [["2 × Brudet", "36 €"], ["1 × Bevanda (1 l)", "12 €"], ["Kruh", "3 €"], ["Ukupno", "51 €"]]),
      "Ihr wart sehr zufrieden. Welches Trinkgeld ist üblich?", [["Etwa 5 €, also rund zehn Prozent.", true, "Rund zehn Prozent sind bei gutem Service üblich."], ["50 €, damit es sich lohnt.", false, "Fast so viel wie die Rechnung – viel zu viel."], ["Trinkgeld ist in Kroatien verboten.", false, "Im Gegenteil, es ist üblich."]]),
    F("fx-16-5", "a2-16-5", "Ja častiš!", "Ja častim!", ["častim", "časti", "častimo"], "Ich lade euch ein!", "Zu ja (ich) gehört die 1. Person: častim."),

    // ================= A2-17 Bahnhof & Busbahnhof =================
    R("rp-kol", "a2-kolodvor", "Am Busbahnhof in Split. Du willst nach Makarska.", [
      ["Izvolite?", [["Kada ide sljedeći autobus za Makarsku?", true, "Direkt die wichtigste Frage."], ["Autobus je plav.", false, "Die Farbe hilft dir nicht weiter."], ["Bio sam u Makarskoj.", false, "Du willst ja erst hin."]]],
      ["U 15:30, s perona četiri. Karta je devet eura.", [["Jednu kartu, molim. Plaća li se prtljaga posebno?", true, "Kauf plus die wichtige Gepäckfrage."], ["Devet eura je moj broj.", false, "Ergibt keinen Sinn."], ["Idem pješice.", false, "Gut für die Beine, aber es sind sechzig Kilometer."]]],
      ["Da, jedan euro po komadu.", [["U redu, imam jedan kofer.", true, "Klar geregelt."], ["Onda ću kofer nositi na krilu.", false, "Große Koffer gehören in den Gepäckraum – der Euro lohnt sich."], ["Kofer nema eura.", false, "Nur du kannst bezahlen."]]]]),
    R("rp-17-1", "a2-17-1", "Am Schalter: Du willst nach Zadar und wieder zurück.", [
      ["Izvolite?", [["Jednu povratnu kartu za Zadar, molim.", true, "povratna karta = Hin- und Rückfahrt."], ["Jednu kartu u jednom smjeru za Zadar.", false, "Das wäre nur die einfache Fahrt."], ["Gdje je Zadar?", false, "Das weißt du – du willst ein Ticket."]]]]),
    F("fx-17-1", "a2-17-1", "Kada ide zadnja autobus?", "Kada ide zadnji autobus?", ["zadnji", "zadnje", "zadnjem"], "Wann fährt der letzte Bus?", "autobus ist männlich: zadnji autobus."),
    S("sc-17-2", "a2-17-2", table("Odlasci", [["14:10", "Split", "kasni 20 min"], ["14:25", "Zadar", "peron 3"], ["14:40", "Rijeka", "otkazano"]]),
      "Du willst nach Rijeka. Was ist los?", [["Die Verbindung fällt aus.", true, "otkazano = abgesagt, fällt aus."], ["Der Bus hat 20 Minuten Verspätung.", false, "Das gilt für den Bus nach Split."], ["Er fährt von Bahnsteig 3.", false, "Das ist der Bus nach Zadar."]]),
    F("fx-17-2", "a2-17-2", "Vlak kasni dvadeset minute.", "Vlak kasni dvadeset minuta.", ["minuta", "minutu", "minutama"], "Der Zug hat zwanzig Minuten Verspätung.", "Ab fünf steht der Genitiv Plural: dvadeset minuta."),
    R("rp-17-3", "a2-17-3", "Voller Bus. Neben dir liegt deine Tasche auf dem Sitz.", [
      ["Oprostite, je li ovo mjesto slobodno?", [["Jest, samo trenutak, maknut ću torbu.", true, "Freundlich Platz gemacht."], ["Nije, ovdje sjedi moja torba.", false, "Die Tasche braucht keinen eigenen Platz – unfreundlich im vollen Bus."], ["Ne razumijem hrvatski.", false, "Doch – und die Antwort ist leicht."]]]]),
    F("fx-17-3", "a2-17-3", "Staje li autobus u Šibenik?", "Staje li autobus u Šibeniku?", ["Šibeniku", "Šibenika", "Šibenikom"], "Hält der Bus in Šibenik?", "Ort (wo?): u + Lokativ – u Šibeniku."),
    S("sc-17-4", "a2-17-4", sign("Na stanici", ["Karta kod vozača: 2,50 €", "Karta na kiosku: 1,60 €", "Vrijedi 60 minuta"]),
      "Wo ist die Fahrkarte günstiger, und wie lange gilt sie?", [["Am Kiosk, 60 Minuten.", true, "na kiosku 1,60 € statt 2,50 € beim Fahrer; vrijedi 60 minuta."], ["Beim Fahrer, 60 Minuten.", false, "Beim Fahrer (kod vozača) kostet sie mehr."], ["Am Kiosk, den ganzen Tag.", false, "Sie gilt nur 60 Minuten."]]),
    F("fx-17-4", "a2-17-4", "Naručit ću taksi preko aplikacija.", "Naručit ću taksi preko aplikacije.", ["aplikacije", "aplikaciju", "aplikaciji"], "Ich bestelle ein Taxi per App.", "preko + Genitiv: preko aplikacije."),
    R("rp-17-5", "a2-17-5", "Kontrolle im Stadtbus. Du hast deine Karte nicht entwertet.", [
      ["Vaša karta nije poništena.", [["Oprostite, nisam znao. Mogu li je sada poništiti?", true, "Ehrlich und kooperativ – manchmal bleibt es bei einer Verwarnung."], ["To nije moj problem.", false, "Leider doch – so wird die Strafe sicher fällig."], ["Hvala, lijepa karta.", false, "Kein Kompliment gefragt."]]]]),
    F("fx-17-5", "a2-17-5", "Zaboravila sam torbu u autobus.", "Zaboravila sam torbu u autobusu.", ["autobusu", "autobusa", "autobusom"], "Ich habe meine Tasche im Bus vergessen.", "Ort (wo?): u + Lokativ – u autobusu."),

    // ================= A2-18 Auf dem Amt =================
    R("rp-ured", "a2-ured", "Du bist endlich an der Reihe – am Schalter des Finanzamts.", [
      ["Sljedeći! Izvolite.", [["Dobar dan, trebam OIB.", true, "Gruß und Anliegen – kurz und klar."], ["Čekam već sat vremena!", false, "Mag stimmen – ist aber kein guter Start."], ["Sljedeći je on.", false, "Du bist an der Reihe."]]],
      ["Imate li putovnicu?", [["Imam, izvolite.", true, "Pass gereicht – mit izvolite."], ["Nemam, ali imam ideju.", false, "Ohne Pass geht es nicht."], ["Putovnica je plava.", false, "Farbe unwichtig."]]],
      ["Potpišite se ovdje. OIB ćete dobiti odmah.", [["Hvala vam, to je bilo brzo!", true, "Freundlicher Abschluss."], ["Ne potpisujem ništa.", false, "Ohne Unterschrift kein Antrag."], ["Mogu li doći sutra?", false, "Warum? Es geht ja sofort."]]]]),
    S("sc-18-1", "a2-18-1", sign("Porezna uprava", ["Radno vrijeme za stranke:", "pon – pet 8:00 – 12:00", "srijedom i 14:00 – 17:00"]),
      "Du hast nur nachmittags Zeit. Wann kannst du kommen?", [["Mittwochs, 14–17 Uhr.", true, "srijedom i 14–17 = mittwochs zusätzlich 14–17 Uhr."], ["Jeden Tag, 14–17 Uhr.", false, "Nachmittags nur mittwochs."], ["Freitags, 12–14 Uhr.", false, "Um die Zeit ist geschlossen."]]),
    F("fx-18-1", "a2-18-1", "Koji je šalter za stranci?", "Koji je šalter za strance?", ["strance", "stranaca", "strancima"], "Welcher Schalter ist für Ausländer?", "za + Akkusativ: za strance."),
    R("rp-18-2", "a2-18-2", "Die Beamtin fragt nach dem Zweck.", [
      ["Za što vam treba OIB?", [["Za ugovor o najmu i bankovni račun.", true, "Konkrete Gründe – genau das wollte sie wissen."], ["Za ništa, samo želim broj.", false, "Ohne Zweck klingt das seltsam – nenne ruhig den Grund."], ["OIB je broj.", false, "Stimmt, beantwortet aber nicht die Frage."]]]]),
    F("fx-18-2", "a2-18-2", "Priložite kopija putovnice.", "Priložite kopiju putovnice.", ["kopiju", "kopije", "kopiji"], "Legen Sie eine Kopie des Reisepasses bei.", "priložiti + Akkusativ: kopiju."),
    S("sc-18-3", "a2-18-3", note("Potrebni dokumenti", ["putovnica ili osobna iskaznica", "dokaz o smještaju (ugovor o najmu)", "dokaz o zdravstvenom osiguranju", "fotografija 30 × 35 mm"]),
      "Was musst du NICHT mitbringen?", [["Einen Lebenslauf.", true, "Ein životopis steht nicht auf der Liste."], ["Den Mietvertrag.", false, "Der ist der dokaz o smještaju."], ["Ein Passfoto.", false, "fotografija 30 × 35 mm steht auf der Liste."]]),
    F("fx-18-3", "a2-18-3", "Iskaznicu ćete dobiti pošta.", "Iskaznicu ćete dobiti poštom.", ["poštom", "poštu", "pošti"], "Den Ausweis bekommen Sie per Post.", "Das Mittel steht im Instrumental: poštom (per Post)."),
    S("sc-18-4", "a2-18-4", note("Obrazac", ["Ime i prezime: ________", "Datum rođenja: ________", "Bračno stanje: ________"]),
      "Du bist nicht verheiratet. Was trägst du bei „Bračno stanje“ ein?", [["neoženjen / neudana", true, "Ledig: neoženjen (Mann), neudana (Frau)."], ["Zagreb", false, "Das wäre ein Ort."], ["1990.", false, "Das wäre ein Jahr."]]),
    F("fx-18-4", "a2-18-4", "Nedostaje vam pečata.", "Nedostaje vam pečat.", ["pečat", "pečatom", "pečatu"], "Ihnen fehlt ein Stempel.", "Was fehlt, ist das Subjekt – Nominativ: nedostaje pečat."),
    R("rp-18-5", "a2-18-5", "Du bist zum dritten Mal hier. Die Beamtin seufzt:", [
      ["Sustav ne radi, dođite sutra.", [["Razumijem. Možete li mi napisati što sve trebam donijeti?", true, "Ruhig bleiben und sichergehen, dass morgen alles klappt."], ["Uvijek je isto s vama!", false, "Verständlicher Frust – aber so hilft dir niemand schneller."], ["Onda ću čekati ovdje do sutra.", false, "Das Amt schließt – und das System wird davon nicht schneller."]]]]),
    F("fx-18-5", "a2-18-5", "Tko je nadležan za ova?", "Tko je nadležan za ovo?", ["ovo", "ovog", "ovom"], "Wer ist hierfür zuständig?", "za + Akkusativ: za ovo.")
  ];
})();
