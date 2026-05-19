import Link from "next/link";

export default function NotFound() {
  return (
    <main className="loading-page">
      <p className="eyebrow">Page not found</p>
      <h1>This dashboard page does not exist.</h1>
      <p className="muted-line">Return to the owner overview to continue reviewing the tracker.</p>
      <Link className="button-primary" href="/">
        Back to overview
      </Link>
    </main>
  );
}
