import React, { useState, useEffect, useRef } from 'react';
import './NotionWorkspace.css';

const BLOCK_TYPES = [
  { id: 'text', label: 'Text', icon: '¶', desc: 'Plain text for drafting' },
  { id: 'h1', label: 'Heading 1', icon: 'H1', desc: 'Large section header' },
  { id: 'h2', label: 'Heading 2', icon: 'H2', desc: 'Medium section header' },
  { id: 'h3', label: 'Heading 3', icon: 'H3', desc: 'Small section header' },
  { id: 'bullet', label: 'Bulleted List', icon: '•', desc: 'Create a simple list' },
  { id: 'check-list', label: 'Checklist', icon: '☑', desc: 'Track task completion' },
  { id: 'quote', label: 'Quote', icon: '"', desc: 'Capture inspiration' },
  { id: 'divider', label: 'Divider', icon: '—', desc: 'Visually separate content' },
  { id: 'code', label: 'Code', icon: '<>', desc: 'Add code or logic' },
  { id: 'image', label: 'Image', icon: '📷', desc: 'Embed an image via URL' },
  { id: 'table', label: 'Table', icon: '田', desc: 'Add structure with rows/cols' },
];

const NotionWorkspace = ({ onExit, onPublish, initialBlocks = [], initialTitle = '' }) => {
  const [blocks, setBlocks] = useState(initialBlocks.length > 0 ? initialBlocks : [
    { id: 'b1', type: 'text', content: '' }
  ]);
  const [title, setTitle] = useState(initialTitle);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [slashMenu, setSlashMenu] = useState({ visible: false, x: 0, y: 0, search: '', blockId: null });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [floatingToolbar, setFloatingToolbar] = useState({ visible: false, x: 0, y: 0 });

  const blockRefs = useRef({});

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setFloatingToolbar({
          visible: true,
          x: rect.left + rect.width / 2,
          y: rect.top - 40
        });
      } else {
        setFloatingToolbar(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const addBlock = (afterId, type = 'text') => {
    const newBlock = { id: Math.random().toString(36).substr(2, 9), type, content: '' };
    const index = blocks.findIndex(b => b.id === afterId);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setTimeout(() => blockRefs.current[newBlock.id]?.focus(), 0);
  };

  const updateBlock = (id, content) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  };

  const deleteBlock = (id) => {
    if (blocks.length > 1) {
      const index = blocks.findIndex(b => b.id === id);
      const newBlocks = blocks.filter(b => b.id !== id);
      setBlocks(newBlocks);
      const prevBlockId = blocks[index - 1]?.id;
      if (prevBlockId) setTimeout(() => blockRefs.current[prevBlockId]?.focus(), 0);
    }
  };

  const handleKeyDown = (e, id, type, content) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBlock(id, type === 'bullet' ? 'bullet' : 'text');
    }
    if (e.key === 'Backspace' && content === '' && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(id);
    }
    if (e.key === '/') {
      const rect = e.target.getBoundingClientRect();
      setSlashMenu({ visible: true, x: rect.left, y: rect.bottom + window.scrollY, search: '', blockId: id });
    }
  };

  const handleSlashSelect = (type) => {
    const newBlocks = blocks.map(b => {
      if (b.id === slashMenu.blockId) {
        // Strip the '/' from the content
        const cleanContent = b.content.replace(/\/$/, '');
        return { 
          ...b, 
          type, 
          content: type === 'table' ? '[["",""],["",""]]' : cleanContent 
        };
      }
      return b;
    });
    setBlocks(newBlocks);
    setSlashMenu({ ...slashMenu, visible: false });
    setTimeout(() => {
      const el = blockRefs.current[slashMenu.blockId];
      if (el) {
        el.focus();
        // Move cursor to end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 10);
  };

  const execCommand = (cmd) => {
    document.execCommand(cmd, false, null);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
      if (onPublish) onPublish(title, blocks);
      setTimeout(() => setPublishSuccess(false), 3000);
    }, 2000);
  };

  const renderBlock = (block) => {
    const commonProps = {
      className: `notion-block-content type-${block.type}`,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: (e) => updateBlock(block.id, e.target.innerText),
      onKeyDown: (e) => handleKeyDown(e, block.id, block.type, e.target.innerText),
      ref: el => blockRefs.current[block.id] = el,
      'data-placeholder': BLOCK_TYPES.find(t => t.id === block.type)?.label || 'Type / for commands...'
    };

    switch (block.type) {
      case 'divider': return <div className="type-divider" />;
      case 'image':
        return (
          <div className="type-image">
            <input 
              type="text" 
              placeholder="Paste image URL..." 
              onBlur={(e) => updateBlock(block.id, e.target.value)}
              defaultValue={block.content}
            />
            {block.content && <img src={block.content} alt="Content" />}
          </div>
        );
      case 'table':
        try {
          const tableData = JSON.parse(block.content || '[["",""],["",""]]');
          return (
            <div className="type-table-wrapper">
              <table className="notion-table">
                <tbody>
                  {tableData.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} contentEditable onBlur={(e) => {
                          const newTable = [...tableData];
                          newTable[rIdx][cIdx] = e.target.innerText;
                          updateBlock(block.id, JSON.stringify(newTable));
                        }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn-ghost small" onClick={() => {
                const newTable = [...tableData, new Array(tableData[0].length).fill('')];
                updateBlock(block.id, JSON.stringify(newTable));
              }}>+ Row</button>
            </div>
          );
        } catch (e) { return <div>Error rendering table</div>; }
      case 'check-list':
        return (
          <div className="type-check-list">
            <div 
              className={`check-box ${block.metadata?.checked ? 'checked' : ''}`}
              onClick={() => {
                const newBlocks = blocks.map(b => b.id === block.id ? { ...b, metadata: { ...b.metadata, checked: !b.metadata?.checked } } : b);
                setBlocks(newBlocks);
              }}
            />
            <div {...commonProps} className={`${commonProps.className} ${block.metadata?.checked ? 'content-checked' : ''}`}>
              {block.content}
            </div>
          </div>
        );
      default:
        return <div {...commonProps}>{block.content}</div>;
    }
  };

  return (
    <div className={`notion-workspace-container ${darkMode ? 'dark-mode' : ''} animate-fade`}>
      {/* SIDEBAR */}
      <aside className={`notion-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="inst-brand-logo small">LAWEZY</div>
          <button className="btn-ghost" onClick={() => setSidebarOpen(false)}>◀</button>
        </div>
        
        <div className="sidebar-item active">
          <span className="icon">📄</span>
          <span className="label">{title || 'Untitled Draft'}</span>
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
              }}>{h.content || 'Untitled Heading'}</span>
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
             <span className="label">Exit Editor</span>
           </div>
        </div>
      </aside>

      {/* MAIN EDITOR */}
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
            <button 
              className={`btn-publish ${isPublishing ? 'loading' : ''} ${publishSuccess ? 'success' : ''}`}
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? 'Publishing...' : publishSuccess ? '✓ Published' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="notion-editor-canvas">
          <div className="notion-title-section">
            <input 
              className="notion-title-input"
              placeholder="Untitled Document"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input 
              className="notion-subtitle-input"
              placeholder="Add summary or description..."
            />
          </div>

          <div className="notion-content-area">
            {blocks.map(block => (
              <div key={block.id} className="notion-block-row">
                <div className="notion-block-actions">
                  <div className="block-btn add-btn" onClick={() => addBlock(block.id)} title="Add Block">+</div>
                  <div className="block-btn delete-btn" onClick={() => deleteBlock(block.id)} title="Delete Block">×</div>
                  <div className="block-btn drag-btn" draggable title="Drag to reorder">⠿</div>
                </div>
                {renderBlock(block)}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* FLOATING FORMAT BAR */}
      {floatingToolbar.visible && (
        <div 
          className="notion-floating-format-bar"
          style={{ left: floatingToolbar.x, top: floatingToolbar.y, transform: 'translateX(-50%)' }}
        >
          <button onClick={() => execCommand('bold')}><b>B</b></button>
          <button onClick={() => execCommand('italic')}><i>I</i></button>
          <button onClick={() => execCommand('underline')}><u>U</u></button>
          <button onClick={() => execCommand('strikeThrough')}><s>S</s></button>
          <div className="bar-sep" />
          <button onClick={() => {
            const url = prompt('Enter URL:');
            if (url) execCommand('createLink', url);
          }}>Link</button>
        </div>
      )}

      {/* SLASH MENU */}
      {slashMenu.visible && (
        <div 
          className="slash-menu-portal"
          style={{ left: slashMenu.x, top: slashMenu.y }}
        >
          <div className="menu-section">Basic Blocks</div>
          {BLOCK_TYPES.map(cmd => (
            <div key={cmd.id} className="menu-item" onClick={() => handleSlashSelect(cmd.id)}>
              <div className="icon-box">{cmd.icon}</div>
              <div className="label-group">
                <span className="label">{cmd.label}</span>
                <span className="desc">{cmd.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotionWorkspace;

