const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function decodeHtml(value: string) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function cleanText(value: string) {
  return decodeHtml(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function getMeta(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }

  return '';
}

function getTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) : '';
}

function getModelFromUrl(url: string) {
  const match = url.match(/\/(S-\d+)/i);
  return match ? match[1].toUpperCase() : '';
}

function absolutizeUrl(imageUrl: string, pageUrl: string) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('//')) return `https:${imageUrl}`;
  if (imageUrl.startsWith('http')) return imageUrl;

  try {
    return new URL(imageUrl, pageUrl).href;
  } catch {
    return imageUrl;
  }
}

function findImage(html: string, url: string) {
  const ogImage = getMeta(html, 'og:image');
  if (ogImage) return absolutizeUrl(ogImage, url);

  const twitterImage = getMeta(html, 'twitter:image');
  if (twitterImage) return absolutizeUrl(twitterImage, url);

  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imageMatch?.[1]) return absolutizeUrl(imageMatch[1], url);

  return '';
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml',
      },
    });

    const html = await response.text();

    let name = getMeta(html, 'og:title') || getTitle(html) || 'New Supply';
    name = name.replace(/\s*\|\s*.*$/g, '').trim();

    const description =
      getMeta(html, 'og:description') ||
      getMeta(html, 'description') ||
      '';

    return new Response(
      JSON.stringify({
        name,
        model_no: getModelFromUrl(url),
        description,
        image_url: findImage(html, url),
        product_url: url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});