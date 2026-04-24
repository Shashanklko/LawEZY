import React, { useEffect, useRef, useState, useCallback } from 'react';
import './Newsroom.css';

const Newsroom = ({ layout = 'horizontal' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);

  // STATIC FALLBACK DATA (4 National, 2 Global, 2 Mixed)
  const fallbackNews = [
    { id: 'f1', source: "ET LEGAL", date: "Apr 05, 2026", title: "SC to hear plea against Allahabad HC's verdict on UP Madarsa Act", summary: "The Supreme Court will examine the constitutional validity following the High Court's recent ruling.", link: "https://legal.economictimes.indiatimes.com/news/industry/sc-to-hear-plea-against-allahabad-hcs-verdict-on-up-madarsa-act/108960875", category: 'National' },
    { id: 'f2', source: "LIVELAW", date: "Apr 05, 2026", title: "Delhi Excise Policy Case: Court Extends Judicial Custody of Manish Sisodia", summary: "The specialized court has granted additional time for the enforcement directorate's investigative phase.", link: "https://www.livelaw.in/top-stories/delhi-excise-policy-case-court-extends-judicial-custody-of-manish-sisodia-254131", category: 'National' },
    { id: 'f3', source: "ABA JOURNAL", date: "Apr 04, 2026", title: "Supreme Court to decide if state laws can regulate social media platforms", summary: "A landmark constitutional case determining the limits of state power over digital moderation.", link: "https://www.abajournal.com/news/article/supreme-court-to-decide-if-state-laws-can-regulate-social-media-platforms", category: 'Global' },
    { id: 'f4', source: "GLOBAL LEGAL", date: "Apr 04, 2026", title: "Global M&A Activity Shows Resilience Amidst Regulatory Headwinds", summary: "Cross-border transaction volumes remain strong as institutional players adapt to new compliance norms.", link: "https://www.globallegalpost.com/news/global-ma-activity-shows-resilience-amidst-regulatory-headwinds-662211", category: 'Global' },
    { id: 'f5', source: "ET LEGAL", date: "Apr 03, 2026", title: "Google Wins Major Antitrust Victory in India as NCLAT Stays CCI Fine", summary: "In a move with global implications, the appellate tribunal provides temporary relief.", link: "https://legal.economictimes.indiatimes.com/news/industry/google-wins-major-antitrust-victory-in-india-nclat-stays-cci-fine-108871122", category: 'National' },
    { id: 'f6', source: "LIVELAW", date: "Apr 03, 2026", title: "LiveLaw Exclusive: Standard Operating Procedures for Virtual Hearings in India", summary: "The Supreme Court's latest guidance on institutionalizing digital access to the judiciary.", link: "https://www.livelaw.in/top-stories/virtual-hearings-sop-supreme-court-guidance-254001", category: 'National' },
    { id: 'f7', source: "ET LEGAL", date: "Apr 02, 2026", title: "Finance Act 2024: Institutional Impacts on Corporate Tax Assessments", summary: "Detailed briefing on the latest legislative changes affecting institutional tax frameworks.", link: "https://legal.economictimes.indiatimes.com/news/policy/finance-act-2024-impacts-on-corporate-taxation-108771133", category: 'National' },
    { id: 'f8', source: "GLOBAL LEGAL", date: "Apr 02, 2026", title: "The Rise of Singapore as the Global Arbitration Hub of Choice", summary: "New data shows a shift in international dispute resolution preferences toward Asian centers.", link: "https://www.globallegalpost.com/news/singapore-rises-as-global-arbitration-hub-661100", category: 'Global' }
  ];

  const fetchNews = React.useCallback(async () => {
    setLoading(true);
    try {
      const feeds = [
        { 
          url: 'https://news.google.com/rss/search?q=site:barandbench.com+OR+site:livelaw.in+OR+site:legal.economictimes.indiatimes.com+legal+news&hl=en-IN&gl=IN&ceid=IN:en', 
          name: 'ELITE_INDIA', 
          type: 'National' 
        },
        { 
          url: 'https://news.google.com/rss/search?q=global+legal+intelligence+analysis+latest&hl=en-US&gl=US&ceid=US:en', 
          name: 'GOOGLE_GLOBAL', 
          type: 'Global' 
        }
      ];

      const results = await Promise.all(
        feeds.map(async (feed) => {
          try {
            const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
            const data = await res.json();
            if (data.status === 'ok') return { ...data, feedType: feed.type };
            return { status: 'error' };
          } catch {
            return { status: 'error' };
          }
        })
      );

      let consolidated = [];
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? "LATEST" : date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: '2-digit', 
          year: 'numeric' 
        });
      };

      const parseGoogleNewsItem = (item, type) => {
        const parts = item.title.split(' - ');
        const source = parts.pop() || "LEGAL SOURCE";
        const cleanTitle = parts.join(' - ');

        return {
          id: `gn-${Math.random().toString(36).substr(2, 9)}`,
          source: source.toUpperCase(),
          date: formatDate(item.pubDate),
          title: cleanTitle,
          summary: item.description.replace(/<[^>]*>?/gm, '').slice(0, 100) + '...',
          link: item.link,
          category: type,
          timestamp: new Date(item.pubDate).getTime()
        };
      };

      // 1. National Pool (Bar & Bench, LiveLaw, etc.)
      const indiaPool = (results[0].items || [])
        .filter(item => new Date(item.pubDate) >= threeDaysAgo)
        .map(item => parseGoogleNewsItem(item, 'National'));

      // 2. Global Pool
      const globalPool = (results[1].items || [])
        .filter(item => new Date(item.pubDate) >= threeDaysAgo)
        .map(item => parseGoogleNewsItem(item, 'Global'));

      // Construct single elite stream (Top 4 overall)
      consolidated = [...indiaPool, ...globalPool]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 4);

      if (consolidated.length < 1) {
        setNewsItems(fallbackNews.slice(0, 4));
      } else {
        setNewsItems(consolidated);
      }

    } catch (error) {
      setNewsItems(fallbackNews.slice(0, 4));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNews();
    const refreshInterval = setInterval(fetchNews, 3600000);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (layout === 'vertical') {
          setIsVisible(true);
        } else {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      clearInterval(refreshInterval);
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, [fetchNews, layout]);

  const NewsSkeleton = () => (
    <div className="news-card skeleton">
      <div className="skeleton-top shimmer"></div>
      <div className="skeleton-title shimmer"></div>
      <div className="skeleton-summary shimmer"></div>
      <div className="skeleton-summary shimmer short"></div>
      <div className="skeleton-bottom-group">
        <div className="skeleton-link shimmer"></div>
        <div className="skeleton-date shimmer"></div>
      </div>
    </div>
  );

  return (
    <section 
      ref={sectionRef} 
      className={`newsroom-professional ${isVisible ? 'reveal-active' : 'reveal-hidden'} ${layout === 'vertical' ? 'vertical-layout' : ''}`}
      id="newsroom"
    >
      <div className="section-header">
        <div className="header-meta">
          <div className="live-status">
            <span className="live-dot"></span>
            LIVE NEWSROOM
          </div>
        </div>
        <div className="header-main">
          <h2 className="news-heading">LawEZY <span>Newsroom</span>.</h2>
          <button className="refresh-btn" onClick={fetchNews} title="Refresh Newsroom">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className={layout === 'vertical' ? 'news-vertical-grid' : 'news-horizontal-grid'}>
        {loading ? (
          Array(4).fill(0).map((_, i) => <NewsSkeleton key={i} />)
        ) : (
          newsItems.map((item) => (
            <div key={item.id} className="news-card">
              <div className="card-top">
                <div className="card-labels">
                  <span className={`news-source ${item.category.toLowerCase()}`}>{item.source}</span>
                </div>
              </div>
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-title-link">
                <h3 className="news-title">{item.title}</h3>
              </a>
              <p className="news-summary">
                {layout === 'vertical' && item.summary.length > 80 
                  ? `${item.summary.substring(0, 80)}...` 
                  : item.summary}
              </p>
              <div className="card-bottom">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="read-more-link">
                  View <span>→</span>
                </a>
                <span className="news-date">{item.date}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default Newsroom;

