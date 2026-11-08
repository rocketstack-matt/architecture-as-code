interface ConfirmActionDialogProps {
    open: boolean;
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmActionDialog({ open, title, onConfirm, onCancel }: ConfirmActionDialogProps) {
    if (!open) {
        return null;
    }

    return (
        <dialog open className="modal modal-open" aria-label="Confirm action">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Confirm action</h3>
                <p className="py-4">Run {title}?</p>
                <div className="modal-action">
                    <button className="btn btn-primary" onClick={onConfirm}>
                        Run
                    </button>
                    <button className="btn btn-ghost" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onCancel}>close</button>
            </form>
        </dialog>
    );
}
