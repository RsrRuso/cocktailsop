import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <section className="text-center space-y-4 px-6">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">This page couldnt be found.</p>
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card px-4 py-3 text-left">
          <p className="text-sm text-muted-foreground">Tried to open:</p>
          <code className="mt-1 block break-all text-sm text-foreground">{location.pathname}</code>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link to="/home" className="text-primary underline hover:text-primary/80 inline-block">
            Go to Home
          </Link>
          <Link to="/hr-dashboard" className="text-primary underline hover:text-primary/80 inline-block">
            Go to HR
          </Link>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
