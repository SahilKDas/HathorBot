export class CommandContext {
  constructor(source, args = []) {
    this.source = source;
    this.args = args;
    this.isInteraction = typeof source.isChatInputCommand === 'function';
    this.user = this.isInteraction ? source.user : source.author;
    this.member = source.member;
    this.guild = source.guild;
    this.channel = source.channel;
    this.client = source.client;
  }

  get userId() { return this.user.id; }
  get guildId() { return this.guild?.id; }
  get channelId() { return this.channel?.id; }

  subcommand(fallback = null) {
    if (this.isInteraction) {
      try { return this.source.options.getSubcommand(false) ?? fallback; } catch { return fallback; }
    }
    return this.args[0]?.toLowerCase() ?? fallback;
  }

  string(name, position = 0, required = false) {
    if (this.isInteraction) return this.source.options.getString(name, required);
    return this.args[position] ?? null;
  }

  integer(name, position = 0) {
    if (this.isInteraction) return this.source.options.getInteger(name);
    const value = Number.parseInt(this.args[position] ?? '', 10);
    return Number.isFinite(value) ? value : null;
  }

  selectedUser(name, position = 0) {
    if (this.isInteraction) return this.source.options.getUser(name);
    const raw = this.args[position] ?? '';
    const id = raw.replace(/\D/g, '');
    return id ? this.client.users.cache.get(id) ?? { id, username: id } : null;
  }

  selectedChannel(name, position = 0) {
    if (this.isInteraction) return this.source.options.getChannel(name);
    const raw = this.args[position] ?? '';
    const id = raw.replace(/\D/g, '');
    return id ? this.client.channels.cache.get(id) ?? null : null;
  }

  async defer(ephemeral = false) {
    if (this.isInteraction && !this.source.deferred && !this.source.replied) {
      await this.source.deferReply({ ephemeral });
    }
  }

  async reply(payload) {
    const normalized = typeof payload === 'string' ? { content: payload } : payload;
    if (this.isInteraction) {
      if (this.source.deferred) {
        const { ephemeral: _ignored, ...editPayload } = normalized;
        return this.source.editReply(editPayload);
      }
      if (this.source.replied) return this.source.followUp(normalized);
      return this.source.reply(normalized);
    }
    const { ephemeral: _ignored, ...messagePayload } = normalized;
    return this.source.reply(messagePayload);
  }
}
