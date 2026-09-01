import { useState } from 'react';
import * as personsApi from '../../api/persons';
import { useMutation } from '../../hooks/useApi';
import { useEnums } from '../../hooks/useEnums';
import { compensationStatusLabel } from '../../lib/labels';
import * as fmt from '../../lib/format';
import { isNumber, notNegative, validate } from '../../lib/validate';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Select } from '../ui/Field';

/* Compensation, edited on its own. Never in the same dialog as R&R — they
   are different offices, different questions, and they can legitimately
   disagree. */
export default function CompensationModal({ person, onClose, onDone }) {
  const { compensation_statuses: statuses } = useEnums();
  const record = person.compensation;

  const [values, setValues] = useState({
    amount_awarded: String(record.amount_awarded),
    amount_paid: String(record.amount_paid),
    status: record.status,
  });
  const [errors, setErrors] = useState({});

  const save = useMutation((payload) => personsApi.updateCompensation(record.id, payload));

  function set(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
  }

  async function onSave() {
    const result = validate(values, {
      amount_awarded: [isNumber('Amount awarded'), notNegative('Amount awarded')],
      amount_paid: [isNumber('Amount paid'), notNegative('Amount paid')],
    });

    const awarded = Number(values.amount_awarded);
    const paid = Number(values.amount_paid);
    if (!result.errors.amount_paid && paid > awarded) {
      result.errors.amount_paid = 'Paid cannot exceed the amount awarded';
      result.isValid = false;
    }

    setErrors(result.errors);
    if (!result.isValid) return;

    try {
      await save.run({
        amount_awarded: awarded,
        amount_paid: paid,
        status: values.status,
      });
      onDone();
    } catch {
      /* useMutation holds it; the modal renders it. */
    }
  }

  const outstanding = Number(values.amount_awarded || 0) - Number(values.amount_paid || 0);

  return (
    <Modal
      open
      onClose={onClose}
      busy={save.pending}
      error={save.error}
      title="Compensation"
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
      <Input
        label="Amount awarded (₹)"
        inputMode="numeric"
        value={values.amount_awarded}
        error={errors.amount_awarded}
        onChange={(event) => set('amount_awarded', event.target.value)}
        hint="Whole rupees, as determined in the award."
      />

      <Input
        label="Amount paid (₹)"
        inputMode="numeric"
        value={values.amount_paid}
        error={errors.amount_paid}
        onChange={(event) => set('amount_paid', event.target.value)}
      />

      <Select
        label="Status"
        value={values.status}
        options={statuses.map((value) => ({
          value,
          label: compensationStatusLabel(value),
        }))}
        onChange={(event) => set('status', event.target.value)}
      />

      <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        Outstanding:{' '}
        <strong style={{ color: outstanding > 0 ? 'var(--warn)' : 'var(--ok)' }}>
          {fmt.rupees(Math.max(0, outstanding))}
        </strong>
      </p>

      <p style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.55 }}>
        Resettlement is recorded separately and is not affected by anything on this
        form.
      </p>
    </Modal>
  );
}
