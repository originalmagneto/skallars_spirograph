export type Language = 'sk' | 'de' | 'en' | 'cn';

// ... (interface unchanged)



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
    description: string;
    connectionsTitle: string;
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
      description: 'Spolupracujeme s partnermi po celom svete, aby sme vám poskytli komplexné služby bez ohľadu na to, kde podnikáte.',
      connectionsTitle: 'Naše spojenia:',
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
      description: 'Wir arbeiten mit Partnern auf der ganzen Welt zusammen, um Ihnen umfassende Dienstleistungen anzubieten, unabhängig davon, wo Sie geschäftlich tätig sind.',
      connectionsTitle: 'Unsere Verbindungen:',
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
    // ... (unchanged)
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
      description: 'We collaborate with partners around the world to provide you with comprehensive services regardless of where you do business.',
      connectionsTitle: 'Our connections:',
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
  cn: {
    navigation: {
      home: '主页',
      services: '服务',
      countries: '国家',
      team: '团队',
      news: '新闻',
      blog: '博客',
      contact: '联系我们',
    },
    hero: {
      title: 'Skallars',
      subtitle: '为您的企业提供全面的法律支持',
      description: '在 Skallars，我们相信法律援助应该是透明、高效并根据每位客户的需求量身定制的。',
      cta: '联系我们',
    },
    services: {
      title: '关键法律领域的全面法律咨询',
      subtitle: '我们为客户提供包括所有关键法律领域的法律咨询。我们法律服务的目标是最大限度地降低客户方面的法律风险，并在最大程度上减轻他们的法律问题，使他们能够专注于自己的业务。',
      items: {
        corporate: {
          title: '公司法和商业公司',
          description: '解决复杂的公司法和商业公司问题需要专业知识和精确性。我们提供公司成立、公司治理、合同、并购以及合规要求方面的咨询，以确保您的业务在充满活力的环境中蓬勃发展。',
        },
        contracts: {
          title: '合同法',
          description: '合同是成功商业关系的基础。我们起草、审查和谈判根据您的需求量身定制的合同，以保护您的利益并尽量减少风险。',
        },
        litigation: {
          title: '诉讼',
          description: '当发生争议时，我们是您可靠的辩护人。我们经验丰富的律师在法庭上代表您的利益，为您提供战略建议和坚定的代理，旨在实现最佳结果。',
        },
        employment: {
          title: '劳动法',
          description: '驾驭劳动法需要对法规和最佳实践有深入的了解。我们就此提供劳动合同、员工关系、终止雇佣和遵守法律法规方面的建议，以保护您的业务并支持积极的工作环境。',
        },
        realEstate: {
          title: '房地产',
          description: '房地产交易需要精确的规划和法律专业知识。我们提供房地产收购、开发、融资、租赁和销售方面的全面法律服务，以确保您的投资受到保护并确保交易顺畅进行。',
        },
      },
    },
    countries: {
      title: '运营国家',
      subtitle: '国际网络',
      description: '我们与世界各地的合作伙伴合作，无论您在哪里开展业务，都能为您提供全面的服务。',
      connectionsTitle: '我们的连接：',
      currentOffice: '当前办事处',
      officeInfo: {
        Slovakia: {
          city: '布拉迪斯拉发',
          address: 'Staré Grunty 18, 841 04 Bratislava',
          phone: '+421 2 123 456 789',
        },
        'Czech Republic': {
          city: '布拉格',
          address: 'Václavské náměstí 1, 110 00 Prague',
          phone: '+420 2 987 654 321',
        },
        Austria: {
          city: '维也纳',
          address: 'Stephansplatz 1, 1010 Vienna',
          phone: '+43 1 234 567 890',
        },
      },
    },
    team: {
      title: '我们的团队',
      subtitle: '在国际环境中拥有多年实践经验的资深律师',
      businessCard: '名片',
      members: [
        {
          name: 'Marián Čuprík',
          position: '律师',
          description: 'Marián Čuprík，SKALLARS® 律师事务所律师，专注于公司法、科技法和知识产权保护，重点关注新技术领域。',
        },
        {
          name: 'Martin Žák',
          position: '律师',
          description: 'Martin Žák 是 SKALLARS® 的资深律师，专注于公司法和国际交易。',
        },
        {
          name: 'Juraj Hudák',
          position: '律师',
          description: 'Juraj Hudák 在 SKALLARS® 律师事务所专注于诉讼、合同法和劳动法。',
        },
        {
          name: 'Dominic Ye',
          position: 'SKALLARS® 中国合伙律师',
          description: 'Dominic Ye，SKALLARS® 中国合伙律师，提供跨境商业交易和争议解决方面的建议。他拥有深厚的中国法律知识，并为亚洲的国际投资项目提供法律支持。',
        },
      ],
    },
    news: {
      title: '新闻',
      subtitle: '来自法律界的最新文章和评论',
      viewAll: '查看所有文章',
    },
    clients: {
      title: '客户',
      subtitle: '我们为来自不同行业的客户对我们的信任感到自豪',
    },
    contact: {
      title: '联系我们',
      subtitle: '联系我们获得免费咨询',
      address: 'Staré Grunty 18, 841 04 布拉迪斯拉发',
      phone: '+421 2 5443 5941',
      email: 'info@skallars.sk',
      workingHours: '周一至周五：9:00 - 17:00',
    },
    footer: {
      copyright: '© 2023 SKALLARS® 律师事务所。保留所有权利。',
    },
    map: {
      slovakia: '斯洛伐克',
      czechRepublic: '捷克共和国',
    },
  },
};
