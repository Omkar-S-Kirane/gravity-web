import { AppProviders } from './providers/AppProviders';
import { HomePage } from '../pages/HomePage/HomePage';

export default function App() {
  return (
    <AppProviders>
      <HomePage />
    </AppProviders>
  );
}
