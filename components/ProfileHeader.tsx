import { Avatar, displayName } from "@/components/Avatar";
import type { Profile } from "@/lib/recipes";

const memberSince = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

export function ProfileHeader({ profile, stats }: { profile: Profile | null; stats: { label: string; value: number }[] }) {
  return (
    <header className="text-center">
      <Avatar person={profile} size="lg" />
      <h1 className="mt-3 text-3xl font-semibold">{displayName(profile)}</h1>
      {profile?.bio && <p className="text-espresso/80 mx-auto mt-1 max-w-md whitespace-pre-line">{profile.bio}</p>}
      {profile?.created_at && (
        <p className="text-espresso/70 mt-1 text-sm">Membre depuis {memberSince.format(new Date(profile.created_at))}</p>
      )}
      <dl className="mt-4 flex justify-center gap-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="min-w-0 flex-1 rounded-2xl bg-white px-1 py-3 shadow-sm">
            <dd className="font-serif text-2xl font-semibold">{value}</dd>
            <dt className="text-espresso/70 text-sm leading-tight">{label}</dt>
          </div>
        ))}
      </dl>
    </header>
  );
}
