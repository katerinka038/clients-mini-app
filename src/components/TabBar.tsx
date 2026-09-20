import { haptic } from '../app/telegram';
import { useNav } from '../store/navStore';
import { BellIcon, ChartIcon, PeopleIcon, PlusIcon } from './icons';

/**
 * Три вкладки в ряд плюс круглая кнопка добавления. Кнопка вынесена
 * из строки и висит над меню справа: после появления «Цифр» четвёртый
 * элемент в строку уже не помещался.
 */
export function TabBar() {
  const tab = useNav((s) => s.tab);
  const setTab = useNav((s) => s.setTab);
  const push = useNav((s) => s.push);

  return (
    <>
      <nav className="tabbar">
        <button
          type="button"
          className={`tab${tab === 'clients' ? ' tab--on' : ''}`}
          onClick={() => {
            haptic('select');
            setTab('clients');
          }}
        >
          <PeopleIcon />
          Клиенты
        </button>

        <button
          type="button"
          className={`tab${tab === 'numbers' ? ' tab--on' : ''}`}
          onClick={() => {
            haptic('select');
            setTab('numbers');
          }}
        >
          <ChartIcon />
          Цифры
        </button>

        <button
          type="button"
          className={`tab${tab === 'reminders' ? ' tab--on' : ''}`}
          onClick={() => {
            haptic('select');
            setTab('reminders');
          }}
        >
          <BellIcon />
          Напоминания
        </button>
      </nav>

      <button
        type="button"
        className="tab-plus"
        aria-label="Добавить клиента"
        onClick={() => {
          haptic('tap');
          push({ name: 'form' });
        }}
      >
        <PlusIcon size={24} />
      </button>
    </>
  );
}
