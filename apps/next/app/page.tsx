import Scene from './Scene';

// Server component: the page shell renders on the server; the WebGL scene and
// Motion copy are a client component.
export default function Page() {
  return <Scene />;
}
