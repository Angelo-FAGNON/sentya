// Politique de sécurité du contenu. Pas de 'unsafe-eval' en production : seul le mode
// développement de React en a besoin (reconstruction des piles d'erreurs).

export function construireCsp(nonce: string, options: { developpement: boolean; https: boolean }) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.developpement ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (options.https) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
