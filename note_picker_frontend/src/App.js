//
// Note Picker App: React frontend using Supabase for CRUD (categories/notes).
// - Sidebar: Categories list
// - Main area: Notes list, note details
// - Modals for create/delete
// - Light, modern, minimal UI with primary/secondary/accent colors
// - Real-time or optimistic UI updates reflecting Supabase data
//

import React, { useState, useEffect } from 'react';
import './App.css';
import supabase from './supabaseClient';

// Color palette from work item config
const COLORS = {
  primary: '#1976d2',
  secondary: '#424242',
  accent: '#ff4081',
  bg: 'var(--bg-primary)',
  text: 'var(--text-primary)'
};

// Helper modals
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: COLORS.bg,
        color: COLORS.text,
        padding: 32, borderRadius: 10, boxShadow: '0 2px 24px #0002', minWidth: 350, maxWidth: '90vw'
      }}>
        {children}
        <button onClick={onClose} style={{
          marginTop: 16,
          background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer'
        }}>Close</button>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  // Theme state
  const [theme, setTheme] = useState('light');

  // App data state
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [categoryIdSelected, setCategoryIdSelected] = useState(null); // uuid or null (show all)
  const [noteIdSelected, setNoteIdSelected] = useState(null); // uuid of note
  const [loading, setLoading] = useState(true);

  // Modal/dialog state
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showDeleteNote, setShowDeleteNote] = useState(null); // note id or null
  const [showDeleteCategory, setShowDeleteCategory] = useState(null); // cat id or null

  const [noteForm, setNoteForm] = useState({ title: '', content: '', category_id: null });
  const [categoryForm, setCategoryForm] = useState({ name: '' });

  // Effect: Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch categories and notes from Supabase
  useEffect(() => {
    // Fetch categories
    async function fetchCats() {
      let { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (!error) setCategories(data);
    }
    // Fetch notes
    async function fetchNotes() {
      let filter = categoryIdSelected ? { category_id: categoryIdSelected } : {};
      let query = supabase.from('notes').select('*').order('created_at', { ascending: false });
      if (categoryIdSelected) query = query.eq('category_id', categoryIdSelected);
      let { data, error } = await query;
      if (!error) setNotes(data);
    }
    setLoading(true);
    fetchCats().then(fetchNotes).finally(() => setLoading(false));
    // Re-fetch when category changes or after update
    // eslint-disable-next-line
  }, [categoryIdSelected]);

  // Realtime subscriptions (if available in supabase-js version)
  useEffect(() => {
    // Listen to notes/categories (realtime feature, fallback: polling above)
    const catSub = supabase.channel && supabase.channel('cat_update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' },
        payload => { setCategories(cats => { // update categories
          // Easiest: refetch all instead of merge logic
          supabase.from('categories').select('*').order('name').then(({ data }) => data && setCategories(data));
          return cats;
        }); }
      ).subscribe();

    const notesSub = supabase.channel && supabase.channel('notes_update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' },
        payload => {
          supabase.from('notes').select('*').order('created_at', { ascending: false })
            .eq('category_id', categoryIdSelected || null)
            .then(({ data }) => data && setNotes(data));
        }
      ).subscribe();

    return () => {
      catSub && supabase.removeChannel(catSub);
      notesSub && supabase.removeChannel(notesSub);
    };
    // eslint-disable-next-line
  }, [categoryIdSelected]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // CRUD actions for categories/notes
  // PUBLIC_INTERFACE
  async function createCategory(e) {
    e.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) return;
    let { data, error } = await supabase.from('categories').insert([{ name }]).select();
    if (!error && data.length) {
      setCategories(prev => [...prev, data[0]]);
      setShowCreateCategory(false);
      setCategoryForm({ name: '' });
    }
  }
  // PUBLIC_INTERFACE
  async function deleteCategory(id) {
    await supabase.from('categories').delete().eq('id', id);
    setCategories(cats => cats.filter(cat => cat.id !== id));
    if (categoryIdSelected === id) setCategoryIdSelected(null);
    setShowDeleteCategory(null);
  }
  // PUBLIC_INTERFACE
  async function createNote(e) {
    e.preventDefault();
    const { title, content } = noteForm;
    let catId = noteForm.category_id || categoryIdSelected;
    if (!title.trim() || !content.trim()) return;
    let { data, error } = await supabase.from('notes').insert([
      { title, content, category_id: catId }
    ]).select();
    if (!error && data.length) {
      setNotes(prev => [data[0], ...prev]);
      setShowCreateNote(false);
      setNoteForm({ title: '', content: '', category_id: null });
    }
  }
  // PUBLIC_INTERFACE
  async function deleteNote(id) {
    await supabase.from('notes').delete().eq('id', id);
    setNotes(notes => notes.filter(n => n.id !== id));
    if (noteIdSelected === id) setNoteIdSelected(null);
    setShowDeleteNote(null);
  }

  // Handler for selecting a category
  function handleCategorySelect(id) {
    setCategoryIdSelected(id);
    setNoteIdSelected(null);
  }
  // Handler for selecting a note
  function handleNoteSelect(id) {
    setNoteIdSelected(id);
  }

  // UI render functions
  function renderSidebar() {
    return (
      <aside style={{
        width: 230, background: COLORS.secondary, color: '#fff', padding: '20px 0',
        borderRight: `1px solid ${COLORS.primary}`,
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: 22, margin: '0 0 16px 28px' }}>Categories</div>
        <button
          style={{ background: COLORS.accent, color: '#fff', margin: '0 0 16px 28px', padding: '6px 14px', border: 'none', borderRadius: 5, cursor: 'pointer' }}
          onClick={() => setShowCreateCategory(true)}>
          + New Category
        </button>
        <nav style={{ flex: 1, width: '100%' }}>
          <div
            style={{
              padding: '8px 24px',
              cursor: 'pointer',
              color: !categoryIdSelected ? COLORS.primary : '#fff',
              background: !categoryIdSelected ? '#f5f5f577' : 'none',
              fontWeight: !categoryIdSelected ? 'bold' : 'normal'
            }}
            onClick={() => handleCategorySelect(null)}
          >
            All Notes
          </div>
          {categories.map(cat => (
            <div
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              style={{
                padding: '8px 24px',
                cursor: 'pointer',
                color: categoryIdSelected === cat.id ? COLORS.primary : '#fff',
                background: categoryIdSelected === cat.id ? '#f5f5f577' : 'none',
                fontWeight: categoryIdSelected === cat.id ? 'bold' : 'normal',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
              <span>{cat.name}</span>
              <button
                style={{
                  marginLeft: 8, background: 'transparent', color: COLORS.accent, border: 'none', cursor: 'pointer', fontWeight: 'bold'
                }}
                title="Delete Category"
                onClick={e => { e.stopPropagation(); setShowDeleteCategory(cat.id); }}>
                ×
              </button>
            </div>
          ))}
        </nav>
      </aside>
    );
  }
  function renderNotesList() {
    return (
      <div style={{
        padding: 32, flex: 1, minHeight: '100vh', background: COLORS.bg, color: COLORS.text
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 'bold' }}>
              {categoryIdSelected
                ? categories.find(cat => cat.id === categoryIdSelected)?.name || ''
                : 'All Notes'}
            </div>
            <div style={{
              fontSize: 15, color: COLORS.secondary, marginTop: 4, fontWeight: 400
            }}>{categoryIdSelected ? 'Notes in this category:' : 'All your notes:'}</div>
          </div>
          <button
            style={{
              background: COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontSize: 16,
              cursor: 'pointer',
              marginLeft: 14
            }}
            onClick={() => setShowCreateNote(true)}>
            + New Note
          </button>
        </div>
        <div>
          {loading && <div>Loading...</div>}
          {!loading && notes.length === 0 && <div>No notes found.</div>}
          {notes.map(note => (
            <div
              key={note.id}
              style={{
                border: `1px solid ${COLORS.primary}`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 18,
                background: '#fff',
                color: COLORS.text,
                boxShadow: noteIdSelected === note.id ? `0 0 0 2px ${COLORS.primary}` : 'none',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
                position: 'relative'
              }}
              onClick={() => handleNoteSelect(note.id)}
            >
              <div style={{ fontWeight: 700, fontSize: 18 }}>{note.title}</div>
              <div style={{ color: '#666', fontSize: 14, margin: '6px 0 0' }}>
                {note.content.length > 80 ? note.content.slice(0, 76) + '...' : note.content}
              </div>
              <div style={{ color: COLORS.accent, fontWeight: 400, fontSize: 11, marginTop: 6 }}>
                Created: {new Date(note.created_at).toLocaleString()}
              </div>
              <button style={{
                background: COLORS.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                padding: '3px 10px',
                fontSize: 13,
                position: 'absolute',
                right: 35,
                top: 12,
                cursor: 'pointer'
              }} onClick={e => { e.stopPropagation(); setShowDeleteNote(note.id);}}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  function renderNoteDetails() {
    if (!noteIdSelected) return null;
    const note = notes.find(n => n.id === noteIdSelected);
    if (!note) return null;
    return (
      <Modal open={!!noteIdSelected} onClose={() => setNoteIdSelected(null)}>
        <h2>{note.title}</h2>
        <div style={{ whiteSpace: 'pre-wrap', margin: '18px 0', textAlign: 'left' }}>{note.content}</div>
        <div style={{ color: COLORS.primary, fontSize: 13 }}>
          Created: {new Date(note.created_at).toLocaleString()}
        </div>
      </Modal>
    );
  }

  // Main render
  return (
    <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', background: COLORS.bg, color: COLORS.text }}>
      {/* Sidebar: Categories */}
      {renderSidebar()}
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{
          background: COLORS.primary, color: '#fff', padding: '12px 34px',
          fontWeight: 500, fontSize: 20, letterSpacing: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div><span style={{ fontWeight: 700 }}>Note Picker</span></div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
              background: COLORS.secondary, color: '#fff', border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 600
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </header>
        <main style={{ flex: 1, display: 'flex', background: COLORS.bg, color: COLORS.text }}>
          {renderNotesList()}
          {renderNoteDetails()}
        </main>
      </div>
      {/* --- Create Note Modal --- */}
      <Modal open={showCreateNote} onClose={() => setShowCreateNote(false)}>
        <form onSubmit={createNote}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Create Note</div>
          <label>
            Title:<br/>
            <input
              value={noteForm.title}
              onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
              required
              style={{ width: '100%', padding: 8, margin: '6px 0 14px', borderRadius: 4, border: '1px solid #dedede' }}
            />
          </label>
          <label>
            Content:<br />
            <textarea
              value={noteForm.content}
              onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
              required
              rows={5}
              style={{ width: '100%', padding: 8, margin: '6px 0 14px', borderRadius: 4, border: '1px solid #dedede', fontFamily: 'inherit' }}
            />
          </label>
          <label>
            Category:<br/>
            <select
              value={noteForm.category_id ?? categoryIdSelected ?? ''}
              onChange={e => setNoteForm(f => ({ ...f, category_id: e.target.value || null }))}
              style={{ width: '100%', padding: 8, margin: '6px 0 14px', borderRadius: 4, border: '1px solid #dedede' }}
            >
              <option value="">(Uncategorized)</option>
              {categories.map(cat =>
                <option value={cat.id} key={cat.id}>{cat.name}</option>
              )}
            </select>
          </label>
          <button
            type="submit"
            style={{
              background: COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              padding: '8px 18px',
              fontSize: 16,
              cursor: 'pointer',
              marginBottom: 6
            }}
          >Save</button>
        </form>
      </Modal>
      {/* --- Create Category Modal --- */}
      <Modal open={showCreateCategory} onClose={() => setShowCreateCategory(false)}>
        <form onSubmit={createCategory}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Create Category</div>
          <label>
            Name:<br/>
            <input
              value={categoryForm.name}
              required
              onChange={e => setCategoryForm({ name: e.target.value })}
              style={{ width: '100%', padding: 8, margin: '6px 0 14px',
                borderRadius: 4, border: '1px solid #dedede'
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              background: COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              padding: '8px 18px',
              fontSize: 16,
              cursor: 'pointer',
              marginBottom: 6
            }}
          >Save</button>
        </form>
      </Modal>
      {/* --- Delete Note Modal --- */}
      <Modal open={!!showDeleteNote} onClose={() => setShowDeleteNote(null)}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>Delete note?</div>
        <div style={{ marginBottom: 10 }}>This will permanently delete the note. Are you sure?</div>
        <button
          onClick={() => deleteNote(showDeleteNote)}
          style={{
            background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600,
            marginBottom: 4
          }}>Yes, delete</button>
      </Modal>
      {/* --- Delete Category Modal --- */}
      <Modal open={!!showDeleteCategory} onClose={() => setShowDeleteCategory(null)}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>Delete category?</div>
        <div style={{ marginBottom: 10 }}>This will permanently delete the category and uncategorize all its notes. Are you sure?</div>
        <button
          onClick={() => deleteCategory(showDeleteCategory)}
          style={{
            background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600,
            marginBottom: 4
          }}>Yes, delete</button>
      </Modal>
    </div>
  );
}

export default App;
