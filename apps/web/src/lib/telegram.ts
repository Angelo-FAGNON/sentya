// Lien profond t.me : le paramètre start indique d'où vient le jeune (indicateur par canal).

export function lienTelegram(nomBot: string, source: string): string {
  return `https://t.me/${encodeURIComponent(nomBot)}?start=${encodeURIComponent(source)}`;
}
