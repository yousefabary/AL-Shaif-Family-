export default function PdfViewer({ onClose }) {
  return (
    <div className="pdf-backdrop" onClick={onClose}>
      <div className="pdf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <span>الوثيقة الأصلية - مشجر آل الشايف (النسخة الثانية)</span>
          <button className="panel-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <iframe title="مخطط آل الشايف الأصلي" src="/source/Al_Shaif_2023.pdf" />
      </div>
    </div>
  );
}
