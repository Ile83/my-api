booking.ts 

1. Mitä tekoäly teki hyvin?

Tekoäly tuotti rakenteellisesti selkeää ja TypeScript-tyylisesti korrektia koodia. Se mallinsi varausdatan ja aikavälit ymmärrettävällä tavalla ja käytti yleisesti hyväksyttyä puoliavoimen aikavälin logiikkaa ([start, end)), joka soveltuu hyvin varausten päällekkäisyyksien tarkistamiseen.

Lisäksi tekoäly tunnisti oikein, että aikavälien päällekkäisyyden tarkistus on keskeinen osa liiketoimintalogiikkaa, ja toteutti sen tehokkaalla ja yksinkertaisella ehdolla. Koodi oli helposti luettavaa ja jatkokehitettävää.

2. Mitä tekoäly teki huonosti?

Tekoälyn tuottama alkuperäinen koodi ei sisältänyt riittävää syötevalidointia. Date.parse()-funktion mahdollisia virhetilanteita (esimerkiksi NaN-palautusarvo virheellisistä ISO-merkkijonoista) ei käsitelty lainkaan, mikä olisi voinut johtaa hiljaisiin virheisiin tuotantoympäristössä.

Lisäksi koodi ei varmistanut, että varauksen endTime olisi aina startTime-arvoa myöhemmin. Tämä olisi mahdollistanut loogisesti virheellisten tai jopa negatiivisten aikavälien syntymisen. Virhetilanteista ei myöskään annettu mitään palautetta, mikä vaikeuttaisi virheiden jäljittämistä ja testausta.

3. Mitkä olivat tärkeimmät parannukset, jotka teit tekoälyn tuottamaan koodiin ja miksi?

Keskeisin parannus oli syötevalidoinnin lisääminen aikavälien muodostamiseen. Tarkistin erikseen, että sekä aloitus- että lopetusaika ovat valideja ISO 8601 -aikaleimoja ja että ne voidaan muuntaa kelvollisiksi millisekuntiarvoiksi. Tämä estää virheellisen datan päätymisen järjestelmään.

Toinen merkittävä parannus oli aikavälin loogisen oikeellisuuden varmistaminen siten, että endTime on aina suurempi kuin startTime. Tämä on välttämätöntä varausten oikean toiminnan ja päällekkäisyyslogiikan luotettavuuden kannalta.

Lisäksi lisäsin kuvaavat virheilmoitukset ja JSDoc-dokumentaation. Näiden avulla koodi on helpompi ymmärtää, testata ja ylläpitää, ja virhetilanteet voidaan käsitellä hallitusti esimerkiksi REST API:n palauttamilla HTTP-virhekoodeilla.

Bookings.ts

1. Mitä tekoäly teki hyvin?

Tekoäly tuotti nopeasti toimivan perusrakenteen REST-rajapinnalle käyttäen Node.js:ää, Expressiä ja TypeScriptiä. Koodi oli selkeää ja helposti luettavaa, ja vastasi hyvin tehtävän teknisiä vaatimuksia. Erityisesti onnistunutta oli:

Reittien (GET, POST, DELETE) oikea rakenne ja REST-tyylinen nimeäminen

zod-kirjaston käyttö pyynnön rungon validointiin

Päällekkäisten varausten logiikan tunnistaminen ja perusratkaisun tarjoaminen

Selkeä moduulijako (reitit, domain-logiikka, muistivarasto)

Tekoäly auttoi myös hahmottamaan kokonaisuuden nopeasti, mikä nopeutti kehitystyön aloittamista merkittävästi.

2. Mitä tekoäly teki huonosti?

Tekoälyn tuottama koodi ei sellaisenaan ollut tuotantokelpoinen. Siinä oli useita vakavia puutteita, joita ei aluksi huomioitu:

Poikkeuksia heittäviä funktioita (esim. aikavälin validointi) kutsuttiin ilman virheenkäsittelyä, mikä olisi voinut kaataa pyynnön

Päällekkäisyyden tarkistus ja varauksen lisäys eivät olleet atomisia, mikä aiheuttaa kilpailutilanteen rinnakkaisissa pyynnöissä

Polkuparametreja (roomId, bookingId) ei validoitu lainkaan

GET-endpoint palautti kaikki varaukset ilman sivutusta, mikä ei skaalaudu

Turvallisuuteen ja tuotantokäyttöön liittyvät asiat (autentikointi, lokitus, rajoitukset) puuttuivat kokonaan

Näiden vuoksi koodi oli enemmän prototyyppitasoa kuin valmis ratkaisu.

3. Mitkä olivat tärkeimmät parannukset, jotka teit tekoälyn tuottamaan koodiin ja miksi?

Tärkeimmät tekemäni parannukset liittyivät luotettavuuteen ja virhetilanteiden hallintaan:

Lisäsin try-catch -rakenteen aikavälin muodostukseen, jotta virheellinen syöte palauttaa hallitun 400-virheen eikä aiheuta palvelinvirhettä

Toteutin muistivarastoon huonekohtaisen lukituksen, jolla varauksen päällekkäisyyden tarkistus ja lisäys tehdään atomisesti ja estetään tuplavaraukset

Lisäsin polkuparametrien validoinnin, jotta virheelliset tai haitalliset syötteet hylätään ajoissa

Lisäsin sivutuksen GET-endpointiin suorituskyvyn ja käytettävyyden parantamiseksi

Näillä muutoksilla koodi vastaa paremmin todellisen tuotantojärjestelmän vaatimuksia, vaikka se edelleen käyttääkin yksinkertaista in-memory-ratkaisua tietokannan sijaan.