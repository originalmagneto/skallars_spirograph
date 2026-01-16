export type Language = 'sk' | 'de' | 'en';

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
  clients: {
    title: string;
    subtitle: string;
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
  map: {
    slovakia: string;
    czechRepublic: string;
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
      subtitle: 'Medzinárodná sieť',
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
    clients: {
      title: 'Klienti',
      subtitle: 'Sme hrdí na dôveru, ktorú nám prejavujú naši klienti z rôznych odvetví',
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
    map: {
      slovakia: 'Slovensko',
      czechRepublic: 'Česko',
    },
  },
  de: {
    navigation: {
      home: 'Startseite',
      services: 'Dienstleistungen',
      countries: 'Länder',
      team: 'Team',
      news: 'Nachrichten',
      blog: 'Blog',
      contact: 'Kontakt',
    },
    hero: {
      title: 'Skallars',
      subtitle: 'Umfassende rechtliche Unterstützung für Ihr Unternehmen.',
      description: 'Bei Skallars glauben wir, dass rechtliche Unterstützung transparent, effektiv und auf die Bedürfnisse jedes Kunden zugeschnitten sein sollte.',
      cta: 'Kontaktieren Sie uns',
    },
    services: {
      title: 'Umfassende Rechtsberatung in wichtigen Rechtsbereichen',
      subtitle: 'Wir bieten unseren Kunden Rechtsberatung in allen wichtigen Rechtsbereichen. Das Ziel unserer Rechtsdienstleistungen ist es, rechtliche Risiken auf der Kundenseite zu minimieren und sie von rechtlichen Problemen in größtmöglichem Umfang zu entlasten, damit sie sich voll und ganz auf ihr Geschäft konzentrieren können.',
      items: {
        corporate: {
          title: 'Gesellschaftsrecht und Handelsgesellschaften',
          description: 'Die Lösung komplexer Fragen des Gesellschaftsrechts und der Handelsgesellschaften erfordert Expertise und Präzision. Wir bieten Beratung in den Bereichen Unternehmensgründung, Corporate Governance, Verträge, Fusionen und Übernahmen sowie bei der Einhaltung regulatorischer Anforderungen, damit Ihr Unternehmen in einem dynamischen Umfeld prosperiert.',
        },
        contracts: {
          title: 'Vertragsrecht',
          description: 'Verträge sind die Grundlage erfolgreicher Geschäftsbeziehungen. Wir erstellen, prüfen und verhandeln Verträge, die auf Ihre Bedürfnisse zugeschnitten sind, um Ihre Interessen zu schützen und Risiken zu minimieren.',
        },
        litigation: {
          title: 'Prozessführung',
          description: 'Bei der Entstehung von Streitigkeiten sind wir Ihre zuverlässigen Anwälte. Unsere erfahrenen Rechtsanwälte vertreten Ihre Interessen vor Gerichten und bieten strategische Beratung und solide Vertretung mit dem Ziel, das bestmögliche Ergebnis zu erzielen.',
        },
        employment: {
          title: 'Arbeitsrecht',
          description: 'Die Orientierung im Arbeitsrecht erfordert tiefgreifende Kenntnisse der Vorschriften und bewährter Praktiken. Wir beraten in Fragen von Arbeitsverträgen, Mitarbeiterbeziehungen, Beendigung des Arbeitsverhältnisses und Einhaltung rechtlicher Vorschriften, um Ihr Unternehmen zu schützen und eine positive Arbeitsumgebung zu fördern.',
        },
        realEstate: {
          title: 'Immobilien',
          description: 'Immobilientransaktionen erfordern präzise Planung und rechtliche Expertise. Wir bieten umfassende Rechtsdienstleistungen bei Erwerb, Entwicklung, Finanzierung, Vermietung und Verkauf von Immobilien, um den Schutz Ihrer Investitionen und einen reibungslosen Transaktionsablauf zu gewährleisten.',
        },
      },
    },
    countries: {
      title: 'Tätigkeitsländer',
      subtitle: 'Internationales Netzwerk',
      currentOffice: 'Aktuelles Büro',
      officeInfo: {
        Slovakia: {
          city: 'Bratislava',
          address: 'Staré Grunty 18, 841 04 Bratislava',
          phone: '+421 2 123 456 789',
        },
        'Czech Republic': {
          city: 'Prag',
          address: 'Václavské náměstí 1, 110 00 Prag',
          phone: '+420 2 987 654 321',
        },
        Austria: {
          city: 'Wien',
          address: 'Stephansplatz 1, 1010 Wien',
          phone: '+43 1 234 567 890',
        },
      },
    },
    team: {
      title: 'Unser Team',
      subtitle: 'Erfahrene Anwälte mit langjähriger Praxis im internationalen Umfeld',
      businessCard: 'Visitenkarte',
      members: [
        {
          name: 'Marián Čuprík',
          position: 'Rechtsanwalt',
          description: 'Marián Čuprík, in der Anwaltskanzlei SKALLARS®, spezialisiert sich auf Gesellschaftsrecht, Technologierecht und Schutz geistigen Eigentums mit Schwerpunkt auf neuen Technologien.',
        },
        {
          name: 'Martin Žák',
          position: 'Rechtsanwalt',
          description: 'Martin Žák ist ein erfahrener Rechtsanwalt bei SKALLARS®, spezialisiert auf Gesellschaftsrecht und internationale Transaktionen.',
        },
        {
          name: 'Juraj Hudák',
          position: 'Rechtsanwalt',
          description: 'Juraj Hudák ist in der Anwaltskanzlei SKALLARS® auf Prozessführung, Vertragsrecht und Arbeitsrecht fokussiert.',
        },
        {
          name: 'Dominic Ye',
          position: 'Partneranwalt SKALLARS® für China',
          description: 'Dominic Ye, Partneranwalt SKALLARS® für China, bietet Beratung im Bereich grenzüberschreitender Geschäftstransaktionen und Streitbeilegung. Er verfügt über tiefgreifende Kenntnisse im chinesischen Recht und bietet rechtliche Unterstützung bei internationalen Investitionsprojekten in Asien.',
        },
      ],
    },
    news: {
      title: 'Nachrichten',
      subtitle: 'Neueste Artikel und Kommentare aus der Rechtswelt',
      viewAll: 'Alle Artikel anzeigen',
    },
    clients: {
      title: 'Kunden',
      subtitle: 'Wir sind stolz auf das Vertrauen, das uns unsere Kunden aus verschiedenen Branchen entgegenbringen',
    },
    contact: {
      title: 'Kontakt',
      subtitle: 'Kontaktieren Sie uns für eine kostenlose Beratung',
      address: 'Staré Grunty 18, 841 04 Bratislava',
      phone: '+421 2 5443 5941',
      email: 'info@skallars.sk',
      workingHours: 'Montag - Freitag: 9:00 - 17:00',
    },
    footer: {
      copyright: '© 2023 SKALLARS® Anwaltskanzlei. Alle Rechte vorbehalten.',
    },
    map: {
      slovakia: 'Slowakei',
      czechRepublic: 'Tschechien',
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
      subtitle: 'International Network',
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
    clients: {
      title: 'Clients',
      subtitle: 'We are proud of the trust that our clients from various industries place in us',
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
    map: {
      slovakia: 'Slovakia',
      czechRepublic: 'Czech Republic',
    },
  },
};
