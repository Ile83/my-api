## booking.ts 

## 1. Mitä tekoäly teki hyvin?

Tekoäly tuotti rakenteellisesti selkeää ja TypeScript-tyylisesti korrektia koodia. Se mallinsi varausdatan ja aikavälit ymmärrettävällä tavalla ja käytti yleisesti hyväksyttyä puoliavoimen aikavälin logiikkaa ([start, end)), joka soveltuu hyvin varausten päällekkäisyyksien tarkistamiseen.

Lisäksi tekoäly tunnisti oikein, että aikavälien päällekkäisyyden tarkistus on keskeinen osa liiketoimintalogiikkaa, ja toteutti sen tehokkaalla ja yksinkertaisella ehdolla. Koodi oli helposti luettavaa ja jatkokehitettävää.

## 2. Mitä tekoäly teki huonosti?

Tekoälyn tuottama alkuperäinen koodi ei sisältänyt riittävää syötevalidointia. Date.parse()-funktion mahdollisia virhetilanteita (esimerkiksi NaN-palautusarvo virheellisistä ISO-merkkijonoista) ei käsitelty lainkaan, mikä olisi voinut johtaa hiljaisiin virheisiin tuotantoympäristössä.

Lisäksi koodi ei varmistanut, että varauksen endTime olisi aina startTime-arvoa myöhemmin. Tämä olisi mahdollistanut loogisesti virheellisten tai jopa negatiivisten aikavälien syntymisen. Virhetilanteista ei myöskään annettu mitään palautetta, mikä vaikeuttaisi virheiden jäljittämistä ja testausta.

## 3. Mitkä olivat tärkeimmät parannukset, jotka teit tekoälyn tuottamaan koodiin ja miksi?

Keskeisin parannus oli syötevalidoinnin lisääminen aikavälien muodostamiseen. Tarkistin erikseen, että sekä aloitus- että lopetusaika ovat valideja ISO 8601 -aikaleimoja ja että ne voidaan muuntaa kelvollisiksi millisekuntiarvoiksi. Tämä estää virheellisen datan päätymisen järjestelmään.

Toinen merkittävä parannus oli aikavälin loogisen oikeellisuuden varmistaminen siten, että endTime on aina suurempi kuin startTime. Tämä on välttämätöntä varausten oikean toiminnan ja päällekkäisyyslogiikan luotettavuuden kannalta.

Lisäksi lisäsin kuvaavat virheilmoitukset ja JSDoc-dokumentaation. Näiden avulla koodi on helpompi ymmärtää, testata ja ylläpitää, ja virhetilanteet voidaan käsitellä hallitusti esimerkiksi REST API:n palauttamilla HTTP-virhekoodeilla.

## bookings.ts

## 1. Mitä tekoäly teki hyvin?

Tekoäly tuotti nopeasti toimivan perusrakenteen REST-rajapinnalle käyttäen Node.js:ää, Expressiä ja TypeScriptiä. Koodi oli selkeää ja helposti luettavaa, ja vastasi hyvin tehtävän teknisiä vaatimuksia. Erityisesti onnistunutta oli:

Reittien (GET, POST, DELETE) oikea rakenne ja REST-tyylinen nimeäminen

zod-kirjaston käyttö pyynnön rungon validointiin

Päällekkäisten varausten logiikan tunnistaminen ja perusratkaisun tarjoaminen

Selkeä moduulijako (reitit, domain-logiikka, muistivarasto)

Tekoäly auttoi myös hahmottamaan kokonaisuuden nopeasti, mikä nopeutti kehitystyön aloittamista merkittävästi.

## 2. Mitä tekoäly teki huonosti?

Tekoälyn tuottama koodi ei sellaisenaan ollut tuotantokelpoinen. Siinä oli useita vakavia puutteita, joita ei aluksi huomioitu:

Poikkeuksia heittäviä funktioita (esim. aikavälin validointi) kutsuttiin ilman virheenkäsittelyä, mikä olisi voinut kaataa pyynnön

Päällekkäisyyden tarkistus ja varauksen lisäys eivät olleet atomisia, mikä aiheuttaa kilpailutilanteen rinnakkaisissa pyynnöissä

Polkuparametreja (roomId, bookingId) ei validoitu lainkaan

GET-endpoint palautti kaikki varaukset ilman sivutusta, mikä ei skaalaudu

Turvallisuuteen ja tuotantokäyttöön liittyvät asiat (autentikointi, lokitus, rajoitukset) puuttuivat kokonaan

Näiden vuoksi koodi oli enemmän prototyyppitasoa kuin valmis ratkaisu.

## 3. Mitkä olivat tärkeimmät parannukset, jotka teit tekoälyn tuottamaan koodiin ja miksi?

Tärkeimmät tekemäni parannukset liittyivät luotettavuuteen ja virhetilanteiden hallintaan:

Lisäsin try-catch -rakenteen aikavälin muodostukseen, jotta virheellinen syöte palauttaa hallitun 400-virheen eikä aiheuta palvelinvirhettä

Toteutin muistivarastoon huonekohtaisen lukituksen, jolla varauksen päällekkäisyyden tarkistus ja lisäys tehdään atomisesti ja estetään tuplavaraukset

Lisäsin polkuparametrien validoinnin, jotta virheelliset tai haitalliset syötteet hylätään ajoissa

Lisäsin sivutuksen GET-endpointiin suorituskyvyn ja käytettävyyden parantamiseksi

Näillä muutoksilla koodi vastaa paremmin todellisen tuotantojärjestelmän vaatimuksia, vaikka se edelleen käyttääkin yksinkertaista in-memory-ratkaisua tietokannan sijaan.

## schemas.ts

## 1. Mitä tekoäly teki hyvin?

Tekoäly tuotti aluksi toimivan ja selkeän Zod-validointiskeeman varausrajapintaa varten. Koodi oli rakenteellisesti oikein, helposti luettavaa ja hyödynsi Zodin `superRefine`-mekanismia monimutkaisempien liiketoimintasääntöjen tarkistamiseen.  
Lisäksi tekoäly tunnisti oikein keskeiset validointitarpeet, kuten sen, että varauksen aloitusajan täytyy olla ennen lopetusaikaa sekä sen, ettei varauksia saa tehdä menneisyyteen.  

Tekoäly myös käytti TypeScriptin ja Zodin ominaisuuksia idiomatisella tavalla ja tuotti tyyppimäärittelyn (`z.infer`), jota voidaan hyödyntää muualla sovelluksessa. Tämä tukee hyvää tyyppiturvallisuutta ja rajapinnan selkeyttä.

## 2. Mitä tekoäly teki huonosti?

Alkuperäisessä koodissa oli useita tuotantokäytön kannalta ongelmallisia ratkaisuja. Validointiskeema sisälsi päällekkäistä aikaleimojen parsintaa, sillä samoja ISO-aikamerkkijonoja jouduttiin käsittelemään useaan kertaan eri kerroksissa sovellusta.  

Lisäksi skeema oli tilasidonnainen, koska se käytti suoraan `Date.now()`-kutsua. Tämä tekee koodista vaikeasti testattavaa ja voi aiheuttaa epädeterminististä käyttäytymistä erityisesti testauksessa ja mahdollisissa monipalvelinympäristöissä.  

Tekoäly ei myöskään huomioinut liiketoimintasääntöjä, kuten varauksen enimmäiskestoa, minimikestoa tai sitä, kuinka pitkälle tulevaisuuteen varauksia saa tehdä. Ilman näitä rajoitteita rajapinta hyväksyisi epärealistisia varauksia.

## 3. Mitkä olivat tärkeimmät parannukset, jotka teit tekoälyn tuottamaan koodiin ja miksi?

Merkittävin parannus oli aikavalidoinnin ja aikaleimojen parsinnan keskittäminen validointiskeemaan ja niiden muuntaminen millisekunneiksi jo tässä vaiheessa. Tämä poisti tarpeen parsia samoja aikaleimoja useaan kertaan muualla sovelluksessa ja selkeytti domain-logiikkaa.  

Toinen keskeinen parannus oli nykyhetken (`now`) injektoiminen skeemaan funktion parametrina. Tämä tekee validoinnista determinististä ja helpottaa yksikkötestausta merkittävästi. Samalla lisättiin pieni grace window, joka estää käyttäjäkokemusta heikentävät virheet, jos varaus tehdään aivan nykyhetken rajalla.  

Lisäksi skeemaan lisättiin liiketoimintasäännöt varauksen minimikestolle, maksimikestolle ja enimmäisvarausajalle tulevaisuuteen. Nämä rajoitteet tekevät rajapinnasta realistisemman ja tuotantokäyttöön soveltuvan.  

Kokonaisuutena muutokset paransivat koodin testattavuutta, suorituskykyä, ylläpidettävyyttä ja liiketoimintalogiikan selkeyttä ilman, että rajapinnan ulkoinen toiminta monimutkaistui.

## memoryStore.ts

## 1. Mitä tekoäly teki hyvin?

Tekoäly tuotti toimivan ja selkeästi jäsennellyn in-memory-toteutuksen, joka vastasi annetun tehtävän vaatimuksia. Koodi oli luettavaa, TypeScript-tyypitykset olivat pääosin oikein, ja kokonaisrakenne (store, mutex, domain-tyypit) oli jaettu loogisiin osiin.
Lisäksi tekoäly tunnisti tarpeen suojata samanaikaiset kirjoitusoperaatiot ja yritti ratkaista ongelman huonelähtöisellä (per roomId) mutex-lukituksella, mikä on oikea lähestymistapa kilpailutilanteiden estämiseen.
Myös päällekkäisten varausten tarkistus oli eriytetty predicate-funktion kautta, mikä teki ratkaisusta joustavan ja helposti testattavan.

## . Mitä tekoäly teki huonosti?

Merkittävin ongelma oli KeyedMutexin virheellinen siivouslogiikka, joka aiheutti muistivuodon. Promise-ketjujen vertailu tehtiin virheellisesti, jolloin lukot jäivät Map-rakenteeseen pysyvästi. Tämä on vakava virhe, joka tekisi ratkaisusta pitkässä ajossa epäluotettavan.

Lisäksi tekoäly altisti julkisessa API:ssa sekä atomisia että ei-atomisia kirjoitusmetodeja (insert, remove vs. insertIfNoOverlap, removeIfExists). Tämä on suunnittelullinen heikkous, koska se mahdollistaa lukituksen ohittamisen vahingossa ja rikkoo säieturvallisuuden.

Koodi käytti myös lineaarisia hakuja (Array.find, Array.splice) kaikkiin operaatioihin, mikä ei skaalaudu hyvin, jos varauksia kertyy paljon. Myös huoneita luotiin tarpeettomasti lukuoperaatioissa, mikä lisäsi turhaa muistinkäyttöä.

## 3. Mitkä olivat tärkeimmät parannukset, jotka teit tekoälyn tuottamaan koodiin ja miksi?

Tein seuraavat keskeiset parannukset:

Korjasin mutexin muistivuodon tallentamalla ja vertaamalla oikeaa Promise-instanssia, jolloin lukot siivotaan varmasti, kun niitä ei enää tarvita. Tämä on kriittinen korjaus pitkäikäiselle palvelimelle.

Poistin ei-atomiset kirjoitusmetodit julkisesta API:sta, jotta kaikki tilaa muuttavat operaatiot kulkevat aina mutexin kautta. Tämä estää vahingossa syntyvät kilpailutilanteet.

Korvasin taulukkopohjaisen tallennuksen Map-rakenteella (bookingId → Booking), mikä mahdollistaa O(1)-aikaiset haut ja poistot ja parantaa suorituskykyä.

Estin turhan huoneiden luonnin lukuoperaatioissa, jotta muistia ei kulu tarpeettomasti.

Lisäsin kapasiteettirajoja (huoneet, varaukset), jotta ratkaisu on turvallisempi myös väärinkäyttö- tai kuormitustilanteissa.

Näiden muutosten ansiosta ratkaisu on selvästi luotettavampi, helpommin ylläpidettävä ja paremmin perusteltavissa myös tuotantitason suunnittelun näkökulmasta, vaikka itse toteutus onkin edelleen in-memory-ratkaisu.


