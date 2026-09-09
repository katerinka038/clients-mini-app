import { makeId, type Contact } from '../domain/client';
import { CONTACT_TYPES, DEFAULT_CONTACT_TYPE, findContactType } from '../domain/dictionaries';
import { CloseIcon, PlusIcon } from './icons';

interface ContactsEditorProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
}

export function ContactsEditor({ contacts, onChange }: ContactsEditorProps) {
  const update = (id: string, changes: Partial<Contact>) => {
    onChange(contacts.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  };

  const add = () => {
    onChange([...contacts, { id: makeId('k'), type: DEFAULT_CONTACT_TYPE, value: '' }]);
  };

  return (
    <div>
      {contacts.map((contact) => {
        const def = findContactType(contact.type);
        return (
          <div className="contact-row" key={contact.id}>
            <div className="contact-row__top">
              <select
                className="select contact-row__type"
                value={contact.type}
                aria-label="Тип контакта"
                onChange={(event) => update(contact.id, { type: event.target.value })}
              >
                {CONTACT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
                {/* тип из будущей версии словаря не должен пропасть */}
                {!CONTACT_TYPES.some((t) => t.id === contact.type) && (
                  <option value={contact.type}>{contact.type}</option>
                )}
              </select>

              <input
                className="input"
                value={contact.value}
                placeholder={def.placeholder}
                inputMode={def.inputMode}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) => update(contact.id, { value: event.target.value })}
              />

              <button
                type="button"
                className="contact-row__remove"
                aria-label="Удалить контакт"
                onClick={() => onChange(contacts.filter((c) => c.id !== contact.id))}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <input
              className="input contact-row__name"
              value={contact.label ?? ''}
              placeholder="Имя — необязательно"
              onChange={(event) => update(contact.id, { label: event.target.value })}
            />
          </div>
        );
      })}

      <button type="button" className="btn-ghost" onClick={add}>
        <PlusIcon size={16} />
        Добавить контакт
      </button>
    </div>
  );
}
