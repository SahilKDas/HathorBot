import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import help from '../src/commands/help.js';
import { COMMAND_GUIDE } from '../src/data/commandGuide.js';

function embedCharacters(embed) {
  return (embed.title?.length ?? 0) + (embed.description?.length ?? 0) + (embed.footer?.text.length ?? 0)
    + (embed.fields ?? []).reduce((total, field) => total + field.name.length + field.value.length, 0);
}

test('every registered command and alias is documented in help and README', async () => {
  const commandDirectory = path.resolve('src', 'commands');
  const files = (await readdir(commandDirectory)).filter((file) => file.endsWith('.js'));
  const commands = await Promise.all(files.map(async (file) => (await import(pathToFileURL(path.join(commandDirectory, file)).href)).default));
  const guideByName = new Map(COMMAND_GUIDE.map((entry) => [entry.name, entry]));
  const registeredNames = commands.map((command) => command.data.name).sort();

  assert.deepEqual([...guideByName.keys()].sort(), registeredNames);
  for (const command of commands) {
    assert.deepEqual([...guideByName.get(command.data.name).aliases].sort(), [...(command.aliases ?? [])].sort(), `${command.data.name} aliases differ`);
  }

  const readme = await readFile(path.resolve('README.md'), 'utf8');
  for (const name of registeredNames) assert.ok(readme.includes(`### \`/${name}\``), `README is missing /${name}`);
});

test('complete help is thorough and stays within Discord message/embed limits', async () => {
  const replies = [];
  const context = {
    isInteraction: false,
    args: [],
    reply: async (payload) => { replies.push(payload); return payload; },
  };
  await help.execute(context, { config: { prefix: '!' } });
  assert.ok(replies.length >= 2, 'The full guide should paginate instead of exceeding Discord limits');

  const rendered = [];
  for (const reply of replies) {
    assert.ok(reply.embeds.length <= 10);
    const embeds = reply.embeds.map((embed) => embed.toJSON());
    assert.ok(embeds.reduce((total, embed) => total + embedCharacters(embed), 0) <= 6_000);
    for (const embed of embeds) {
      assert.ok((embed.description?.length ?? 0) <= 4_096);
      assert.ok((embed.fields?.length ?? 0) <= 25);
      for (const field of embed.fields ?? []) assert.ok(field.value.length <= 1_024, `${field.name} exceeds the field limit`);
      rendered.push(embed.title ?? '', embed.description ?? '', ...(embed.fields ?? []).flatMap((field) => [field.name, field.value]));
    }
  }
  const text = rendered.join('\n');
  for (const entry of COMMAND_GUIDE) {
    assert.match(text, new RegExp(`/${entry.name.replace('-', '\\-')}(?:\\s|$)`));
    for (const alias of entry.aliases) assert.ok(text.includes(`!${alias}`), `Full help is missing !${alias}`);
  }
});

test('focused help accepts case-insensitive aliases', async () => {
  let reply;
  await help.execute({
    isInteraction: false,
    args: ['GeAr'],
    reply: async (payload) => { reply = payload; return payload; },
  }, { config: { prefix: '!' } });
  const embed = reply.embeds[0].toJSON();
  assert.match(embed.title, /^\/equipment/);
  assert.match(embed.description, /shrimp_treat/);
  assert.match(embed.description, /250 creature XP/);
});
