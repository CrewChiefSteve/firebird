import Link from "next/link";

export function Nav({ shop }: { shop?: boolean }) {
  return (
    <nav className="nav wrap">
      <Link className="brand" href="/">Project <b>Trans Am</b></Link>
      <span className="sp" />
      {shop ? (
        <Link href="/">Public site</Link>
      ) : (
        <>
          <Link href="/#story">The story</Link>
          <Link href="/#progress">Progress</Link>
          <Link href="/#log">Build log</Link>
          <Link href="/parts">Adopt a part</Link>
          <Link href="/shop" className="shoplink" title="Crew only">Shop</Link>
        </>
      )}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="wrap">
      <span>Project Trans Am</span>
      <span className="sp" />
      <span>Built in the shop by Jennifer, Steve &amp; Nick</span>
    </footer>
  );
}
