import React, { useState, useEffect, useRef } from 'react';
import './ReaderSpace.css';
import './NotionWorkspace.css'; // Reusing established Notion styles

const ReaderSpace = ({ book, onExit, onEdit }) => {
  const [blocks] = useState(() => {
    if (book?.blocks) return book.blocks;
    try {
      return JSON.parse(book?.content || '[]');
    } catch (e) {
      return [];
    }
  });
  const [title] = useState(book?.title || 'Untitled Document');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  const isAuthor = book?.author === 'You (Institutionalist)' || book?.authorId === 'current-user-id'; // Simplified check
  
  const blockRefs = useRef({});

  const renderBlock = (block) => {
    switch (block.type) {
      case 'h1': return <h1 className="reader-h1">{block.content}</h1>;
      case 'h2': return <h2 className="reader-h2">{block.content}</h2>;
      case 'h3': return <h3 className="reader-h3">{block.content}</h3>;
      case 'bullet': return <div className="reader-bullet">{block.content}</div>;
      case 'check-list':
        return (
          <div className="reader-check-list">
            <div className={`check-box ${block.metadata?.checked ? 'checked' : ''}`} />
            <span className={block.metadata?.checked ? 'content-checked' : ''}>{block.content}</span>
          </div>
        );
      case 'quote': return <blockquote className="reader-quote">{block.content}</blockquote>;
      case 'callout': return <div className="reader-callout">{block.content}</div>;
      case 'divider': return <div className="reader-divider" />;
      case 'code': return <pre className="reader-code"><code>{block.content}</code></pre>;
      case 'image': return <div className="reader-image"><img src={block.content} alt="Content" /></div>;
      case 'table':
        try {
          const rows = JSON.parse(block.content || '[[]]');
          return (
            <div className="reader-table-wrapper">
              <table className="notion-table">
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        } catch (e) { return null; }
      default: return <p className="reader-text">{block.content}</p>;
    }
  };

  return (
    <div className={`notion-workspace-container reader-mode ${darkMode ? 'dark-mode' : ''} animate-fade`}>
      {/* SIDEBAR */}
      <aside className={`notion-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="inst-brand-logo small">LAWEZY</div>
          <button className="btn-ghost" onClick={() => setSidebarOpen(false)}>◀</button>
        </div>
        
        <div className="sidebar-item active">
          <span className="icon">📖</span>
          <span className="label">{title}</span>
        </div>

        <div className="sidebar-section-label">OUTLINE</div>
        <div className="sidebar-outline">
          {blocks.filter(b => ['h1', 'h2', 'h3'].includes(b.type)).map(h => (
            <div key={h.id} className="sidebar-item" onClick={() => {
              blockRefs.current[h.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <span className="icon" style={{ fontSize: '10px', opacity: 0.5 }}>●</span>
              <span className="label" style={{ 
                fontSize: '13px', 
                paddingLeft: h.type === 'h2' ? '10px' : h.type === 'h3' ? '20px' : '0' 
              }}>{h.content}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto' }}>
           <div className="sidebar-item" onClick={() => setDarkMode(!darkMode)}>
             <span className="icon">{darkMode ? '☀️' : '🌙'}</span>
             <span className="label">{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
           </div>
           <div className="sidebar-item" onClick={onExit}>
             <span className="icon">🚪</span>
             <span className="label">Exit Reader</span>
           </div>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="notion-main-editor">
        {!sidebarOpen && (
          <>
            <div className="notion-toggle-sidebar-btn">
              <button className="notion-toggle-sidebar" onClick={() => setSidebarOpen(true)}>☰</button>
            </div>
            <div className="notion-collapsed-branding">
              <div className="institutional-brand-logo small">LAWEZY</div>
            </div>
          </>
        )}

        <div className="notion-top-nav">
          <div className="top-nav-left" />
          <div className="top-nav-right">
            {isAuthor && (
              <button 
                className="btn-publish success" 
                onClick={() => onEdit(title, blocks)}
                style={{ background: 'var(--notion-text)', color: 'var(--notion-bg)', border: 'none' }}
              >
                Edit Document
              </button>
            )}
          </div>
        </div>

        <div className="notion-editor-canvas">
          <div className="notion-title-section">
            <h1 className="reader-main-title">{title}</h1>
          </div>

          <div className="reader-content">
            {blocks.map(block => (
              <div key={block.id} ref={el => blockRefs.current[block.id] = el} className="reader-block-wrapper">
                {renderBlock(block)}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReaderSpace;

