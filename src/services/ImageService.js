import { AttachmentBuilder } from 'discord.js';

function valueAtPath(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}

function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(values[key] ?? ''));
}

export class ImageService {
  constructor(config) {
    this.config = config;
  }

  makePrompt(creature) {
    const forms = [creature.shiny && 'shiny iridescent mutation', creature.gigantamax && 'gigantic titan form'].filter(Boolean);
    return [
      `A highly detailed ${creature.rarity} ${creature.type}-type original flamingo creature named ${creature.species}`,
      forms.length ? forms.join(', ') : 'unique feather pattern and silhouette',
      creature.description,
      'full body, dramatic environment, collectible creature portrait, digital art, polished RPG bestiary style',
      'no words, no letters, no logo, no watermark, not a Pokemon',
    ].join(', ');
  }

  async generate(creature) {
    const prompt = this.makePrompt(creature);
    const seed = Number.parseInt(creature.id.replaceAll('-', '').slice(0, 8), 16) % 2_147_483_647;
    if (!this.config.endpoint || this.config.provider === 'disabled') return { prompt };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      if (this.config.provider === 'url-template') {
        const url = interpolate(this.config.endpoint, {
          prompt,
          seed,
          width: this.config.width,
          height: this.config.height,
        });
        const headers = {};
        if (this.config.apiKey) {
          headers[this.config.authHeader] = `${this.config.authPrefix} ${this.config.apiKey}`.trim();
        }
        const response = await fetch(url, { headers, signal: controller.signal });
        if (!response.ok) throw new Error(`Image API returned HTTP ${response.status}`);
        const contentType = response.headers.get('content-type') || 'image/png';
        if (!contentType.startsWith('image/')) throw new Error(`Expected image response, received ${contentType}`);
        const declaredSize = Number(response.headers.get('content-length')) || 0;
        if (declaredSize > 10 * 1024 * 1024) throw new Error('Generated image exceeds the 10 MB safety limit');
        const extension = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
        const name = `flamingo-${creature.id}.${extension}`;
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > 10 * 1024 * 1024) throw new Error('Generated image exceeds the 10 MB safety limit');
        return { prompt, attachment: new AttachmentBuilder(buffer, { name }), attachmentUrl: `attachment://${name}` };
      }

      const headers = { 'Content-Type': 'application/json' };
      if (this.config.apiKey) {
        headers[this.config.authHeader] = `${this.config.authPrefix} ${this.config.apiKey}`.trim();
      }
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          seed,
          width: this.config.width,
          height: this.config.height,
          size: `${this.config.width}x${this.config.height}`,
          response_format: 'url',
          n: 1,
        }),
      });
      if (!response.ok) throw new Error(`Image API returned HTTP ${response.status}: ${(await response.text()).slice(0, 250)}`);
      const payload = await response.json();
      const url = valueAtPath(payload, this.config.responsePath) ?? payload.url ?? payload.image_url;
      if (!url) throw new Error(`No image URL at response path "${this.config.responsePath}"`);
      return { prompt, url };
    } finally {
      clearTimeout(timeout);
    }
  }
}
