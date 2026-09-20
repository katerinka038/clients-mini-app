import { useEffect } from 'react';
import { initTelegram, showBackButton } from './app/telegram';
import { TabBar } from './components/TabBar';
import { ClientDetailsScreen } from './screens/ClientDetailsScreen';
import { ClientFormScreen } from './screens/ClientFormScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import { ImportScreen } from './screens/ImportScreen';
import { NumbersScreen } from './screens/NumbersScreen';
import { RemindersScreen } from './screens/RemindersScreen';
import { useClients } from './store/clientsStore';
import { useNav } from './store/navStore';

export default function App() {
  const load = useClients((s) => s.load);
  const stack = useNav((s) => s.stack);
  const tab = useNav((s) => s.tab);
  const back = useNav((s) => s.back);

  useEffect(() => {
    initTelegram();
    void load();
  }, [load]);

  // системная кнопка «назад» Telegram — только когда есть куда возвращаться
  useEffect(() => {
    if (stack.length === 0) return;
    return showBackButton(() => useNav.getState().back());
  }, [stack.length]);

  // аппаратная кнопка «назад» на Android и жест в браузере
  useEffect(() => {
    const onPopState = () => {
      if (useNav.getState().stack.length > 0) {
        window.history.pushState(null, '');
        back();
      }
    };
    window.history.pushState(null, '');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [back]);

  const screen = stack.length > 0 ? stack[stack.length - 1] : ({ name: tab } as const);

  return (
    <div className="app">
      {screen.name === 'clients' && <ClientsScreen />}
      {screen.name === 'numbers' && <NumbersScreen />}
      {screen.name === 'reminders' && <RemindersScreen />}
      {screen.name === 'details' && <ClientDetailsScreen id={screen.id} />}
      {screen.name === 'form' && <ClientFormScreen key={screen.id ?? 'new'} id={screen.id} />}
      {screen.name === 'import' && <ImportScreen />}

      {stack.length === 0 && <TabBar />}
    </div>
  );
}
