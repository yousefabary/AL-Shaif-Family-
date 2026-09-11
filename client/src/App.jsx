import { useEffect, useState, useCallback } from "react";
import { api } from "./api.js";
import TreeView from "./components/TreeView.jsx";
import SearchBar from "./components/SearchBar.jsx";
import PersonPanel from "./components/PersonPanel.jsx";
import AdminBar from "./components/AdminBar.jsx";
import PdfViewer from "./components/PdfViewer.jsx";

export default function App() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [panelMode, setPanelMode] = useState(null); // view | edit | add | null
  const [addParentId, setAddParentId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [showPdf, setShowPdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPeople();
      setPeople(data);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    api
      .authStatus()
      .then((s) => setIsAdmin(s.isAdmin))
      .catch(() => {});
  }, [refresh]);

  const selectedPerson = people.find((p) => p.id === selectedId) || null;

  const handleSelect = (id, mode = "view") => {
    setSelectedId(id);
    setPanelMode(mode);
    setFormError("");
    if (mode === "add") setAddParentId(id);
  };

  const closePanel = () => {
    setPanelMode(null);
    setFormError("");
  };

  const handleAddRoot = () => {
    setSelectedId(null);
    setAddParentId(null);
    setPanelMode("add");
  };

  const handleSave = async (form) => {
    setBusy(true);
    setFormError("");
    try {
      if (panelMode === "add") {
        const created = await api.createPerson({ ...form, parentId: addParentId });
        await refresh();
        setSelectedId(created.id);
        setPanelMode("view");
        setFocusId(created.id);
      } else if (panelMode === "edit" && selectedPerson) {
        await api.updatePerson(selectedPerson.id, form);
        await refresh();
        setPanelMode("view");
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (person) => {
    const childCount = people.filter((p) => p.parentId === person.id).length;
    const msg =
      childCount > 0
        ? `«${person.name}» لديه ${childCount} من الأبناء/الذرية في الشجرة. سيتم حذفه هو وجميع ذريته نهائياً. هل أنت متأكد؟`
        : `هل أنت متأكد من حذف «${person.name}»؟`;
    if (!window.confirm(msg)) return;
    try {
      await api.deletePerson(person.id, childCount > 0);
      await refresh();
      setPanelMode(null);
      setSelectedId(null);
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleLogin = async (password) => {
    await api.login(password);
    setIsAdmin(true);
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAdmin(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>شجرة عائلة آل الشايف</h1>
        <div className="app-header-tools">
          <SearchBar people={people} onFocus={(id) => setFocusId(id)} />
          <button className="btn btn-small" onClick={() => setShowPdf(true)}>
            عرض الوثيقة الأصلية (PDF)
          </button>
          <button className="btn btn-small" onClick={() => window.print()}>
            طباعة الشجرة
          </button>
          {isAdmin && (
            <button className="btn btn-small btn-primary" onClick={handleAddRoot}>
              + إضافة جذر جديد
            </button>
          )}
        </div>
        <AdminBar isAdmin={isAdmin} onLogin={handleLogin} onLogout={handleLogout} />
      </header>

      <main className="app-main">
        {loading && <div className="tree-empty">جارِ التحميل...</div>}
        {loadError && <div className="tree-empty error">تعذر تحميل البيانات: {loadError}</div>}
        {!loading && !loadError && (
          <TreeView
            people={people}
            selectedId={selectedId}
            onSelect={(id) => handleSelect(id, "view")}
            focusId={focusId}
          />
        )}
      </main>

      <PersonPanel
        mode={panelMode}
        person={selectedPerson}
        parentPerson={panelMode === "add" ? people.find((p) => p.id === addParentId) : null}
        people={people}
        isAdmin={isAdmin}
        onClose={closePanel}
        onSave={handleSave}
        onDelete={handleDelete}
        onSelectPerson={handleSelect}
        busy={busy}
        error={formError}
      />

      {showPdf && <PdfViewer onClose={() => setShowPdf(false)} />}

      <footer className="app-footer">
        <span>
          {people.length} فرداً في الشجرة · مبني عن مشجر آل الشايف (النسخة الثانية، 2018) بقلم المهندس نجم
          الدين ناصر حسن الشايف
        </span>
      </footer>
    </div>
  );
}
