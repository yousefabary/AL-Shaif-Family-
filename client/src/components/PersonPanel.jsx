import { useEffect, useState } from "react";
import PersonPicker from "./PersonPicker.jsx";

const emptyForm = {
  name: "",
  gender: "",
  birthYear: "",
  deathYear: "",
  note: "",
  photoUrl: "",
  parentId: null,
};

export default function PersonPanel({
  mode, // "view" | "edit" | "add"
  person, // for view/edit
  parentPerson, // for add, or view's parent
  people,
  isAdmin,
  onClose,
  onSave,
  onDelete,
  onSelectPerson,
  busy,
  error,
}) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (mode === "edit" && person) {
      setForm({
        name: person.name || "",
        gender: person.gender || "",
        birthYear: person.birthYear || "",
        deathYear: person.deathYear || "",
        note: person.note || "",
        photoUrl: person.photoUrl || "",
        parentId: person.parentId || null,
      });
    } else if (mode === "add") {
      setForm({ ...emptyForm, parentId: parentPerson?.id || null });
    }
  }, [mode, person, parentPerson]);

  if (!mode) return null;

  const children = person ? people.filter((p) => p.parentId === person.id) : [];
  const parent = person?.parentId ? people.find((p) => p.id === person.parentId) : null;

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <button className="panel-close" onClick={onClose} aria-label="إغلاق">
          ✕
        </button>

        {mode === "view" && person && (
          <div className="panel-view">
            <h2>{person.name}</h2>
            {person.note && <p className="panel-note">{person.note}</p>}
            <dl className="panel-meta">
              {parent && (
                <>
                  <dt>الأب</dt>
                  <dd>
                    <button className="link-btn" onClick={() => onSelectPerson(parent.id)}>
                      {parent.name}
                    </button>
                  </dd>
                </>
              )}
              {person.gender && (
                <>
                  <dt>الجنس</dt>
                  <dd>{person.gender === "male" ? "ذكر" : "أنثى"}</dd>
                </>
              )}
              {person.birthYear && (
                <>
                  <dt>سنة الميلاد</dt>
                  <dd>{person.birthYear}</dd>
                </>
              )}
              {person.deathYear && (
                <>
                  <dt>سنة الوفاة</dt>
                  <dd>{person.deathYear}</dd>
                </>
              )}
            </dl>
            {children.length > 0 && (
              <div className="panel-children">
                <h3>الأبناء ({children.length})</h3>
                <ul>
                  {children.map((c) => (
                    <li key={c.id}>
                      <button className="link-btn" onClick={() => onSelectPerson(c.id)}>
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isAdmin && (
              <div className="panel-actions">
                <button className="btn" onClick={() => onSelectPerson(person.id, "edit")}>
                  تعديل
                </button>
                <button className="btn" onClick={() => onSelectPerson(person.id, "add")}>
                  إضافة ابن/ابنة
                </button>
                <button className="btn btn-danger" onClick={() => onDelete(person)}>
                  حذف
                </button>
              </div>
            )}
          </div>
        )}

        {(mode === "edit" || mode === "add") && (
          <form className="panel-form" onSubmit={submit}>
            <h2>{mode === "add" ? "إضافة فرد جديد" : "تعديل بيانات"}</h2>
            {mode === "add" && (
              <p className="panel-note">
                {parentPerson ? `سيُضاف كابن/ابنة لـ «${parentPerson.name}»` : "سيُضاف كجذر جديد للشجرة"}
              </p>
            )}

            <label>
              الاسم *
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </label>

            {mode === "edit" && (
              <label>
                الأب
                <PersonPicker
                  people={people}
                  value={form.parentId}
                  excludeIds={[person?.id, ...children.map((c) => c.id)]}
                  onChange={(id) => setForm({ ...form, parentId: id })}
                  placeholder="بدون أب (جذر)"
                />
              </label>
            )}

            <label>
              الجنس
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">غير محدد</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </label>

            <div className="form-row">
              <label>
                سنة الميلاد
                <input value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} />
              </label>
              <label>
                سنة الوفاة
                <input value={form.deathYear} onChange={(e) => setForm({ ...form, deathYear: e.target.value })} />
              </label>
            </div>

            <label>
              ملاحظات
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>

            <label>
              رابط صورة (اختياري)
              <input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} />
            </label>

            {error && <p className="form-error">{error}</p>}

            <div className="panel-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "جارِ الحفظ..." : "حفظ"}
              </button>
              <button type="button" className="btn" onClick={onClose}>
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
