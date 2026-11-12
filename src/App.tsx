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
import { FilmPage } from './pages/FilmPage';
import { SignInPage } from './pages/SignInPage';
import { SignInHost } from './ui/SignIn';
import './state/account';
import './App.css';
import './site.css';
import './film.css';

export default function App() {
  const route = useRoute();
  const routeKey = route.name === 'profile' ? `p:${route.slug}` : route.name;

  // new page: close any open picker and start at the top
  useEffect(() => {
    useUi.getState().openPicker(undefined);
    useUi.getState().showDetail(undefined);
    document.body.style.cursor = ''; // a 3D gear hover may not get its pointer-out
    window.scrollTo(0, 0);
  }, [routeKey]);

  return (
    <>
      <TopNav route={route} />
      {route.name === 'home' && <HomePage />}
      {route.name === 'new' && <BuilderPage />}
      {route.name === 'profile' && <ProfilePage key={route.slug} slug={route.slug} />}
      {route.name === 'film' && <FilmPage />}
      {route.name === 'signin' && <SignInPage />}
      {route.name === 'notfound' && <NotFound kind="page" />}
      <ViewerPortal />
      <Feedback profileSlug={route.name === 'profile' ? route.slug : undefined} />
      <SignInHost />
      <Toasts />
    </>
  );
}
