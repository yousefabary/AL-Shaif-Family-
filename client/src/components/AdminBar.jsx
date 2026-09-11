import { useState } from "react";

export default function AdminBar({ isAdmin, onLogin, onLogout }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAdmin) {
    return (
      <div className="admin-bar admin-bar-active">
        <span>وضع التعديل مفعّل</span>
        <button className="btn btn-small" onClick={onLogout}>
          تسجيل الخروج
        </button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(password);
      setOpen(false);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-bar">
      {!open ? (
        <button className="btn btn-small" onClick={() => setOpen(true)}>
          تسجيل دخول المسؤول للتعديل
        </button>
      ) : (
        <form className="admin-login-form" onSubmit={submit}>
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className="btn btn-small btn-primary" disabled={busy} type="submit">
            دخول
          </button>
          <button type="button" className="btn btn-small" onClick={() => setOpen(false)}>
            إلغاء
          </button>
          {error && <span className="form-error">{error}</span>}
        </form>
      )}
    </div>
  );
}
