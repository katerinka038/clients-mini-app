import { haptic } from '../app/telegram';
import { useNav } from '../store/navStore';
import { BellIcon, PeopleIcon, PlusIcon } from './icons';

export function TabBar() {
  const tab = useNav((s) => s.tab);
  const setTab = useNav((s) => s.setTab);
  const push = useNav((s) => s.push);

  return (
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
        className="tab-plus"
        aria-label="Добавить клиента"
        onClick={() => {
          haptic('tap');
          push({ name: 'form' });
        }}
      >
        <PlusIcon size={24} />
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
  );
}
