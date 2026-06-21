import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { versionApi } from '../api/client';
import { Platform } from 'react-native';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const CACHE_KEY = 'khaali_version_check';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type VersionStatus =
  | { status: 'loading' }
  | { status: 'ok' }
  | { status: 'soft_update'; latest: string; updateUrl: string; messageEn: string | null; messageHi: string | null }
  | { status: 'force_update'; messageEn: string | null; messageHi: string | null; updateUrl: string };

/**
 * Checks app version on launch.
 * - Cached for 24h so we don't block launch on every open.
 * - Fail-open: if the check fails, status becomes 'ok' — never block users due to network issues.
 */
export function useVersionCheck(): VersionStatus {
  const [status, setStatus] = useState<VersionStatus>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        // Try cached result first
        const cached = await SecureStore.getItemAsync(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < CACHE_TTL_MS) {
            if (!cancelled) setStatus(parsed.result);
            return;
          }
        }

        const platform = Platform.OS as 'ios' | 'android';
        const { data } = await versionApi.check(platform, APP_VERSION);

        let result: VersionStatus;

        if (data.force_update) {
          result = {
            status: 'force_update',
            messageEn: data.message_en,
            messageHi: data.message_hi,
            updateUrl: data.update_url ?? '',
          };
        } else if (
          data.latest_version &&
          data.latest_version !== APP_VERSION &&
          compareVersions(data.latest_version, APP_VERSION) > 0
        ) {
          result = {
            status: 'soft_update',
            latest: data.latest_version,
            updateUrl: data.update_url ?? '',
            messageEn: data.message_en,
            messageHi: data.message_hi,
          };
        } else {
          result = { status: 'ok' };
        }

        // Cache the result
        await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify({ ts: Date.now(), result }));

        if (!cancelled) setStatus(result);
      } catch {
        // Fail-open: version check failure never blocks app entry
        if (!cancelled) setStatus({ status: 'ok' });
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return status;
}

// Simple semver comparison — no dependency needed
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
