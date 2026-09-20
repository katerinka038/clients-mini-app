import { useEffect, useMemo, useRef, useState } from 'react';
import { confirmDialog, haptic, setClosingConfirmation } from '../app/telegram';
import {
  emptyDraft,
  draftFromClient,
  makeId,
  type ClientDraft,
  type SiteState,
} from '../domain/client';
import { shiftedISO, todayISO } from '../domain/dates';
import {
  CHANNELS,
  OPENED_STATUSES,
  SERVICES,
  SITE_STATES,
  SOURCES,
  STATUSES,
  findStatus,
} from '../domain/dictionaries';
import { CALL_SET_STATUSES } from '../domain/dictionaries';
import { AvatarPicker } from '../components/AvatarPicker';
import { ChipGroup } from '../components/Chips';
import { ContactsEditor } from '../components/ContactsEditor';
import { Field, Section, Segmented, TextArea, TextField, Toggle } from '../components/Fields';
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

  /**
   * Статус тянет за собой даты: как только сообщение ушло, проставляем дату
   * первого касания, а ответ означает, что человек сообщение точно прочитал.
   * Иначе эти две галочки пришлось бы ставить руками каждый раз.
   */
  const setStatus = (status: string) => {
    const changes: Partial<ClientDraft> = { status };
    if (status !== 'not_written' && !draft.firstTouchAt) changes.firstTouchAt = todayISO();
    if (OPENED_STATUSES.includes(status)) changes.opened = true;
    patch(changes);
  };

  const pingedToday = draft.pings.includes(todayISO());

  const togglePingToday = () => {
    const today = todayISO();
    patch({
      pings: pingedToday
        ? draft.pings.filter((p) => p !== today)
        : [...draft.pings, today].sort(),
    });
  };

  const showAmount = CALL_SET_STATUSES.includes(draft.status);

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
      decisionMaker: draft.decisionMaker.trim(),
      role: draft.role.trim(),
      hook: draft.hook.trim(),
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

        <Section label="Кто решает">
          <div className="stack-m">
            <Field hint="Владелец или руководитель направления — тот, кто говорит «делаем»">
              <TextField
                value={draft.decisionMaker}
                placeholder="Имя"
                onChange={(event) => patch({ decisionMaker: event.target.value })}
              />
            </Field>
            <Field>
              <TextField
                value={draft.role}
                placeholder="Должность: владелец, управляющий, маркетолог"
                onChange={(event) => patch({ role: event.target.value })}
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

        <Section label="Зацепка">
          <Field hint="Что у них не так — с этого и заходим в сообщении">
            <TextField
              value={draft.hook}
              placeholder="Запись только по телефону; сайт из 2015-го"
              onChange={(event) => patch({ hook: event.target.value })}
            />
          </Field>
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

        <Section label="Где нашла">
          <ChipGroup
            wrap
            options={SOURCES}
            value={draft.source}
            onSelect={(source) => patch({ source: draft.source === source ? '' : source })}
          />
        </Section>

        <Section label="Куда пишу">
          <ChipGroup
            wrap
            options={CHANNELS}
            value={draft.channel}
            onSelect={(channel) => patch({ channel: draft.channel === channel ? '' : channel })}
          />
        </Section>

        <Section label="Статус">
          <ChipGroup wrap options={STATUSES} value={draft.status} onSelect={setStatus} />
          <div className="field__hint" style={{ marginTop: 'var(--gap-s)' }}>
            {findStatus(draft.status).hint}
          </div>
        </Section>

        <Section label="Касание">
          <div className="stack-m">
            <Field label="Первое сообщение">
              <input
                className="input"
                type="date"
                value={draft.firstTouchAt ?? ''}
                onChange={(event) => patch({ firstTouchAt: event.target.value || null })}
              />
            </Field>

            {!draft.firstTouchAt && (
              <div className="chips chips--wrap">
                <button
                  type="button"
                  className="chip"
                  onClick={() => patch({ firstTouchAt: todayISO() })}
                >
                  Написала сегодня
                </button>
              </div>
            )}

            <Toggle
              label="Прочитал сообщение"
              hint="Две галочки в мессенджере — из этого считается открываемость"
              checked={draft.opened}
              onChange={(opened) => patch({ opened })}
            />

            <Toggle
              label="Напомнила о себе сегодня"
              hint={
                draft.pings.length > 0
                  ? `Всего напоминаний: ${draft.pings.length}`
                  : 'Смайлик, кружок или полезное сообщение'
              }
              checked={pingedToday}
              onChange={togglePingToday}
            />
          </div>
        </Section>

        {showAmount && (
          <Section label="Сумма сделки">
            <Field hint="Сколько получилось или сколько ждём">
              <TextField
                inputMode="numeric"
                value={draft.amount ? String(draft.amount) : ''}
                placeholder="45000"
                onChange={(event) =>
                  patch({ amount: Number(event.target.value.replace(/\D+/g, '')) || 0 })
                }
              />
            </Field>
          </Section>
        )}

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
            <button type="button" className="chip" onClick={() => patch({ remindAt: shiftedISO(30) })}>
              Через месяц
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
