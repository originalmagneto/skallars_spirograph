export type MockPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  feature_image: string | null;
  feature_image_alt?: string | null;
  published_at: string;
  reading_time?: number;
  html?: string;
  badge?: 'News' | 'Komentár' | 'Analýza';
};

export const MOCK_POSTS: MockPost[] = [
  {
    id: '1',
    title: 'Ako si nastaviť zmluvy, aby chránili vaše podnikanie',
    slug: 'ako-si-nastavit-zmluvy',
    excerpt:
      'Správne nastavené zmluvné podmienky môžu minimalizovať riziká a predísť sporom. Tu je prehľad kľúčových náležitostí.',
    feature_image: '/images/contract-review.jpg',
    feature_image_alt: 'Kontrola zmluvy',
    published_at: new Date('2024-04-15').toISOString(),
    reading_time: 6,
    html: '<p>Správne nastavené zmluvy sú základom bezpečného podnikania. V článku sa pozrieme na najdôležitejšie ustanovenia, ktoré by vám nemali chýbať.</p>',
    badge: 'Komentár',
  },
  {
    id: '2',
    title: 'Najčastejšie chyby pri pracovných zmluvách a ako sa im vyhnúť',
    slug: 'chyby-pri-pracovnych-zmluvach',
    excerpt:
      'Pracovnoprávne vzťahy si vyžadujú precíznosť. Prinášame praktické tipy pre zamestnávateľov aj zamestnancov.',
    feature_image: '/images/corporate-law.jpg',
    feature_image_alt: 'Pracovné právo',
    published_at: new Date('2024-05-10').toISOString(),
    reading_time: 5,
    html: '<p>Pracovné zmluvy často obsahujú nedostatky, ktoré môžu viesť k sporom. Uvádzame niekoľko odporúčaní, ako nastaviť pracovné vzťahy správne.</p>',
    badge: 'News',
  },
  {
    id: '3',
    title: 'Ako postupovať pri súdnom spore: praktický sprievodca',
    slug: 'ako-postupovat-pri-sudnom-spore',
    excerpt:
      'Sporové konanie je náročné na čas aj zdroje. Tento článok vám pomôže pochopiť jednotlivé kroky a pripraviť sa na ne.',
    feature_image: '/images/court-representation.jpg',
    feature_image_alt: 'Súdna sieň',
    published_at: new Date('2024-06-05').toISOString(),
    reading_time: 7,
    html: '<p>Ak sa dostanete do sporu, je dôležité poznať svoje práva a jednotlivé fázy konania. Zhrnuli sme ich pre vás prehľadne.</p>',
    badge: 'Analýza',
  },
  {
    id: '4',
    title: 'GDPR v praxi: čo musia firmy povinne riešiť v roku 2025',
    slug: 'gdpr-v-praxi-2025',
    excerpt:
      'Ochrana osobných údajov nie je jednorazová úloha. Pozrite si aktualizované povinnosti a odporúčania.',
    feature_image: '/images/legal-consultation.jpg',
    feature_image_alt: 'GDPR konzultácia',
    published_at: new Date('2024-07-12').toISOString(),
    reading_time: 5,
    html: '<p>GDPR povinnosti sa vyvíjajú spolu s technológiami. V článku sumarizujeme potrebné kroky pre rok 2025.</p>',
    badge: 'News',
  },
  {
    id: '5',
    title: 'Ako pripraviť firmu na investora: právny due diligence',
    slug: 'priprava-na-investora-due-diligence',
    excerpt:
      'Investícia si vyžaduje pripravenosť. Ukážeme, aké dokumenty a procesy mať v poriadku pred rokovaniami.',
    feature_image: '/images/corporate-law.jpg',
    feature_image_alt: 'Korporátne právo',
    published_at: new Date('2024-08-01').toISOString(),
    reading_time: 8,
    html: '<p>Právny due diligence odhaľuje riziká a zvyšuje dôveru investora. Pripravte si korporátnu dokumentáciu vopred.</p>',
    badge: 'Analýza',
  },
  {
    id: '6',
    title: 'AI a zodpovednosť: kto nesie riziko pri chybe algoritmu?',
    slug: 'ai-a-zodpovednost',
    excerpt:
      'Strojové učenie prináša nové otázky zodpovednosti. Kedy nesie zodpovednosť dodávateľ a kedy používateľ?',
    feature_image: '/images/europe-map.jpg',
    feature_image_alt: 'Umelá inteligencia a právo',
    published_at: new Date('2024-09-14').toISOString(),
    reading_time: 6,
    html: '<p>Rozoberáme modely zodpovednosti pri AI riešeniach a odporúčame zmluvné klauzuly pre prax.</p>',
    badge: 'Komentár',
  },
  {
    id: '7',
    title: 'Nájomné zmluvy pri nehnuteľnostiach: na čo si dať pozor',
    slug: 'najomne-zmluvy-nehnutelnosti',
    excerpt:
      'Od indexácie nájomného po servisné poplatky: prehľad kľúčových ustanovení v nájomných zmluvách.',
    feature_image: '/images/contract-review.jpg',
    feature_image_alt: 'Nájomná zmluva',
    published_at: new Date('2024-10-02').toISOString(),
    reading_time: 5,
    html: '<p>Silná nájomná zmluva chráni nájomcu aj prenajímateľa. Uvádzame praktické tipy a príklady zmluvných klauzúl.</p>',
    badge: 'Komentár',
  },
  {
    id: '8',
    title: 'Pracovné právo: home office a hybridné modely po novom',
    slug: 'home-office-hybridne-modely',
    excerpt:
      'Flexibilná práca vyžaduje úpravy v interných predpisoch a zmluvách. Toto by ste mali riešiť.',
    feature_image: '/images/corporate-law.jpg',
    feature_image_alt: 'Práca na diaľku',
    published_at: new Date('2024-10-20').toISOString(),
    reading_time: 4,
    html: '<p>Home office prináša povinnosti v oblasti BOZP, ochrany údajov aj pracovného času. Pripravte si rámec správne.</p>',
    badge: 'News',
  },
  {
    id: '9',
    title: 'Ako vyhrať spor: dôkazy, taktika a procesná disciplína',
    slug: 'ako-vyhrat-spor',
    excerpt:
      'Výhra v spore je kombináciou dôkazov a stratégie. Pozrite sa, čo rozhoduje najčastejšie.',
    feature_image: '/images/court-representation.jpg',
    feature_image_alt: 'Súdne spory',
    published_at: new Date('2024-11-05').toISOString(),
    reading_time: 9,
    html: '<p>Pripravili sme praktický návod, ako postupovať v sporoch a maximalizovať vaše šance na úspech.</p>',
    badge: 'Analýza',
  },
];


