import { useMemo, useState } from 'react';
import { haptic } from '../app/telegram';
import { describeRow, parseClients } from '../domain/import';
import { Section, TextArea } from '../components/Fields';
import { useClients } from '../store/clientsStore';
import { useNav } from '../store/navStore';

/** Сколько строк показываем в предпросмотре */
const PREVIEW = 8;

export function ImportScreen() {
  const clients = useClients((s) => s.clients);
  const importRows = useClients((s) => s.importRows);
  const back = useNav((s) => s.back);

  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseClients(text, clients), [text, clients]);

  const pasteFromClipboard = async () => {
    setError(null);
    try {
      const fromBuffer = await navigator.clipboard.readText();
      if (fromBuffer.trim()) {
        setText(fromBuffer);
        haptic('success');
      } else {
        setError('В буфере пусто. Скопируй список и попробуй ещё раз.');
      }
    } catch {
      setError('Телефон не дал прочитать буфер. Вставь список в поле ниже вручную.');
    }
  };

  const save = async () => {
    if (parsed.rows.length === 0) return;
    setSaving(true);
    setProgress(0);
    setError(null);
    try {
      const { added, updated } = await importRows(parsed.rows, setProgress);
      haptic('success');
      setResult(
        [added > 0 ? `добавлено ${added}` : '', updated > 0 ? `обновлено ${updated}` : '']
          .filter(Boolean)
          .join(', '),
      );
      setText('');
    } catch {
      haptic('warning');
      setError('Сохранились не все записи. Посмотри список и попробуй остальные ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="screen screen--with-footer">
        <header className="head">
          <div>
            <h1 className="head__title">Загрузить список</h1>
            <div className="head__sub">
              Вставь таблицу или строки вида «Название; ниша; город; канал; контакт; статус»
            </div>
          </div>
        </header>

        {error && <div className="notice">{error}</div>}

        {result && (
          <div className="import-done">
            Готово: {result}. Цифры пересчитаны.
          </div>
        )}

        <Section>
          <button type="button" className="btn btn--soft" onClick={() => void pasteFromClipboard()}>
            Вставить из буфера
          </button>
        </Section>

        <Section label="Или вставь сюда">
          <TextArea
            value={text}
            placeholder={'Радуга; детские центры; Обнинск; telegram; @raduga; написала'}
            onChange={(event) => {
              setResult(null);
              setText(event.target.value);
            }}
          />
        </Section>

        {parsed.rows.length > 0 && (
          <Section label="Что получится">
            <div className="panel">
              <div className="kv">
                <span className="kv__key">Новых</span>
                <span className="kv__val">{parsed.added}</span>
              </div>
              <div className="kv">
                <span className="kv__key">Обновятся</span>
                <span className="kv__val">{parsed.updated}</span>
              </div>
              {parsed.skipped > 0 && (
                <div className="kv">
                  <span className="kv__key">Пропущено строк</span>
                  <span className="kv__val muted">{parsed.skipped}</span>
                </div>
              )}
            </div>

            <div className="import-list">
              {parsed.rows.slice(0, PREVIEW).map((row, i) => (
                <div className="import-row" key={`${row.name}-${i}`}>
                  <span className="import-row__name">{row.name}</span>
                  <span className="import-row__meta">
                    {row.existingId ? 'обновится' : describeRow(row) || 'новая карточка'}
                  </span>
                </div>
              ))}
              {parsed.rows.length > PREVIEW && (
                <div className="import-row import-row--more">
                  и ещё {parsed.rows.length - PREVIEW}
                </div>
              )}
            </div>
          </Section>
        )}

        {text.trim() && parsed.rows.length === 0 && (
          <Section>
            <p className="hint-text" style={{ marginTop: 0 }}>
              Не нашла ни одной записи. В каждой строке первым должно идти название клиента,
              остальное — через точку с запятой.
            </p>
          </Section>
        )}
      </div>

      <div className="footer-bar">
        <div className="footer-bar__inner">
          <button
            type="button"
            className="btn btn--dark"
            disabled={saving || parsed.rows.length === 0}
            onClick={() => void save()}
          >
            {saving
              ? `Сохраняю ${progress} из ${parsed.rows.length}…`
              : parsed.rows.length > 0
                ? `Добавить ${parsed.rows.length}`
                : 'Добавить'}
          </button>
          {!saving && (
            <button type="button" className="btn btn--quiet" onClick={back}>
              Назад
            </button>
          )}
        </div>
      </div>
    </>
  );
}
