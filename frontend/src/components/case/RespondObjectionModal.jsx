import { useState } from 'react';
import * as objectionsApi from '../../api/objections';
import { useMutation } from '../../hooks/useApi';
import { objectionStatusLabel } from '../../lib/labels';
import * as fmt from '../../lib/format';
import { minLength, required, validate } from '../../lib/validate';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Select, Textarea } from '../ui/Field';

/* The officer's response and outcome under Section 15.

   Only the two terminal statuses are offered: recording a response and
   leaving the objection "filed" is not an outcome, it is a contradiction. */
const OUTCOMES = ['resolved', 'rejected', 'under_review'];

export default function RespondObjectionModal({ objection, onClose, onDone }) {
  const [values, setValues] = useState({ status: 'resolved', response: '' });
  const [errors, setErrors] = useState({});

  const save = useMutation((payload) => objectionsApi.respond(objection.id, payload));

  async function onSave() {
    const result = validate(values, {
      response: [required('Response'), minLength('Response', 10)],
    });
    setErrors(result.errors);
    if (!result.isValid) return;

    try {
      await save.run({ status: values.status, response: values.response.trim() });
      onDone();
    } catch {
      /* useMutation holds it; the modal renders it. */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={save.pending}
      error={save.error}
      title="Record a response"
      subtitle={`${objection.person_name} · filed ${fmt.date(objection.filed_on)}`}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={save.pending}>
            {save.pending ? 'Recording…' : 'Record'}
          </Button>
        </>
      }
    >
      <div
        style={{
          padding: 'var(--s3) var(--s4)',
          background: 'var(--surface-alt)',
          borderRadius: 'var(--r-md)',
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
      >
        {objection.grounds}
      </div>

      <Select
        label="Outcome"
        value={values.status}
        options={OUTCOMES.map((value) => ({ value, label: objectionStatusLabel(value) }))}
        onChange={(event) => setValues((c) => ({ ...c, status: event.target.value }))}
      />

      <Textarea
        label="Response"
        value={values.response}
        error={errors.response}
        rows={5}
        placeholder="The reasoning given to the objector, in the terms it will be recorded in."
        onChange={(event) => setValues((c) => ({ ...c, response: event.target.value }))}
        hint="This is shown to the person who filed the objection."
      />
    </Modal>
  );
}
