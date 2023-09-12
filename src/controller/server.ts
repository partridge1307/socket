import { Prisma } from '@prisma/client';
import { EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';
import { Request, Response } from 'express';
import { JsonWebTokenError, verify } from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../lib/db';
import client from '../lib/discord';

const getServers = (req: Request, res: Response) => {
  const { userId } = req.params;

  const servers = client.guilds.cache.filter((guild) =>
    guild.members.cache.has(userId)
  );

  return res
    .status(200)
    .json(servers.map((server) => ({ id: server.id, name: server.name })));
};

const getAllChannelsCanSend = async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  const guild = client.guilds.cache.get(id);
  if (!guild) return res.status(404).send('Not found');

  const user = await guild.members.fetch(userId);

  let roles;
  if (user.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    roles = guild.roles.cache.filter((role) => role.mentionable);
  }

  const textChannelsCanSend = guild.channels.cache.filter((c) => {
    const botCanSendMessage = c
      .permissionsFor(c.client.user)
      ?.has(PermissionsBitField.Flags.SendMessages);

    const isManager = c
      .permissionsFor(user)
      .has(PermissionsBitField.Flags.ManageChannels);

    if (botCanSendMessage && isManager && c instanceof TextChannel) return true;
    else return false;
  });

  return res.json({
    channels: textChannelsCanSend.map((c) => ({ id: c.id, name: c.name })),
    roles: roles ? roles.map((role) => ({ id: role.id, name: role.name })) : [],
  });
};

const commitChannel = async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  const targetChannel = await client.channels.fetch(id);
  if (!targetChannel || !(targetChannel instanceof TextChannel))
    return res.status(404).send('Not found');

  const canSend = targetChannel
    .permissionsFor(targetChannel.client.user)
    ?.has(PermissionsBitField.Flags.SendMessages);
  const isManager = (await targetChannel.guild.members.fetch(userId))
    .permissionsIn(targetChannel)
    .has(PermissionsBitField.Flags.ManageChannels);

  if (!canSend || !isManager) return res.status(422).send('Invalid');

  const embed = new EmbedBuilder()
    .setAuthor({
      iconURL: client.user?.displayAvatarURL(),
      name: 'Moetruyen',
    })
    .setTitle('Thông báo Manga')
    .setDescription('Từ nay Mòe sẽ đặt kênh này làm kênh thông báo Manga');

  if (process.env.ENV === 'production') embed.setURL(process.env.URL);

  targetChannel.send({ embeds: [embed] });

  return res.send('OK');
};

const postChapterNotify = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');

  try {
    const decoded = verify(token, process.env.PUBLIC_KEY);

    const { id, channelId, roleId } = z
      .object({
        id: z.number(),
        channelId: z.string(),
        roleId: z.string().nullish().optional(),
      })
      .parse(decoded);

    const targetChapter = await db.chapter.findUniqueOrThrow({
      where: {
        id,
      },
      select: {
        manga: {
          select: {
            name: true,
            image: true,
            review: true,
            view: {
              select: {
                totalView: true,
              },
            },
            _count: {
              select: {
                mangaFollow: true,
              },
            },
          },
        },
        team: {
          select: {
            name: true,
          },
        },
        name: true,
        chapterIndex: true,
        volume: true,
      },
    });

    const embed = new EmbedBuilder()
      .setAuthor({
        iconURL: client.user?.displayAvatarURL(),
        name: 'Moetruyen',
      })
      .setTitle(targetChapter.manga.name)
      .setDescription(
        `Vol. ${targetChapter.volume} Ch.${targetChapter.chapterIndex}${
          targetChapter.name ? ` - ${targetChapter.name}` : ''
        } của \*\*${
          targetChapter.manga.name.charAt(0).toUpperCase() +
          targetChapter.manga.name.slice(1)
        }\*\* đã ra mắt`
      )
      .addFields([
        {
          name: 'Lượt xem',
          value: `${targetChapter.manga.view?.totalView ?? 0}`,
          inline: true,
        },
        {
          name: 'Theo dõi',
          value: `${targetChapter.manga._count.mangaFollow}`,
          inline: true,
        },
        { name: 'Team', value: `${targetChapter.team?.name ?? 'Không có'}` },
        {
          name: 'Review',
          value: targetChapter.manga.review ?? 'Không có review',
        },
      ])
      .setImage(targetChapter.manga.image);

    if (process.env.ENV === 'production')
      embed.setURL(`${process.env.URL}/chapter/${id}`);

    const targetChannel = (await client.channels.fetch(
      channelId
    )) as TextChannel;

    const content = !!roleId
      ? `${process.env.URL}/chapter/${id}\n<@&${roleId}>`
      : `${process.env.URL}/chapter/${id}`;

    await targetChannel.send({
      content,
      embeds: [embed],
    });

    return res.send('OK');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(404).send('Not found');
    }
    if (error instanceof z.ZodError) {
      return res.status(422).send('Invalid');
    }
    if (error instanceof JsonWebTokenError) {
      return res.status(401).send('Expired token');
    }
    return res.status(500).send('Something went wrong');
  }
};

export { commitChannel, getAllChannelsCanSend, postChapterNotify, getServers };
