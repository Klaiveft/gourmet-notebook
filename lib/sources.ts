import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import type { SourcePlatform } from "./schemas.ts";

const MAX_BYTES = 2_000_000;
const MAX_TEXT = 60_000;
const USER_AGENT = "Mozilla/5.0 (compatible; LeCarnetGourmand/1.0)";

const OEMBED: Partial<Record<SourcePlatform, string>> = {
  youtube: "https://www.youtube.com/oembed",
  tiktok: "https://www.tiktok.com/oembed",
};

const privateRanges = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const) {
  privateRanges.addSubnet(net, prefix, "ipv4");
}
privateRanges.addAddress("::", "ipv6");
privateRanges.addAddress("::1", "ipv6");
privateRanges.addSubnet("fc00::", 7, "ipv6");
privateRanges.addSubnet("fe80::", 10, "ipv6");

export function isPrivateAddress(address: string): boolean {
  return privateRanges.check(address, isIP(address) === 6 ? "ipv6" : "ipv4");
}

function isHost(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function detectPlatform(url: URL): SourcePlatform {
  const host = url.hostname.toLowerCase();
  if (isHost(host, "youtube.com") || isHost(host, "youtu.be")) return "youtube";
  if (isHost(host, "tiktok.com")) return "tiktok";
  if (isHost(host, "instagram.com")) return "instagram";
  return "web";
}

/** Forme canonique attendue par Gemini ; les Shorts et youtu.be n'en font pas partie. */
export function youtubeWatchUrl(url: URL): string | null {
  const id = isHost(url.hostname.toLowerCase(), "youtu.be")
    ? url.pathname.split("/")[1]
    : (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1]);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

// L'URL vient de l'utilisatrice : sans ce filtre, le serveur pourrait être envoyé sur son réseau interne.
// shortcut: la vérification DNS précède le fetch (rebinding possible), à durcir si l'inscription devient publique.
async function safeFetch(rawUrl: string): Promise<Response> {
  let url = new URL(rawUrl);
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Protocole refusé");
    const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true });
    if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error("Adresse privée refusée");

    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: { "user-agent": USER_AGENT, "accept-language": "fr,en;q=0.8" },
    });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return response;
    url = new URL(location, url);
  }
  throw new Error("Trop de redirections");
}

async function readText(response: Response): Promise<string> {
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (let size = 0; size < MAX_BYTES; ) {
    const { done, value } = await reader.read();
    if (done) return text;
    size += value.length;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  return text;
}

/** Ne garde que ce qui peut décrire une recette. Les pages sociales n'ont que leurs métadonnées d'utiles. */
export function pageToText(html: string, platform: SourcePlatform): string {
  const parts: string[] = [];

  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/(?:property|name)=["'](?:og:title|og:description|description)["']/i.test(tag)) {
      const content = tag.match(/content=(?:"([^"]*)"|'([^']*)')/i);
      if (content) parts.push(content[1] ?? content[2]);
    }
  }

  // Les blogs publient souvent la recette complète en JSON-LD
  for (const [, json] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    parts.push(json.trim());
  }

  if (platform === "youtube") {
    const description = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1];
    if (description) parts.push(JSON.parse(`"${description}"`));
  }

  if (platform === "web") {
    parts.push(
      html
        .replace(/<(script|style|svg|nav|footer|header|noscript)\b[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }

  return [...new Set(parts.filter(Boolean))].join("\n\n").slice(0, MAX_TEXT);
}

/** Métadonnées publiques de la source. Ne lève jamais : un texte vide déclenche le mode « coller ». */
export async function fetchSourceText(url: URL, platform: SourcePlatform): Promise<string> {
  const parts: string[] = [];

  const oembed = OEMBED[platform];
  if (oembed) {
    try {
      const response = await safeFetch(`${oembed}?format=json&url=${encodeURIComponent(url.href)}`);
      const { title } = JSON.parse(await readText(response)) as { title?: string };
      if (title) parts.push(title);
    } catch (error) {
      console.warn("oEmbed indisponible", url.hostname, error);
    }
  }

  try {
    parts.push(pageToText(await readText(await safeFetch(url.href)), platform));
  } catch (error) {
    console.warn("Page illisible", url.hostname, error);
  }

  return parts.filter(Boolean).join("\n\n");
}
