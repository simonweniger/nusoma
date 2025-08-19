import type { Metadata } from 'next';
import { Demo } from './components/demo';
import { Features } from './components/features';
import { Hero } from './components/hero';
import { Providers } from './components/providers';
import { Tweets } from './components/tweets';

export const metadata: Metadata = {
  title: 'A visual AI playground | nusoma',
  description:
    'nusoma is an open source canvas for building AI workflows. Drag, drop connect and run nodes to build your own workflows powered by various industry-leading AI models.',
};

const buttons = [
  {
    title: 'Get started for free',
    link: '/sign-up',
  },
  {
    title: 'Login',
    link: '/sign-in',
  },
];

const Home = () => (
  <>
    <Hero
      announcement={{
        title: 'nusoma is now open source!',
        link: 'https://x.com/simonweniger/status/1923061663437291832',
      }}
      buttons={buttons}
    />
    <Demo />
    <Providers />
    <Tweets
      ids={[
        '1916536490831626365',
        '1916533812223189208',
        '1916404495740813630',
      ]}
    />
    <Features />
    <Tweets
      ids={[
        '1916381488494612687',
        '1916282633362805132',
        '1916494270262813000',
      ]}
    />
  </>
);

export default Home;
