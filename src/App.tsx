import { useEffect } from 'react';
import { useRoute } from './router';
import { TopNav } from './ui/TopNav';
import { Feedback } from './ui/Feedback';
import { Toasts } from './ui/Toast';
import { useUi } from './ui/theme';
import { ViewerPortal } from './viewer/ViewerHost';
import { HomePage } from './pages/HomePage';
import { BuilderPage } from './pages/BuilderPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFound } from './pages/NotFound';
import './App.css';
import './site.css';

export default function App() {
  const route = useRoute();
  const routeKey = route.name === 'profile' ? `p:${route.slug}` : route.name;

  // new page: close any open picker and start at the top
  useEffect(() => {
    useUi.getState().openPicker(undefined);
    window.scrollTo(0, 0);
  }, [routeKey]);

  return (
    <>
      <TopNav route={route} />
      {route.name === 'home' && <HomePage />}
      {route.name === 'new' && <BuilderPage />}
      {route.name === 'profile' && <ProfilePage key={route.slug} slug={route.slug} />}
      {route.name === 'notfound' && <NotFound kind="page" />}
      <ViewerPortal />
      <Feedback profileSlug={route.name === 'profile' ? route.slug : undefined} />
      <Toasts />
    </>
  );
}
