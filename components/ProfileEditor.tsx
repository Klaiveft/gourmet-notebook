"use client";

import { Camera, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { compressImage, uploadImage } from "@/lib/images";
import type { Profile } from "@/lib/recipes";

const AVATAR_SIZE = 512;

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImage(file, AVATAR_SIZE);
      setPhoto(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setError("Cette photo n’a pas pu être préparée. Essaie-en une autre.");
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        let avatar_url = avatarUrl;
        if (photo) {
          avatar_url = await uploadImage(photo);
          // Une nouvelle tentative ne doit pas renvoyer la même photo
          setAvatarUrl(avatar_url);
          setPhoto(null);
        }
        const result = await updateProfile({ display_name: name, bio: bio || null, avatar_url });
        if ("error" in result) return setError(result.error);
        setEditing(false);
      } catch {
        setError("Pas de connexion. Réessaie une fois en ligne.");
      }
    });
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="btn-secondary mt-3 w-full">
        <Pencil className="size-5" aria-hidden />
        Modifier mon profil
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-4 rounded-2xl bg-white p-4">
      <label className="flex cursor-pointer items-center gap-3 font-semibold">
        <Avatar person={{ display_name: name, avatar_url: avatarUrl }} src={preview} />
        <span className="flex items-center gap-1.5">
          <Camera className="size-5" aria-hidden />
          Changer ma photo
        </span>
        <input type="file" accept="image/*" onChange={choosePhoto} className="sr-only" />
      </label>

      <div>
        <label htmlFor="display-name" className="label">
          Mon nom
        </label>
        <input
          id="display-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
        />
      </div>

      <div>
        <label htmlFor="bio" className="label">
          Quelques mots sur moi
        </label>
        <textarea
          id="bio"
          rows={3}
          maxLength={300}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="La reine du gratin dauphinois…"
          className="field"
        />
      </div>

      {error && (
        <p role="alert" className="text-terracotta-deep font-semibold">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" disabled={pending} className="btn-primary px-2">
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
