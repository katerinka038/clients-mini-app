import { useEffect, useMemo, useRef, useState } from 'react';
import { confirmDialog, haptic, setClosingConfirmation } from '../app/telegram';
import {
  emptyDraft,
  draftFromClient,
  makeId,
  type ClientDraft,
  type SiteState,
} from '../domain/client';
import { shiftedISO } from '../domain/dates';
import { SERVICES, SITE_STATES, STATUSES } from '../domain/dictionaries';
import { AvatarPicker } from '../components/AvatarPicker';
import { ChipGroup } from '../components/Chips';
import { ContactsEditor } from '../components/ContactsEditor';
import { Field, Section, Segmented, TextArea, TextField } from '../components/Fields';
import { useClients } from '../store/clientsStore';
import { useNav } from '../store/navStore';

/** Заметка ограничена, чтобы запись гарантированно влезала в CloudStorage */
const NOTE_LIMIT = 1500;

interface ClientFormScreenProps {
  id?: string;
}

export function ClientFormScreen({ id }: ClientFormScreenProps) {
  const isEdit = Boolean(id);
  const existing = useClients((s) => (id ? s.byId(id) : undefined));
  const existingPhoto = useClients((s) => (id ? s.photos[id] : undefined));
  const createClientRecord = useClients((s) => s.create);
  const updateClient = useClients((s) => s.update);
  const setPhoto = useClients((s) => s.setPhoto);
  const clearPhoto = useClients((s) => s.clearPhoto);

  const back = useNav((s) => s.back);
  const setGuard = useNav((s) => s.setGuard);

  const initial = useMemo<ClientDraft>(
    () => (existing ? draftFromClient(existing) : emptyDraft()),
    // существующего клиента читаем один раз, при открытии экрана
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  const [draft, setDraft] = useState<ClientDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [showNameError, setShowNameError] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Фото лежит отдельно от карточки клиента, поэтому и в форме живёт отдельно.
  // undefined — не трогали, строка — новое фото, null — убрать.
  const [photoDraft, setPhotoDraft] = useState<string | null | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photo = photoDraft === undefined ? existingPhoto : (photoDraft ?? undefined);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial) || photoDraft !== undefined,
    [draft, initial, photoDraft],
  );

  const patch = (changes: Partial<ClientDraft>) => setDraft((d) => ({ ...d, ...changes }));

  // Телефон вынесен отдельным полем в начало формы — это самый частый контакт.
  // Хранится он всё в том же списке контактов, поэтому ниже, в блоке
  // «Ещё контакты», он не дублируется.
  const phoneContact = draft.contacts.find((c) => c.type === 'phone');
  const phone = phoneContact?.value ?? '';
  const otherContacts = draft.contacts.filter((c) => c.id !== phoneContact?.id);

  const setPhone = (value: string) => {
    if (!phoneContact) {
      if (!value.trim()) return;
      patch({ contacts: [{ id: makeId('k'), type: 'phone', value }, ...draft.contacts] });
      return;
    }
    // пустой телефон без подписи в списке не нужен
    if (!value.trim() && !phoneContact.label) {
      patch({ contacts: otherContacts });
      return;
    }
    patch({
      contacts: draft.contacts.map((c) => (c.id === phoneContact.id ? { ...c, value } : c)),
    });
  };

  // предупреждаем при уходе с незаконченной формой
  useEffect(() => {
    setClosingConfirmation(dirty);
    if (!dirty) {
      setGuard(null);
      return;
    }
    setGuard((proceed) => {
      void confirmDialog('Изменения не сохранены. Выйти?').then((ok) => {
        if (ok) proceed();
      });
    });
    return () => setGuard(null);
  }, [dirty, setGuard]);

  useEffect(() => () => setClosingConfirmation(false), []);

  // у нового клиента сразу открываем клавиатуру в поле названия
  useEffect(() => {
    if (!isEdit) nameRef.current?.focus();
  }, [isEdit]);

  const save = async () => {
    const name = draft.name.trim();
    if (!name) {
      setShowNameError(true);
      haptic('warning');
      nameRef.current?.focus();
      return;
    }

    const clean: ClientDraft = {
      ...draft,
      name,
      niche: draft.niche.trim(),
      city: draft.city.trim(),
      note: draft.note.slice(0, NOTE_LIMIT),
      contacts: draft.contacts
        .map((c) => ({ ...c, value: c.value.trim(), label: c.label?.trim() || undefined }))
        .filter((c) => c.value || c.label),
    };

    setSaving(true);
    try {
      let savedId = id;
      if (id) await updateClient(id, clean);
      else savedId = (await createClientRecord(clean)).id;

      if (photoDraft !== undefined && savedId) {
        if (photoDraft) await setPhoto(savedId, photoDraft);
        else await clearPhoto(savedId);
      }

      haptic('success');
      setClosingConfirmation(false);
      setGuard(null);
      back();
    } catch {
      // текст ошибки уже лежит в сторе и показан на экране списка
      haptic('warning');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="screen screen--with-footer">
        <header className="head">
          <div>
            <h1 className="head__title">{isEdit ? 'Редактирование' : 'Новый клиент'}</h1>
            {!isEdit && (
              <div className="head__sub">Достаточно названия — остальное можно дописать позже</div>
            )}
          </div>
        </header>

        {photoError && <div className="notice">{photoError}</div>}

        <Section>
          <div className="avatar-row">
            <AvatarPicker
              name={draft.name}
              photo={photo}
              onPick={(dataUrl) => {
                setPhotoError(null);
                setPhotoDraft(dataUrl);
              }}
              onClear={() => setPhotoDraft(null)}
              onError={setPhotoError}
            />
            <Field hint={showNameError ? 'Без названия сохранить не получится' : undefined}>
              <TextField
                ref={nameRef}
                big
                value={draft.name}
                placeholder="Название клиента"
                enterKeyHint="next"
                onChange={(event) => {
                  setShowNameError(false);
                  patch({ name: event.target.value });
                }}
              />
            </Field>
          </div>
        </Section>

        <Section>
          <Field label="Телефон">
            <TextField
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              placeholder="+7 900 000-00-00"
              enterKeyHint="next"
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
        </Section>

        <Section>
          <div className="stack-m">
            <Field label="Чем занимается">
              <TextField
                value={draft.niche}
                placeholder="Ниша: кофейня, база отдыха, салон"
                onChange={(event) => patch({ niche: event.target.value })}
              />
            </Field>
            <Field label="Город">
              <TextField
                value={draft.city}
                placeholder="Город"
                onChange={(event) => patch({ city: event.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section label="Есть сайт?">
          <Segmented<SiteState>
            options={SITE_STATES.map((s) => ({ id: s.id, label: s.label }))}
            value={draft.site}
            onChange={(site) => patch({ site })}
          />
        </Section>

        <Section label="Ещё контакты">
          <ContactsEditor
            contacts={otherContacts}
            onChange={(contacts) =>
              patch({ contacts: phoneContact ? [phoneContact, ...contacts] : contacts })
            }
          />
        </Section>

        <Section label="Что можно предложить">
          <ChipGroup
            wrap
            options={SERVICES}
            values={draft.services}
            onToggle={(service) =>
              patch({
                services: draft.services.includes(service)
                  ? draft.services.filter((s) => s !== service)
                  : [...draft.services, service],
              })
            }
          />
        </Section>

        <Section label="Статус">
          <ChipGroup
            wrap
            options={STATUSES}
            value={draft.status}
            onSelect={(status) => patch({ status })}
          />
        </Section>

        <Section label="Заметка">
          <TextArea
            value={draft.note}
            maxLength={NOTE_LIMIT}
            placeholder="Что заметила: соцсети, конкуренты, о чём говорили"
            onChange={(event) => patch({ note: event.target.value })}
          />
        </Section>

        <Section label="Вернуться к клиенту">
          <input
            className="input"
            type="date"
            value={draft.remindAt ?? ''}
            onChange={(event) => patch({ remindAt: event.target.value || null })}
          />
          <div className="chips chips--wrap" style={{ marginTop: 'var(--gap-s)' }}>
            <button type="button" className="chip" onClick={() => patch({ remindAt: shiftedISO(1) })}>
              Завтра
            </button>
            <button type="button" className="chip" onClick={() => patch({ remindAt: shiftedISO(3) })}>
              Через 3 дня
            </button>
            <button type="button" className="chip" onClick={() => patch({ remindAt: shiftedISO(7) })}>
              Через неделю
            </button>
            {draft.remindAt && (
              <button type="button" className="chip" onClick={() => patch({ remindAt: null })}>
                Убрать
              </button>
            )}
          </div>
        </Section>
      </div>

      <div className="footer-bar">
        <div className="footer-bar__inner">
          <button type="button" className="btn btn--dark" disabled={saving} onClick={save}>
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </>
  );
}
