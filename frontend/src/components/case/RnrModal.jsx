import { useState } from 'react';
import * as personsApi from '../../api/persons';
import { useMutation } from '../../hooks/useApi';
import { useEnums } from '../../hooks/useEnums';
import { rnrStatusLabel } from '../../lib/labels';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Select } from '../ui/Field';

/* Resettlement, edited on its own and by a different office. A household
   with no land title has no compensation record at all and still has this
   one — which is exactly why the two are never one form. */
export default function RnrModal({ person, onClose, onDone }) {
  const { rnr_statuses: statuses } = useEnums();
  const record = person.rnr;

  const [values, setValues] = useState({
    status: record.status,
    entitlement: record.entitlement || '',
  });

  const save = useMutation((payload) => personsApi.updateRnr(record.id, payload));

  async function onSave() {
    try {
      await save.run({
        status: values.status,
        entitlement: values.entitlement.trim() || null,
      });
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
      title="Rehabilitation & Resettlement"
      subtitle={`${person.name} · ${person.village_name}`}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={save.pending}>
            {save.pending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <Select
        label="Status"
        value={values.status}
        options={statuses.map((value) => ({ value, label: rnrStatusLabel(value) }))}
        onChange={(event) => setValues((c) => ({ ...c, status: event.target.value }))}
      />

      <Input
        label="Entitlement"
        value={values.entitlement}
        maxLength={200}
        placeholder="Housing site and construction assistance"
        onChange={(event) => setValues((c) => ({ ...c, entitlement: event.target.value }))}
        hint="The benefit owed under the Second Schedule."
      />

      <p style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.55 }}>
        {person.has_land_title
          ? 'This household also holds land title, so it has a separate compensation record.'
          : 'This household holds no land title. Resettlement is owed on displacement regardless, and there is no compensation record to edit.'}
      </p>
    </Modal>
  );
}
