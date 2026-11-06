import credits from "@/supabase/seed/images/credits.json";

export default function CreditsPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-semibold">Crédits photos</h1>
      <p className="text-espresso/75 mb-5">
        Les photos du catalogue viennent de Wikimedia Commons, sous licence libre. Merci à leurs autrices et auteurs.
      </p>
      <ul className="divide-espresso/10 divide-y">
        {Object.values(credits).map(({ text, source, title }) => (
          <li key={source} className="py-2">
            <a href={source} target="_blank" rel="noopener noreferrer" className="block min-h-12 underline">
              {title.replace(/^File:/, "")}
            </a>
            <p className="text-espresso/70 text-sm">{text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
