export const MOCK_EXPERTS = [
  {
    id: '1',
    name: 'Adv. Sameer Khanna',
    title: 'Senior Corporate Counsel',
    category: 'legal',
    rating: 4.9,
    reviews: 124,
    price: 2500,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    domains: ['Corporate Law', 'M&A', 'Venture Capital', 'Intellectual Property'],
    languages: ['English', 'Hindi', 'French (Institutional)'],
    isVerified: true,
    licenseNo: 'MH/4521/2012',
    affiliations: [
      { name: 'Bar Council of Maharashtra & Goa', verificationLink: '#' },
      { name: 'International Institute of Arbitrators', verificationLink: '#' },
      { name: 'Institutional Corporate Law Society', verificationLink: '#' }
    ],
    servicePortfolio: [
      { id: 'p1', title: 'Seed Round Compliance Package', price: 'From ₹45,000', value: 'Complete regulatory scrubbing and investor-ready documentation for early-stage startups.' },
      { id: 'p2', title: 'M&A Institutional Due Diligence', price: 'Value-Based', value: 'High-precision risk assessment and institutional negotiation support for mid-market acquisitions.' },
      { id: 'p3', title: '1:1 Institutional Counsel (Monthly)', price: '₹1,50,000/mo', value: 'Ongoing institutional-grade legal and institutional advisory for founders and boards.' }
    ],
    impactMetrics: [
      { label: 'Advised Transaction Value', value: '₹500Cr+' },
      { label: 'Regulatory Clearance Rate', value: '98%' },
      { label: 'High-Stakes Board Engagements', value: '25+' },
      { label: 'Global SaaS Re-domiciliations', value: '12' }
    ],
    projectHighlights: [
      { title: 'Series B FinTech Exit', body: 'Institutional lead for a ₹200Cr exit, managing multi-jurisdictional compliance and cross-border IP transfers.' },
      { title: 'Global SaaS Re-domiciliation', body: 'Restructured a Delaware C-Corp to an Indian entity for a top 10 SaaS firm, identifying ₹1.2Cr in tax efficiencies.' }
    ],
    primaryCourt: 'Bombay High Court',
    licenseNo: 'MH/4521/2012',
    professionalHistory: [
      { role: 'Founder & Managing Partner', org: 'Khanna & Co. Institutional Advisors', period: '2020 - Present', status: 'Independent' },
      { role: 'Senior Associate', org: 'Shardul Amarchand Mangaldas', period: '2015 - 2020', status: 'Firm' },
      { role: 'Legal Consultant', org: 'Clifford Chance (London)', period: '2012 - 2015', status: 'Firm' }
    ],
    bioSmall: 'Ex-Magic Circle attorney specializing in multi-jurisdictional compliance and corporate strategy for high-growth startups.',
    location: 'Mumbai, India',
    experience: '12+ Years',
    evidence: {
      cases: [
        { title: "Cross-Border FinTech M&A", year: "2023", outcome: "Successful ₹200Cr Exit", desc: "Lead counsel for a complex cross-border acquisition involving IP transfer across 4 jurisdictions." },
        { title: "SaaS Regulatory Re-domiciliation", year: "2022", outcome: "Zero Compliance Friction", desc: "Managed the complete structural flip of a Delaware entity to an Indian HQ for a Series B startup." },
        { title: "Institutional IP Defense", year: "2021", outcome: "Favorable Settlement", desc: "Defended a core proprietary algorithm for a DeepTech firm against an international patent troll." }
      ],
      achievements: [
        { url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600", title: "Institutional Counsel of the Year 2024" },
        { url: "https://images.unsplash.com/photo-1523287562758-66c7fc58967f?w=600", title: "NLSIU Alumni Excellence Award" }
      ],
      videos: [
        { title: "Modern M&A Strategies", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600" }
      ]
    },
    testimonials: [
      {
        id: 't1',
        clientName: 'Rahul M., Founder of Nexus Tech',
        date: '2 months ago',
        rating: 5.0,
        review: "Adv. Sameer's institutional depth in cross-border M&A is unparalleled. He didn't just handle the legal side; he actively helped us negotiate better terms during our Series B exit."
      },
      {
        id: 't2',
        clientName: 'Priya S., CEO of GreenGrid',
        date: '5 months ago',
        rating: 4.5,
        review: "Khanna is the person you want in the room for compliance. Absolute precision. He spotted three major potential roadblocks in our Delaware flip that our previous firm missed."
      }
    ]
  },
  {
    id: '2',
    name: 'Adv. Priyanka Joshi',
    title: 'Family & Civil Litigator',
    category: 'legal',
    rating: 4.8,
    reviews: 89,
    price: 1800,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    domains: ['Family Law', 'Civil Litigation', 'Property Disputes', 'Arbitration'],
    isVerified: false,
    licenseNo: 'DL/1023/2015',
    bioSmall: 'Dedicated advocate with a focus on resolving complex family and property disputes through institutional litigation and mediation.',
    location: 'Delhi, India',
    experience: '8 Years'
  },
  {
    id: '3',
    name: 'CA Arvind Mehta',
    title: 'Tax & Audit Partner',
    category: 'financial',
    rating: 4.9,
    reviews: 210,
    price: 3000,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=400&fit=crop',
    domains: ['GST Compliance', 'Taxation', 'Statutory Audit', 'Internal Audit'],
    isVerified: true,
    bioSmall: 'Institutional financial advisor helping MNCs and SMEs navigate the complex Indian tax landscape with precision and integrity.',
    location: 'Bangalore, India',
    experience: '15+ Years'
  },
  {
    id: '4',
    name: 'CA Sneha Reddy',
    title: 'Startup Advisory Expert',
    category: 'financial',
    rating: 4.7,
    reviews: 56,
    price: 1500,
    online: false,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    domains: ['Startup Planning', 'Financial Modeling', 'Funding Strategy', 'ROC Compliance'],
    bioSmall: 'Agile financial expert focusing on early-stage startups, providing end-to-end support for funding rounds and scaling.',
    location: 'Hyderabad, India',
    experience: '6 Years'
  },
  {
    id: '5',
    name: 'Rohan Deshmukh, CFA',
    title: 'Investment Institutionalist',
    category: 'financial',
    rating: 5.0,
    reviews: 42,
    price: 5000,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    domains: ['Wealth Management', 'Portfolio Strategy', 'Equity Research', 'Risk Assessment'],
    isVerified: true,
    bioSmall: 'CFA Charterholder providing institutional-grade wealth management and institutional investment advisory for HNWIs.',
    location: 'Pune, India',
    experience: '10 Years'
  }
];
