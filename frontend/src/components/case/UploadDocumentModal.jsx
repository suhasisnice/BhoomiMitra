import { useState } from 'react';
import * as documentsApi from '../../api/documents';
import { useMutation } from '../../hooks/useApi';
import { useEnums } from '../../hooks/useEnums';
import { docTypeLabel } from '../../lib/labels';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Select } from '../ui/Field';

/* File a document against a case.

   The upload is a real multipart request with real errors — a rejected file
   type or a size limit surfaces here rather than failing silently, because a
   document someone believes they filed and did not is worse than a visible
   refusal. */
export default function UploadDocumentModal({ caseId, onClose, onDone }) {
  const { doc_types: docTypes } = useEnums();
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const [touched, setTouched] = useState(false);

  const upload = useMutation((payload) => documentsApi.upload(payload));

  async function onUpload() {
    setTouched(true);
    if (!docType || !file) return;

    try {
      await upload.run({ caseId, docType, file });
      onDone();
    } catch {
      /* useMutation holds it; the modal renders it. */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={upload.pending}
      error={upload.error}
      title="File a document"
      subtitle="Recorded against this case with your name and the date it was filed."
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={upload.pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onUpload} disabled={upload.pending}>
            {upload.pending ? 'Uploading…' : 'Upload'}
          </Button>
        </>
      }
    >
      <Select
        label="Document type"
        value={docType}
        placeholder="Choose a type"
        error={touched && !docType ? 'Choose what this document is' : null}
        options={docTypes.map((value) => ({ value, label: docTypeLabel(value) }))}
        onChange={(event) => setDocType(event.target.value)}
        hint="The type decides which statutory requirement this satisfies."
      />

      <div className={`field${touched && !file ? ' field--invalid' : ''}`}>
        <label className="field__label" htmlFor="doc-file">
          File
        </label>
        <input
          id="doc-file"
          className="field__control"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
          onChange={(event) => setFile(event.target.files[0] || null)}
        />
        {touched && !file ? (
          <span className="field__error" role="alert">
            Choose a file to upload
          </span>
        ) : (
          <span className="field__hint">PDF or a scan. Signed copies, not drafts.</span>
        )}
      </div>
    </Modal>
  );
}
