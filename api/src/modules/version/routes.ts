import { FastifyInstance } from 'fastify';
import { db } from '../../db/index';
import { appVersions } from '../../db/schema/sqlite';
import { eq } from 'drizzle-orm';
import semver from 'semver';

export async function versionRoutes(app: FastifyInstance) {
  /**
   * GET /app/version?platform=android&current_version=1.0.0
   * Checks if the client needs a forced or soft update.
   * Fail-open on DB error — never block users due to version check failure.
   */
  app.get('/version', async (request, reply) => {
    const { platform, current_version } = request.query as {
      platform?: string;
      current_version?: string;
    };

    if (!platform || !['ios', 'android'].includes(platform)) {
      return reply.code(400).send({ error: 'Invalid platform. Must be ios or android.' });
    }

    if (!current_version || !semver.valid(current_version)) {
      return reply.code(400).send({ error: 'Invalid current_version. Must be a valid semver string.' });
    }

    try {
      const record = await db.query.appVersions.findFirst({
        where: eq(appVersions.platform, platform as 'ios' | 'android'),
      });

      if (!record) {
        // No record found — fail open, proceed to app
        return reply.send({
          latest_version: current_version,
          min_supported_version: current_version,
          force_update: false,
          update_url: '',
          message_en: null,
          message_hi: null,
        });
      }

      const isForced = record.forceUpdate ||
        semver.lt(current_version, record.minSupportedVersion);

      return reply.send({
        latest_version: record.latestVersion,
        min_supported_version: record.minSupportedVersion,
        force_update: isForced,
        update_url: record.updateUrl,
        message_en: record.messageEn,
        message_hi: record.messageHi,
      });
    } catch (err) {
      // Fail open — version check failure must never block app entry
      app.log.error({ err: err as Error }, '[version] check failed, failing open');
      return reply.send({
        latest_version: current_version,
        min_supported_version: current_version,
        force_update: false,
        update_url: '',
        message_en: null,
        message_hi: null,
      });
    }
  });
}
