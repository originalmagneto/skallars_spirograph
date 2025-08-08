export type Language = 'sk' | 'cz' | 'en';

export interface Translations {
  navigation: {
    home: string;
    services: string;
    countries: string;
    team: string;
    news: string;
    blog: string;
    contact: string;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
    cta: string;
  };
  services: {
    title: string;
    subtitle: string;
    items: {
      corporate: {
        title: string;
        description: string;
      };
      contracts: {
        title: string;
        description: string;
      };
      litigation: {
        title: string;
        description: string;
      };
      employment: {
        title: string;
        description: string;
      };
      realEstate: {
        title: string;
        description: string;
      };
    };
  };
  countries: {
    title: string;
    subtitle: string;
    currentOffice: string;
    officeInfo: {
      Slovakia: {
        city: string;
        address: string;
        phone: string;
      };
      'Czech Republic': {
        city: string;
        address: string;
        phone: string;
      };
      Austria: {
        city: string;
        address: string;
        phone: string;
      };
    };
  };
  team: {
    title: string;
    subtitle: string;
    businessCard: string;
    members: {
      name: string;
      position: string;
      description: string;
    }[];
  };
  news: {
    title: string;
    subtitle: string;
    viewAll: string;
  };
  contact: {
    title: string;
    subtitle: string;
    address: string;
    phone: string;
    email: string;
    workingHours: string;
  };
  footer: {
    copyright: string;
  };
}

export const translations: Record<Language, Translations> = {
  sk: {
    navigation: {
      home: 'Domov',
      services: 'Služby',
      countries: 'Krajiny',
      team: 'Tím',
      news: 'Novinky',
      blog: 'Blog',
      contact: 'Kontakt',
    },
    hero: {
      title: 'Skallars',
      subtitle: 'Komplexná právna podpora pre Vaše podnikanie.',
      description: 'V Skallars veríme, že právna pomoc by mala byť transparentná, efektívna a prispôsobená potrebám každého klienta.',
      cta: 'Kontaktujte nás',
    },
    services: {
      title: 'Komplexné právne poradenstvo v kľúčových právnych oblastiach',
      subtitle: 'Našim klientom poskytujeme právne poradenstvo vo všetkých kľúčových právnych oblastiach. Cieľom našich právnych služieb je minimalizovať právne riziká na strane klientov a odbremeniť ich od právnych problémov v čo najväčšej miere, aby sa mohli naplno sústrediť na svoje podnikanie.',
      items: {
        corporate: {
          title: 'Obchodné právo a obchodné spoločnosti',
          description: 'Riešenie komplexných otázok obchodného práva a obchodných spoločností si vyžaduje odbornosť a precíznosť. Poskytujeme poradenstvo v oblasti zakladania spoločností, korporátneho riadenia, zmlúv, fúzií a akvizícií, ako aj pri dodržiavaní regulačných požiadaviek, aby vaše podnikanie prosperovalo v dynamickom prostredí.',
        },
        contracts: {
          title: 'Zmluvné právo',
          description: 'Zmluvy sú základom úspešných obchodných vzťahov. Pripravujeme, posudzujeme a vyjednávame zmluvy prispôsobené vašim potrebám, aby sme chránili vaše záujmy a minimalizovali riziká.',
        },
        litigation: {
          title: 'Súdne spory',
          description: 'Pri vzniku sporov sme vašimi spoľahlivými obhajcami. Naši skúsení právnici zastupujú vaše záujmy pred súdmi a poskytujú strategické poradenstvo a pevnú reprezentáciu s cieľom dosiahnuť čo najlepší výsledok.',
        },
        employment: {
          title: 'Pracovné právo',
          description: 'Orientácia v oblasti pracovného práva si vyžaduje hlboké znalosti predpisov a osvedčených postupov. Radíme v otázkach pracovných zmlúv, vzťahov so zamestnancami, ukončenia pracovného pomeru a dodržiavania právnych predpisov, aby sme chránili vaše podnikanie a podporili pozitívne pracovné prostredie.',
        },
        realEstate: {
          title: 'Nehnuteľnosti',
          description: 'Transakcie s nehnuteľnosťami si vyžadujú precízne plánovanie a právnu odbornosť. Poskytujeme komplexné právne služby pri nadobúdaní, vývoji, financovaní, prenájme a predaji nehnuteľností, aby sme zaistili ochranu vašich investícií a hladký priebeh transakcií.',
        },
      },
    },
    countries: {
      title: 'Krajiny pôsobnosti',
      subtitle: 'Pôsobíme v troch kľúčových krajinách regiónu. Naši advokáti poskytujú právne služby v slovenčine a češtine, so spoľahlivým zázemím v Rakúsku.',
      currentOffice: 'Aktuálna kancelária',
      officeInfo: {
        Slovakia: {
          city: 'Bratislava',
          address: 'Staré Grunty 18, 841 04 Bratislava',
          phone: '+421 2 123 456 789',
        },
        'Czech Republic': {
          city: 'Praha',
          address: 'Václavské náměstí 1, 110 00 Prague',
          phone: '+420 2 987 654 321',
        },
        Austria: {
          city: 'Vienna',
          address: 'Stephansplatz 1, 1010 Vienna',
          phone: '+43 1 234 567 890',
        },
      },
    },
    team: {
      title: 'Náš tím',
      subtitle: 'Skúsení advokáti s dlhoročnou praxou v medzinárodnom prostredí',
      businessCard: 'Vizitka',
      members: [
        {
          name: 'Marián Čuprík',
          position: 'Advokát',
          description: 'Marián Čuprík, v advokátskej kancelárii SKALLARS®, sa špecializuje na korporátne, technologické právo a ochranu duševného vlastníctva, s dôrazom na nové technológie.',
        },
        {
          name: 'Martin Žák',
          position: 'Advokát',
          description: 'Martin Žák je skúsený advokát v SKALLARS®, špecializujúci sa na obchodné právo a medzinárodné transakcie.',
        },
        {
          name: 'Juraj Hudák',
          position: 'Advokát',
          description: 'Juraj Hudák je v advokátskej kancelárii SKALLARS® zameraním na litigácie, zmluvné právo a pracovné právo.',
        },
        {
          name: 'Dominic Ye',
          position: 'Partnerský advokát SKALLARS® pre Čínu',
          description: 'Dominic Ye, partnerský advokát SKALLARS® pre Čínu, ponúka poradenstvo v oblasti cezhraničných obchodných transakcií a riešenia sporov. Disponuje hlbokými znalosťami v oblasti čínskeho práva a poskytuje právnu podporu pri medzinárodných investičných projektoch v Ázii.',
        },
      ],
    },
    news: {
      title: 'Novinky',
      subtitle: 'Najnovšie články a komentáre z právneho sveta',
      viewAll: 'Zobraziť všetky články',
    },
    contact: {
      title: 'Kontakt',
      subtitle: 'Kontaktujte nás pre bezplatnú konzultáciu',
      address: 'Staré Grunty 18, 841 04 Bratislava',
      phone: '+421 2 5443 5941',
      email: 'info@skallars.sk',
      workingHours: 'Pondelok - Piatok: 9:00 - 17:00',
    },
    footer: {
      copyright: '© 2023 Advokátska kancelária SKALLARS®. Všetky práva vyhradené.',
    },
  },
  cz: {
    navigation: {
      home: 'Domů',
      services: 'Služby',
      countries: 'Země',
      team: 'Tým',
      news: 'Novinky',
      blog: 'Blog',
      contact: 'Kontakt',
    },
    hero: {
      title: 'Skallars',
      subtitle: 'Komplexní právní podpora pro vaše podnikání.',
      description: 'Ve Skallars věříme, že právní pomoc by měla být transparentní, efektivní a přizpůsobená potřebám každého klienta.',
      cta: 'Kontaktujte nás',
    },
    services: {
      title: 'Komplexní právní poradenství v klíčových právních oblastech',
      subtitle: 'Našim klientům poskytujeme právní poradenství ve všech klíčových právních oblastech. Cílem našich právních služeb je minimalizovat právní rizika na straně klientů a odbřemenit je od právních problémů v co největší míře, aby se mohli naplno soustředit na své podnikání.',
      items: {
        corporate: {
          title: 'Obchodní právo a obchodní společnosti',
          description: 'Řešení komplexních otázek obchodního práva a obchodních společností vyžaduje odbornost a preciznost. Poskytujeme poradenství v oblasti zakládání společností, korporátního řízení, smluv, fúzí a akvizic, jakož i při dodržování regulačních požadavků, aby vaše podnikání prosperovalo v dynamickém prostředí.',
        },
        contracts: {
          title: 'Smluvní právo',
          description: 'Smlouvy jsou základem úspěšných obchodních vztahů. Připravujeme, posuzujeme a vyjednáváme smlouvy přizpůsobené vašim potřebám, abychom chránili vaše zájmy a minimalizovali rizika.',
        },
        litigation: {
          title: 'Soudní spory',
          description: 'Při vzniku sporů jsme vašimi spolehlivými obhájci. Naši zkušení právníci zastupují vaše zájmy před soudy a poskytují strategické poradenství a pevnou reprezentaci s cílem dosáhnout co nejlepšího výsledku.',
        },
        employment: {
          title: 'Pracovní právo',
          description: 'Orientace v oblasti pracovního práva vyžaduje hluboké znalosti předpisů a osvědčených postupů. Radíme v otázkách pracovních smluv, vztahů se zaměstnanci, ukončení pracovního poměru a dodržování právních předpisů, abychom chránili vaše podnikání a podporovali pozitivní pracovní prostředí.',
        },
        realEstate: {
          title: 'Nemovitosti',
          description: 'Transakce s nemovitostmi vyžadují precizní plánování a právní odbornost. Poskytujeme komplexní právní služby při nabývání, vývoji, financování, pronájmu a prodeji nemovitostí, abychom zajistili ochranu vašich investic a hladký průběh transakcí.',
        },
      },
    },
    countries: {
      title: 'Země působnosti',
      subtitle: 'Působíme ve třech klíčových zemích regionu. Naši advokáti poskytují právní služby ve slovenštině a češtině, se spolehlivým zázemím v Rakousku.',
      currentOffice: 'Aktuální kancelář',
      officeInfo: {
        Slovakia: {
          city: 'Bratislava',
          address: 'Staré Grunty 18, 841 04 Bratislava',
          phone: '+421 2 123 456 789',
        },
        'Czech Republic': {
          city: 'Praha',
          address: 'Václavské náměstí 1, 110 00 Prague',
          phone: '+420 2 987 654 321',
        },
        Austria: {
          city: 'Vienna',
          address: 'Stephansplatz 1, 1010 Vienna',
          phone: '+43 1 234 567 890',
        },
      },
    },
    team: {
      title: 'Náš tým',
      subtitle: 'Zkušení advokáti s dlouholetou praxí v mezinárodním prostředí',
      businessCard: 'Vizitka',
      members: [
        {
          name: 'Marián Čuprík',
          position: 'Advokát',
          description: 'Marián Čuprík, v advokátní kanceláři SKALLARS®, se specializuje na korporátní, technologické právo a ochranu duševního vlastnictví, s důrazem na nové technologie.',
        },
        {
          name: 'Martin Žák',
          position: 'Advokát',
          description: 'Martin Žák je zkušený advokát v SKALLARS®, specializující se na obchodní právo a mezinárodní transakce.',
        },
        {
          name: 'Juraj Hudák',
          position: 'Advokát',
          description: 'Juraj Hudák je v advokátní kanceláři SKALLARS® zaměřením na litigace, smluvní právo a pracovní právo.',
        },
        {
          name: 'Dominic Ye',
          position: 'Partnerský advokát SKALLARS® pro Čínu',
          description: 'Dominic Ye, partnerský advokát SKALLARS® pro Čínu, nabízí poradenství v oblasti přeshraničních obchodních transakcí a řešení sporů. Disponuje hlubokými znalostmi v oblasti čínského práva a poskytuje právní podporu při mezinárodních investičních projektech v Asii.',
        },
      ],
    },
    news: {
      title: 'Novinky',
      subtitle: 'Nejnovější články a komentáře z právního světa',
      viewAll: 'Zobrazit všechny články',
    },
    contact: {
      title: 'Kontakt',
      subtitle: 'Kontaktujte nás pro bezplatnou konzultaci',
      address: 'Staré Grunty 18, 841 04 Bratislava',
      phone: '+421 2 5443 5941',
      email: 'info@skallars.sk',
      workingHours: 'Pondělí - Pátek: 9:00 - 17:00',
    },
    footer: {
      copyright: '© 2023 Advokátní kancelář SKALLARS®. Všechna práva vyhrazena.',
    },
  },
  en: {
    navigation: {
      home: 'Home',
      services: 'Services',
      countries: 'Countries',
      team: 'Team',
      news: 'News',
      blog: 'Blog',
      contact: 'Contact',
    },
    hero: {
      title: 'Skallars',
      subtitle: 'Comprehensive legal support for your business.',
      description: 'At Skallars, we believe that legal assistance should be transparent, effective and tailored to each client\'s needs.',
      cta: 'Contact us',
    },
    services: {
      title: 'Comprehensive legal advice in key legal areas',
      subtitle: 'We provide our clients with legal advice in all key legal areas. The goal of our legal services is to minimize legal risks on the client side and relieve them of legal problems to the greatest extent possible, so they can fully focus on their business.',
      items: {
        corporate: {
          title: 'Corporate Law and Business Companies',
          description: 'Solving complex issues of corporate law and business companies requires expertise and precision. We provide advice in the areas of company formation, corporate governance, contracts, mergers and acquisitions, as well as compliance with regulatory requirements, so that your business prospers in a dynamic environment.',
        },
        contracts: {
          title: 'Contract Law',
          description: 'Contracts are the foundation of successful business relationships. We prepare, review and negotiate contracts tailored to your needs to protect your interests and minimize risks.',
        },
        litigation: {
          title: 'Litigation',
          description: 'When disputes arise, we are your reliable advocates. Our experienced lawyers represent your interests before courts and provide strategic advice and solid representation with the goal of achieving the best possible result.',
        },
        employment: {
          title: 'Employment Law',
          description: 'Navigating employment law requires deep knowledge of regulations and proven practices. We advise on employment contracts, employee relations, termination of employment and compliance with legal regulations to protect your business and support a positive work environment.',
        },
        realEstate: {
          title: 'Real Estate',
          description: 'Real estate transactions require precise planning and legal expertise. We provide comprehensive legal services in acquisition, development, financing, leasing and sale of real estate to ensure protection of your investments and smooth transaction flow.',
        },
      },
    },
    countries: {
      title: 'Countries of Operation',
      subtitle: 'We operate in three key countries in the region. Our lawyers provide legal services in Slovak and Czech, with reliable support in Austria.',
      currentOffice: 'Current Office',
      officeInfo: {
        Slovakia: {
          city: 'Bratislava',
          address: 'Staré Grunty 18, 841 04 Bratislava',
          phone: '+421 2 123 456 789',
        },
        'Czech Republic': {
          city: 'Prague',
          address: 'Václavské náměstí 1, 110 00 Prague',
          phone: '+420 2 987 654 321',
        },
        Austria: {
          city: 'Vienna',
          address: 'Stephansplatz 1, 1010 Vienna',
          phone: '+43 1 234 567 890',
        },
      },
    },
    team: {
      title: 'Our Team',
      subtitle: 'Experienced lawyers with long-term practice in international environment',
      businessCard: 'Business Card',
      members: [
        {
          name: 'Marián Čuprík',
          position: 'Attorney',
          description: 'Marián Čuprík, at SKALLARS® law firm, specializes in corporate, technology law and intellectual property protection, with emphasis on new technologies.',
        },
        {
          name: 'Martin Žák',
          position: 'Attorney',
          description: 'Martin Žák is an experienced attorney at SKALLARS®, specializing in corporate law and international transactions.',
        },
        {
          name: 'Juraj Hudák',
          position: 'Attorney',
          description: 'Juraj Hudák is at SKALLARS® law firm focused on litigation, contract law and employment law.',
        },
        {
          name: 'Dominic Ye',
          position: 'Partner Attorney SKALLARS® for China',
          description: 'Dominic Ye, partner attorney SKALLARS® for China, offers advice in cross-border business transactions and dispute resolution. He has deep knowledge of Chinese law and provides legal support for international investment projects in Asia.',
        },
      ],
    },
    news: {
      title: 'News',
      subtitle: 'Latest articles and comments from the legal world',
      viewAll: 'View all articles',
    },
    contact: {
      title: 'Contact',
      subtitle: 'Contact us for a free consultation',
      address: 'Staré Grunty 18, 841 04 Bratislava',
      phone: '+421 2 5443 5941',
      email: 'info@skallars.sk',
      workingHours: 'Monday - Friday: 9:00 - 17:00',
    },
    footer: {
      copyright: '© 2023 SKALLARS® Law Firm. All rights reserved.',
    },

};
