export type Language = 'sk' | 'en' | 'de';

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
      subtitle: 'Poskytujeme široké spektrum právnych služieb pre podniky aj jednotlivcov',
      items: {
        corporate: {
          title: 'Obchodné právo',
          description: 'Založenie spoločností, fúzie a akvizície, corporate governance',
        },
        contracts: {
          title: 'Zmluvné právo',
          description: 'Priprava a vyjednávanie zmlúv, due diligence, compliance',
        },
        litigation: {
          title: 'Súdne spory',
          description: 'Občianske, obchodné a správne súdne konania',
        },
        employment: {
          title: 'Pracovné právo',
          description: 'Pracovné zmluvy, spory, kolektívne vyjednávanie',
        },
        realEstate: {
          title: 'Nehnuteľnosti',
          description: 'Kúpa, predaj, prenájom, development projektov',
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
          phone: '+421 2 5443 5941',
        },
        'Czech Republic': {
          city: 'Praha',
          address: 'Bozděchova 7, 150 00 Praha 5',
          phone: '+420 224 103 316',
        },
        Austria: {
          city: 'Viedeň',
          address: 'Kärntner Ring 5-7, 1010 Wien',
          phone: '+43 1 234 5678',
        },
      },
    },
    team: {
      title: 'Náš tím',
      subtitle: 'Skúsení advokáti s dlhoročnou praxou v medzinárodnom prostredí',
      businessCard: 'Vizitka',
      members: [
        {
          name: 'Mgr. Peter Skallar',
          position: 'Managing Partner',
          description: 'Špecializuje sa na obchodné právo a medzinárodné transakcie',
        },
        {
          name: 'Mgr. Jana Nováková',
          position: 'Senior Associate',
          description: 'Expertka na pracovné právo a compliance',
        },
        {
          name: 'Mgr. Tomáš Svoboda',
          position: 'Partner',
          description: 'Špecialista na nehnuteľnosti a development',
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
      subtitle: 'We provide a wide range of legal services for businesses and individuals',
      items: {
        corporate: {
          title: 'Corporate Law',
          description: 'Company formation, mergers and acquisitions, corporate governance',
        },
        contracts: {
          title: 'Contract Law',
          description: 'Contract preparation and negotiation, due diligence, compliance',
        },
        litigation: {
          title: 'Litigation',
          description: 'Civil, commercial and administrative court proceedings',
        },
        employment: {
          title: 'Employment Law',
          description: 'Employment contracts, disputes, collective bargaining',
        },
        realEstate: {
          title: 'Real Estate',
          description: 'Purchase, sale, lease, development projects',
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
          phone: '+421 2 5443 5941',
        },
        'Czech Republic': {
          city: 'Prague',
          address: 'Bozděchova 7, 150 00 Praha 5',
          phone: '+420 224 103 316',
        },
        Austria: {
          city: 'Vienna',
          address: 'Kärntner Ring 5-7, 1010 Wien',
          phone: '+43 1 234 5678',
        },
      },
    },
    team: {
      title: 'Our Team',
      subtitle: 'Experienced lawyers with long-term practice in international environment',
      businessCard: 'Business Card',
      members: [
        {
          name: 'Mgr. Peter Skallar',
          position: 'Managing Partner',
          description: 'Specializes in corporate law and international transactions',
        },
        {
          name: 'Mgr. Jana Nováková',
          position: 'Senior Associate',
          description: 'Expert in employment law and compliance',
        },
        {
          name: 'Mgr. Tomáš Svoboda',
          position: 'Partner',
          description: 'Specialist in real estate and development',
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
      subtitle: 'Wir bieten ein breites Spektrum an Rechtsdienstleistungen für Unternehmen und Privatpersonen',
      items: {
        corporate: {
          title: 'Gesellschaftsrecht',
          description: 'Unternehmensgründung, Fusionen und Übernahmen, Corporate Governance',
        },
        contracts: {
          title: 'Vertragsrecht',
          description: 'Vertragserstellung und -verhandlung, Due Diligence, Compliance',
        },
        litigation: {
          title: 'Prozessführung',
          description: 'Zivil-, Handels- und Verwaltungsgerichtsverfahren',
        },
        employment: {
          title: 'Arbeitsrecht',
          description: 'Arbeitsverträge, Streitigkeiten, Tarifverhandlungen',
        },
        realEstate: {
          title: 'Immobilienrecht',
          description: 'Kauf, Verkauf, Miete, Entwicklungsprojekte',
        },
      },
    },
    countries: {
      title: 'Tätigkeitsländer',
      subtitle: 'Wir sind in drei wichtigen Ländern der Region tätig. Unsere Anwälte bieten Rechtsdienstleistungen in Slowakisch und Tschechisch mit zuverlässiger Unterstützung in Österreich.',
      currentOffice: 'Aktuelles Büro',
      officeInfo: {
        Slovakia: {
          city: 'Bratislava',
          address: 'Staré Grunty 18, 841 04 Bratislava',
          phone: '+421 2 5443 5941',
        },
        'Czech Republic': {
          city: 'Prag',
          address: 'Bozděchova 7, 150 00 Praha 5',
          phone: '+420 224 103 316',
        },
        Austria: {
          city: 'Wien',
          address: 'Kärntner Ring 5-7, 1010 Wien',
          phone: '+43 1 234 5678',
        },
      },
    },
    team: {
      title: 'Unser Team',
      subtitle: 'Erfahrene Anwälte mit langjähriger Praxis im internationalen Umfeld',
      businessCard: 'Visitenkarte',
      members: [
        {
          name: 'Mgr. Peter Skallar',
          position: 'Managing Partner',
          description: 'Spezialisiert auf Gesellschaftsrecht und internationale Transaktionen',
        },
        {
          name: 'Mgr. Jana Nováková',
          position: 'Senior Associate',
          description: 'Expertin für Arbeitsrecht und Compliance',
        },
        {
          name: 'Mgr. Tomáš Svoboda',
          position: 'Partner',
          description: 'Spezialist für Immobilienrecht und Entwicklung',
        },
      ],
    },
    news: {
      title: 'Nachrichten',
      subtitle: 'Neueste Artikel und Kommentare aus der Rechtswelt',
      viewAll: 'Alle Artikel anzeigen',
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
  },
};
