/**
 * The "Send to Lemme Cook" bookmarklet. It runs in the user's own tab on the recipe page, so it
 * sees exactly what they see — including sites that refuse our server. It sends only the parts we
 * parse (recipe JSON-LD, microdata, og: tags), plus the page text as a last resort, in the URL
 * fragment of /import so nothing touches our server.
 */
export type BookmarkletPayload = {
  /** Page URL. */
  u: string;
  /** Page title. */
  t: string;
  /** HTML fragments: recipe JSON-LD scripts, og: meta tags, and the microdata recipe element. */
  h: string;
  /** Selected text, or the recipe area's visible text — for pages with no structured data. */
  x: string;
};

// Plain ES5 so it runs on any page, whatever that page's own scripts have done.
const SOURCE = `(function(){
var d=document,a=function(s){return [].slice.call(d.querySelectorAll(s))},
h=a('script[type="application/ld+json"]').filter(function(s){return /Recipe/.test(s.textContent)})
.concat(a('meta[property^="og:"]')).map(function(e){return e.outerHTML}).join(''),
r=d.querySelector('[itemtype*="schema.org/Recipe"]'),
s=String(getSelection()).trim(),
p=d.querySelector('.wprm-recipe,.tasty-recipes,.mv-create-card,[class*="recipe-card"],[itemtype*="schema.org/Recipe"],article,main')||d.body;
if(r&&h.length+r.outerHTML.length<4e5)h+=r.outerHTML;
var u=__ORIGIN__+'/import#'+encodeURIComponent(JSON.stringify({u:location.href,t:d.title,h:h.slice(0,8e5),x:(s||p.innerText).slice(0,3e4)}));
if(!window.open(u,'_blank'))location.href=u;
})()`;

export function bookmarkletHref(origin: string) {
  const code = SOURCE.replace("__ORIGIN__", JSON.stringify(origin)).replace(/\n/g, "");
  return `javascript:${encodeURIComponent(code)}`;
}

export function readPayload(hash: string): BookmarkletPayload | null {
  try {
    const p = JSON.parse(decodeURIComponent(hash.replace(/^#/, ""))) as Partial<BookmarkletPayload>;
    if (typeof p.u !== "string" || !/^https?:\/\//.test(p.u)) return null;
    return { u: p.u, t: String(p.t ?? ""), h: String(p.h ?? ""), x: String(p.x ?? "") };
  } catch {
    return null;
  }
}
