import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, Trash2, Archive, FileText, RotateCcw, Edit2, X,
  Save, AlertCircle, Clock, ArchiveRestore, StickyNote,
  Moon,
  Sun
} from "lucide-react";
import { createNote, getNotes, permanentDelete, updateNote } from "../services/notesApi";


const initialNotes = [
  { id: 1, title: "Shopping List", content: "Milk, Bread, Eggs, Butter, Coffee, Yogurt", archived: false, deleted: false, deletedAt: null, createdAt: "2026-05-18T10:00:00", updatedAt: "2026-05-18T10:00:00" },
  { id: 2, title: "Meeting Notes", content: "Discuss Q3 roadmap\nReview team capacity\nPlan sprint goals\nFinalize hiring budget", archived: false, deleted: false, deletedAt: null, createdAt: "2026-05-17T14:30:00", updatedAt: "2026-05-17T14:30:00" },
  { id: 3, title: "Book Recommendations", content: "1. Atomic Habits — James Clear\n2. Deep Work — Cal Newport\n3. The Pragmatic Programmer\n4. Thinking Fast and Slow", archived: true, deleted: false, deletedAt: null, createdAt: "2026-05-15T09:00:00", updatedAt: "2026-05-15T09:00:00" },
  { id: 4, title: "Project Ideas", content: "Build a habit tracker app\nCreate a personal finance dashboard\nLearn Rust basics", archived: false, deleted: false, deletedAt: null, createdAt: "2026-05-14T11:00:00", updatedAt: "2026-05-14T11:00:00" },
  { id: 5, title: "Old Draft", content: "This is an old note that has been trashed.", archived: false, deleted: true, deletedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), createdAt: "2026-05-10T08:00:00", updatedAt: "2026-05-10T08:00:00" },
  { id: 6, title: "Travel Plans", content: "-   ", archived: false, deleted: true, deletedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), createdAt: "2026-05-12T16:00:00", updatedAt: "2026-05-12T16:00:00" },
];

let store = initialNotes.map(n => ({ ...n }));
let nextId = 7;
const delay = (ms = 180) => new Promise(r => setTimeout(r, ms));

// const api = {
//   async getNotes() {
//     await delay();
//     const now = Date.now();
//     store = store.filter(n => {
//       if (n.deleted && n.deletedAt) {
//         return (now - new Date(n.deletedAt).getTime()) < 24 * 60 * 60 * 1000;
//       }
//       return true;
//     });
//     return store.map(n => ({ ...n }));
//   },
//   async createNote({ title, content }) {
//     await delay();
//     if (!title?.trim()) throw new Error("Note title is mandatory.");
//     const dup = store.find(n => n.title.toLowerCase() === title.trim().toLowerCase() && !n.deleted);
//     if (dup) throw new Error("A note with this title already exists.");
//     const note = { id: nextId++, title: title.trim(), content: content || "", archived: false, deleted: false, deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
//     store.push(note);
//     return { ...note };
//   },
//   async updateNote(id, { title, content }) {
//     await delay();
//     const note = store.find(n => n._id === id);
//     if (!note) throw new Error("Note not found.");
//     if (note.archived) throw new Error("Archived notes are read-only.");
//     if (!title?.trim()) throw new Error("Note title is mandatory.");
//     const dup = store.find(n => n.title.toLowerCase() === title.trim().toLowerCase() && n._id !== id && !n.deleted);
//     if (dup) throw new Error("A note with this title already exists.");
//     note.title = title.trim();
//     note.content = content || "";
//     note.updatedAt = new Date().toISOString();
//     return { ...note };
//   },
//   async deleteNote(id) {
//     await delay();
//     const note = store.find(n => n._id === id);
//     if (!note) throw new Error("Note not found.");
//     note.deleted = true;
//     note.deletedAt = new Date().toISOString();
//     note.archived = false;
//     return { ...note };
//   },
//   async restoreNote(id) {
//     await delay();
//     const note = store.find(n => n._id === id);
//     if (!note) throw new Error("Note not found.");
//     note.deleted = false;
//     note.deletedAt = null;
//     return { ...note };
//   },
//   async permanentDelete(id) {
//     await delay();
//     store = store.filter(n => n._id !== id);
//     return { success: true };
//   },
//   async toggleArchive(id) {
//     await delay();
//     const note = store.find(n => n._id === id);
//     if (!note) throw new Error("Note not found.");
//     note.archived = !note.archived;
//     note.updatedAt = new Date().toISOString();
//     return { ...note };
//   },
// };

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const trashCountdown = (deletedAt) => {
  const remaining = 24 * 60 * 60 * 1000 - (Date.now() - new Date(deletedAt).getTime());
  if (remaining <= 0) return "Expiring soon";
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return `${h}h ${m}m remaining`;
};

const getPreview = (content) => {
  const lines = content.split("\n").filter(l => l.trim());
  return lines.slice(0, 2).join(" · ") || "No content";
};


function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
          background: t.type === "error" ? "var(--color-background-danger)" : t.type === "success" ? "var(--color-background-success)" : "var(--color-background-primary)",
          border: `0.5px solid ${t.type === "error" ? "var(--color-border-danger)" : t.type === "success" ? "var(--color-border-success)" : "var(--color-border-secondary)"}`,
          borderRadius: "var(--border-radius-md)", color: t.type === "error" ? "var(--color-text-danger)" : t.type === "success" ? "var(--color-text-success)" : "var(--color-text-primary)",
          fontSize: 13, fontWeight: 500, boxShadow: "none", minWidth: 260, maxWidth: 360,
          animation: "slideIn 0.2s ease",
        }}>
          {t.type === "error" ? <AlertCircle size={15} /> : t.type === "success" ? <Save size={15} /> : <FileText size={15} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => removeToast(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "inherit", opacity: 0.6, lineHeight: 1 }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}


function NoteModal({ note, onClose, onSave, loading }) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [error, setError] = useState("");
  const titleRef = useRef(null);
  const isEdit = !!note;
  const isReadOnly = note?.archived;

  useEffect(() => { titleRef.current?.focus(); }, []);

  const handleSave = async () => {
    setError("");
    try {
      await onSave({ title, content });
    } catch (e) {
      setError(e.message);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "white", borderRadius: "10px",
        border: "0.5px solid var(--color-border-secondary)", width: "100%", maxWidth: 640,
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StickyNote size={16} style={{ color: "var(--color-text-secondary)" }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
              {isReadOnly ? "Viewing Note (Archived — Read-only)" : isEdit ? "Edit Note" : "New Note"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 4, borderRadius: 6, display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 20px 0" }}>
          {isReadOnly && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", marginBottom: 16, fontSize: 12, color: "var(--color-text-warning)" }}>
              <Archive size={13} />
              This note is archived and read-only. Unarchive it to edit.
            </div>
          )}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", marginBottom: 16, fontSize: 12, color: "var(--color-text-danger)" }}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Title <span style={{ color: "var(--color-text-danger)" }}>*</span>
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              readOnly={isReadOnly}
              placeholder="Give your note a title..."
              style={{
                width: "100%", padding: "10px 12px", fontSize: 15, fontWeight: 500,
                background: isReadOnly ? "var(--color-background-secondary)" : "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
                color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Content
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              readOnly={isReadOnly}
              placeholder="Write your note here..."
              rows={10}
              style={{
                width: "100%", padding: "10px 12px", fontSize: 14, lineHeight: 1.7,
                background: isReadOnly ? "var(--color-background-secondary)" : "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
                color: "var(--color-text-primary)", outline: "none", resize: "vertical",
                fontFamily: "var(--font-mono)", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {!isReadOnly && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "16px 20px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              style={{ padding: "8px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.6 : 1 }}>
              <Save size={13} />
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Note"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function NoteCard({ note, onEdit, onDelete, onArchive, onRestore, onPermanentDelete, view }) {
  const [hovered, setHovered] = useState(false);

  const lineCount = note.content.split("\n").filter(l => l.trim()).length;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--color-background-primary)", border: `0.5px solid ${hovered ? "var(--color-border-secondary)" : "var(--color-border-tertiary)"}`,
        borderRadius: "var(--border-radius-lg)", padding: "16px", cursor: "pointer",
        transition: "border-color 0.15s ease, transform 0.1s ease",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        display: "flex", flexDirection: "column", gap: 10,
        position: "relative", overflow: "hidden",
      }}
      // onClick={() => !view === "trash" && onEdit(note)}
      onClick={() => view !== "trash" && onEdit(note)}
    >
      {/* Archive / Deleted badges */}
      {note.archived && (
        <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-warning)", color: "var(--color-text-warning)", border: "0.5px solid var(--color-border-warning)" }}>
          Archived
        </span>
      )}

      {/* Title */}
      <div style={{ paddingRight: note.archived ? 72 : 0 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.4, wordBreak: "break-word" }}>
          {note.title}
        </h3>
      </div>

      {/* Preview */}
      {note.content && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap" }}>
          {note.content}
        </p>
      )}

      {/* Trash countdown */}
      {note.deleted && note.deletedAt && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-text-danger)" }}>
          <Clock size={11} />
          {trashCountdown(note.deletedAt)}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {lineCount > 0 ? `${lineCount} line${lineCount !== 1 ? "s" : ""}  ·  ` : ""}{fmtDate(note.updatedAt)}
        </span>

        {/* Action buttons — shown on hover */}
        <div style={{ display: "flex", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity 0.15s ease" }}>
          {view === "trash" ? (
            <>
              {/* <ActionBtn icon={<RotateCcw size={12} />} label="Restore" onClick={e => { e.stopPropagation(); onRestore(note._id); }} /> */}
              <ActionBtn
                icon={<RotateCcw size={12} />}
                label="Restore"
                onClick={e => { e.stopPropagation(); onRestore(note._id); }}
              />
              <ActionBtn icon={<Trash2 size={12} />} label="Delete forever" danger onClick={e => { e.stopPropagation(); onPermanentDelete(note._id); }} />
            </>
          ) : (
            <>
              <ActionBtn icon={<Edit2 size={12} />} label="Edit" onClick={e => { e.stopPropagation(); onEdit(note); }} />
              <ActionBtn
                icon={note.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                label={note.archived ? "Unarchive" : "Archive"}
                onClick={e => { e.stopPropagation(); onArchive(note._id); }}
              />
              <ActionBtn icon={<Trash2 size={12} />} label="Delete" danger onClick={e => { e.stopPropagation(); onDelete(note._id); }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 6, border: `0.5px solid ${danger && hov ? "var(--color-border-danger)" : "var(--color-border-secondary)"}`,
        background: danger && hov ? "var(--color-background-danger)" : hov ? "var(--color-background-secondary)" : "var(--color-background-primary)",
        color: danger && hov ? "var(--color-text-danger)" : "var(--color-text-secondary)",
        cursor: "pointer", transition: "all 0.12s ease",
      }}>
      {icon}
    </button>
  );
}


function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 12, textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "var(--border-radius-lg)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)" }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{title}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}>{description}</p>
      </div>
      {action}
    </div>
  );
}


export default function NotesApp() {
  const [notes, setNotes] = useState([]);
  const [view, setView] = useState("all"); // all | archived | trash
  const [search, setSearch] = useState("");
  const [modalNote, setModalNote] = useState(null); // null = closed, {} = new, note = edit
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState("light");
  const [visibleCount, setVisibleCount] = useState(12);

  // Reset when view or search changes
  useEffect(() => { setVisibleCount(12); }, [view, search]);

  

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");
  let toastId = useRef(0);

  const addToast = useCallback((message, type = "info") => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  // const loadNotes = useCallback(async () => {
  //   const data = await api.getNotes();
  //   setNotes(data);
  //   setFetching(false);
  // }, []);


  //   const loadNotes = useCallback(async () => {
  //   try {
  //     setFetching(true);

  //     const data = await getNotes();

  //     setNotes(data);
  //   } catch (error) {
  //     addToast(error.message, "error");
  //   } finally {
  //     setFetching(false);
  //   }
  // }, [addToast]);

  // const loadNotes = useCallback(async () => {
  //   try {
  //     setFetching(true);

  //     const data = await getNotes();

  //     const formattedNotes = data.map(note => ({
  //       ...note,
  //       content: Array.isArray(note.content)
  //         ? note.content.join("\n")
  //         : note.content || ""
  //     }));

  //     setNotes(formattedNotes);
  //   } catch (error) {
  //     addToast(error.message, "error");
  //   } finally {
  //     setFetching(false);
  //   }
  // }, [addToast]);

  const loadNotes = useCallback(async () => {
    try {
      setFetching(true);

      const data = await getNotes();

      const formattedNotes = data.map(note => ({
        ...note,
        content: Array.isArray(note.content)
          ? note.content.join("\n")
          : note.content || "",
      }));

      setNotes(formattedNotes); // ← keep all notes, including deleted ones
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setFetching(false);
    }
  }, [addToast]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // Filtered notes per view + search
  const filteredNotes = notes.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    if (view === "trash") return n.deleted && matchSearch;
    if (view === "archived") return !n.deleted && n.archived && matchSearch;
    return !n.deleted && !n.archived && matchSearch;
  });
  const visibleNotes = filteredNotes.slice(0, visibleCount);
  const hasMore = filteredNotes.length > visibleCount; 

  const counts = {
    all: notes.filter(n => !n.deleted && !n.archived).length,
    archived: notes.filter(n => !n.deleted && n.archived).length,
    trash: notes.filter(n => n.deleted).length,
  };

  // ── Handlers ──
  const handleOpenNew = () => { setModalNote({}); setModalOpen(true); };
  const handleOpenEdit = (note) => { setModalNote(note); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setModalNote(null); };

  const handleSave = async ({ title, content }) => {
    setLoading(true);
    try {
      if (modalNote?._id) {
        // const updated = await api.updateNote(modalNote.id, { title, content });
        const updated = await updateNote(modalNote._id, {
          title,
          content,
          archived: modalNote.archived,
          deleted: modalNote.deleted,
        });
        // setNotes(ns => ns.map(n => n._id === updated.id ? updated : n));
        const formattedNote = {
          ...updated,
          content: Array.isArray(updated.content)
            ? updated.content.join("\n")
            : updated.content || "",
        };

        setNotes(ns =>
          ns.map(n =>
            n._id === formattedNote._id
              ? formattedNote
              : n
          )
        );
        addToast("Note updated successfully.", "success");
      } else {
        // const created = await api.createNote({ title, content });
        const created = await createNote({
          title,
          content,
          archived: false,
          deleted: false,
        });
        // setNotes(ns => [...ns, created]);
        const formattedNote = {
          ...created,
          content: Array.isArray(created.content)
            ? created.content.join("\n")
            : created.content || "",
        };

        setNotes(ns => [...ns, formattedNote]);
        addToast("Note created successfully.", "success");
      }
      handleCloseModal();
    }
    catch (e) {
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // const handleDelete = async (id) => {
  //   try {
  //     const updated = await api.deleteNote(id);
  //     setNotes(ns => ns.map(n => n._id === id ? updated : n));
  //     addToast("Note moved to trash.", "info");
  //   } catch (e) { addToast(e.message, "error"); }
  // };

  const handleDelete = async (id) => {
    try {
      const note = notes.find(n => n._id === id);

      const updated = await updateNote(id, {
        title: note.title,
        content: note.content,
        archived: note.archived,
        deleted: true,
        // deletedAt: new Date().toISOString(),
      });

      const formattedNote = {
        ...updated,
        content: Array.isArray(updated.content)
          ? updated.content.join("\n")
          : updated.content || "",
      };

      setNotes(ns => ns.map(n => n._id === id ? formattedNote : n));
      addToast("Note moved to trash.", "info");
    } catch (e) {
      addToast(e.message, "error");
    }
  };
  // const handleArchive = async (id) => {
  //   try {
  //     const updated = await api.toggleArchive(id);
  //     setNotes(ns => ns.map(n => n._id === id ? updated : n));
  //     addToast(updated.archived ? "Note archived." : "Note unarchived.", "success");
  //   } catch (e) { addToast(e.message, "error"); }
  // };

  // const handleRestore = async (id) => {
  //   try {
  //     const updated = await api.restoreNote(id);
  //     setNotes(ns => ns.map(n => n._id === id ? updated : n));
  //     addToast("Note restored.", "success");
  //   } catch (e) { addToast(e.message, "error"); }
  // };


  const handleArchive = async (id) => {
    try {
      const note = notes.find(n => n._id === id);

      const updated = await updateNote(id, {
        title: note.title,
        content: note.content,
        deleted: note.deleted,
        deletedAt: note.deletedAt,
        archived: !note.archived,
      });

      const formattedNote = {
        ...updated,
        content: Array.isArray(updated.content)
          ? updated.content.join("\n")
          : updated.content || "",
      };

      setNotes(ns => ns.map(n => n._id === id ? formattedNote : n));
      addToast(!note.archived ? "Note archived." : "Note unarchived.", "success");
    } catch (e) {
      addToast(e.message, "error");
    }
  };

  const handleRestore = async (id) => {
    try {
      const note = notes.find(n => n._id === id);

      const updated = await updateNote(id, {
        title: note.title,
        content: note.content,
        archived: note.archived,
        deleted: false,
        // deletedAt: null,
      });

      const formattedNote = {
        ...updated,
        content: Array.isArray(updated.content)
          ? updated.content.join("\n")
          : updated.content || "",
      };

      setNotes(ns => ns.map(n => n._id === id ? formattedNote : n));
      addToast("Note restored.", "success");
    } catch (e) {
      addToast(e.message, "error");
    }
  };
  // const handlePermanentDelete = async (id) => {
  //   try {
  //     await api.permanentDelete(id);
  //     setNotes(ns => ns.filter(n => n._id !== id));
  //     addToast("Note permanently deleted.", "info");
  //   } catch (e) { addToast(e.message, "error"); }
  // };

  // ── Nav items ──

  const handlePermanentDelete = async (id) => {
    try {
      await permanentDelete(id);
      setNotes(ns => ns.filter(n => n._id !== id));
      addToast("Note permanently deleted.", "info");
    } catch (e) {
      addToast(e.message, "error");
    }
  };

  const navItems = [
    { key: "all", label: "Notes", icon: FileText, count: counts.all },
    { key: "archived", label: "Archived", icon: Archive, count: counts.archived },
    { key: "trash", label: "Trash", icon: Trash2, count: counts.trash },
  ];

  const viewMeta = {
    all: { title: "My Notes", description: "Your active notes" },
    archived: { title: "Archived", description: "Read-only archived notes" },
    trash: { title: "Trash", description: "Notes auto-delete after 24 hours" },
  };

  return (
    <div data-theme={theme} style={{ display: "flex", height: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)", overflow: "hidden" }}>
      {/* <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 4px; }
        input:focus, textarea:focus { border-color: var(--color-border-primary) !important; box-shadow: 0 0 0 2px rgba(0,0,0,0.04); }
      `}</style> */}
      <style>{`
  [data-theme="light"] {
    --color-background-primary: #ffffff;
    --color-background-secondary: #f5f5f5;
    --color-background-tertiary: #efefef;
    --color-background-danger: #fff0f0;
    --color-background-success: #f0fff4;
    --color-background-warning: #fffbea;
    --color-text-primary: #111111;
    --color-text-secondary: #555555;
    --color-text-tertiary: #999999;
    --color-text-danger: #cc0000;
    --color-text-success: #166534;
    --color-text-warning: #92400e;
    --color-border-primary: #111111;
    --color-border-secondary: #dddddd;
    --color-border-tertiary: #eeeeee;
    --color-border-danger: #fca5a5;
    --color-border-success: #86efac;
    --color-border-warning: #fde68a;
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-mono: "JetBrains Mono", "Fira Code", monospace;
    --border-radius-md: 6px;
    --border-radius-lg: 10px;
  }

  [data-theme="dark"] {
    --color-background-primary: #1a1a1a;
    --color-background-secondary: #242424;
    --color-background-tertiary: #141414;
    --color-background-danger: #2a1515;
    --color-background-success: #132318;
    --color-background-warning: #2a2010;
    --color-text-primary: #eeeeee;
    --color-text-secondary: #aaaaaa;
    --color-text-tertiary: #666666;
    --color-text-danger: #f87171;
    --color-text-success: #4ade80;
    --color-text-warning: #fbbf24;
    --color-border-primary: #eeeeee;
    --color-border-secondary: #333333;
    --color-border-tertiary: #2a2a2a;
    --color-border-danger: #7f1d1d;
    --color-border-success: #14532d;
    --color-border-warning: #78350f;
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-mono: "JetBrains Mono", "Fira Code", monospace;
    --border-radius-md: 6px;
    --border-radius-lg: 10px;
  }

  @keyframes slideIn { 
    from { opacity: 0; transform: translateX(16px); } 
    to { opacity: 1; transform: translateX(0); } 
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 4px; }
  input:focus, textarea:focus { 
    border-color: var(--color-border-primary) !important; 
    box-shadow: 0 0 0 2px rgba(128,128,128,0.1); 
  }
`}</style>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, flexShrink: 0, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", padding: "20px 12px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px", marginBottom: 24 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <StickyNote size={14} style={{ color: "var(--color-text-primary)" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Notepad</span>
        </div>

        {/* New Note Button */}
        <button onClick={handleOpenNew} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 20, transition: "background 0.12s ease" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-tertiary)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--color-background-secondary)"}>
          <Plus size={14} />
          New Note
        </button>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(({ key, label, icon: Icon, count }) => {
            const active = view === key;
            return (
              <button key={key} onClick={() => { setView(key); setSearch(""); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "none", background: active ? "var(--color-background-secondary)" : "transparent", color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontSize: 13, fontWeight: active ? 500 : 400, cursor: "pointer", textAlign: "left", transition: "all 0.1s ease" }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <Icon size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 500, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 9, background: active ? "var(--color-background-tertiary)" : "var(--color-background-secondary)", color: "var(--color-text-secondary)", padding: "0 5px" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider & info */}
        {/* <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            {notes.filter(n => !n.deleted && !n.archived).length} active · {notes.filter(n => n.deleted).length} in trash
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--color-text-tertiary)" }}>Trash clears after 24h</p>
        </div> */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 10px", borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-secondary)",
              fontSize: 13, fontWeight: 400, cursor: "pointer",
              transition: "background 0.12s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-tertiary)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>

          {/* Info */}
          <div style={{ paddingTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
              {notes.filter(n => !n.deleted && !n.archived).length} active · {notes.filter(n => n.deleted).length} in trash
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--color-text-tertiary)" }}>Trash clears after 24h</p>
          </div>

        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <header style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>{viewMeta[view].title}</h1>
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {view === "trash" ? viewMeta[view].description : `${filteredNotes.length} ${filteredNotes.length === 1 ? "note" : "notes"}`}
            </p>
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: "relative", width: 240 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              style={{ width: "100%", padding: "7px 10px 7px 30px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 2, display: "flex" }}>
                <X size={11} />
              </button>
            )}
          </div>

          {view !== "trash" && (
            <button onClick={handleOpenNew} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              <Plus size={13} />
              New
            </button>
          )}
        </header>

        {/* Trash warning banner */}
        {view === "trash" && counts.trash > 0 && (
          <div style={{ padding: "10px 24px", background: "var(--color-background-danger)", borderBottom: "0.5px solid var(--color-border-danger)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-danger)" }}>
            <Clock size={13} />
            Notes in trash are permanently deleted after 24 hours. Restore them to keep them.
          </div>
        )}

        {/* Notes Grid */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {fetching ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ height: 100, borderRadius: "var(--border-radius-lg)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", animation: "pulse 1.5s ease infinite" }} />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <EmptyState
              icon={view === "trash" ? Trash2 : view === "archived" ? Archive : FileText}
              title={search ? "No notes match your search" : view === "trash" ? "Trash is empty" : view === "archived" ? "No archived notes" : "No notes yet"}
              description={search ? `Try a different search term` : view === "trash" ? "Deleted notes will appear here" : view === "archived" ? "Archive notes to keep them read-only" : "Create your first note to get started"}
              action={view === "all" && !search && (
                <button onClick={handleOpenNew} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  <Plus size={13} />
                  Create Note
                </button>
              )}
            />
          ) : (
            // <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            //   {filteredNotes.map(note => (
            //     // <NoteCard
            //     //   // key={note.id}
            //     //   key={note._id}
            //     //   note={note}
            //     //   view={view}
            //     //   onEdit={handleOpenEdit}
            //     //   onDelete={handleDelete}
            //     //   onArchive={handleArchive}
            //     //   onRestore={handleRestore}
            //     //   onPermanentDelete={handlePermanentDelete}
            //     // />
            //     <NoteCard
            //       key={note._id}
            //       note={note}
            //       view={view}
            //       onEdit={handleOpenEdit}
            //       onDelete={handleDelete}
            //       onArchive={handleArchive}
            //       onRestore={handleRestore}
            //       onPermanentDelete={handlePermanentDelete}
            //     />
            //   ))}
            // </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {visibleNotes.map(note => (
                <NoteCard
                  key={note._id}
                  note={note}
                  view={view}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                  onPermanentDelete={handlePermanentDelete}
                />
              ))}
            </div>
          )}
{hasMore && (
  <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
    <button
      onClick={() => setVisibleCount(c => c + 12)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 20px", borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-secondary)",
        background: "var(--color-background-primary)",
        color: "var(--color-text-secondary)",
        fontSize: 13, fontWeight: 500, cursor: "pointer",
      }}
    >
      Load more · {filteredNotes.length - visibleCount} remaining
    </button>
  </div>
)}
          {/* Search result count */}
          {search && filteredNotes.length > 0 && (
            <p style={{ margin: "16px 0 0", fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center" }}>
              {filteredNotes.length} result{filteredNotes.length !== 1 ? "s" : ""} for "{search}"
            </p>
          )}
          
        </div>
      </main>

      {/* ── Modal ── */}
      {modalOpen && (
        <NoteModal
          note={modalNote?._id ? modalNote : null}
          onClose={handleCloseModal}
          onSave={handleSave}
          loading={loading}
        />
      )}

      {/* ── Toast ── */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
