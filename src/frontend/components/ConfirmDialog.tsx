interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>
          {title}
        </h2>
        <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: '15px', lineHeight: '1.5' }}>
          {message}
        </p>
        <div className="dialog-actions">
          <button onClick={onCancel} className="btn btn-secondary" style={{ flex: 1 }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className="btn btn-primary" style={{ flex: 1 }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
